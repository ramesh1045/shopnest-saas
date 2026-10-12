import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductService } from '../../../core/services/product';
import { NotificationService } from '../../../core/services/notification.service';
import { CurrencyInrPipe } from '../../../shared/pipes/currency-inr.pipe';
import { Category } from '../../../core/models/product.model';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    CurrencyInrPipe,
  ],
  templateUrl: './product-form.html',
  styleUrl: './product-form.css',
})
export class ProductFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);
  private notify = inject(NotificationService);

  mode = signal<'create' | 'edit'>('create');
  productId = signal<number | null>(null);
  loading = signal(false);
  saving = signal(false);
  categories = signal<Category[]>([]);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    sku: [''],
    price_inr: [null as number | null, [Validators.required, Validators.min(1)]],
    compare_price_inr: [null as number | null],
    stock_quantity: [0, [Validators.required, Validators.min(0)]],
    category_id: [null as number | null],
    image_url: [''],
    is_active: [true],
  });

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'new') {
      this.mode.set('edit');
      this.productId.set(Number(idParam));
      this.loadProduct();
    } else {
      this.mode.set('create');
    }

    this.loadCategories();
  }

  private loadCategories() {
    this.productService.listCategories().subscribe({
      next: (res) => this.categories.set(res.data || []),
      error: () => {},
    });
  }

  private loadProduct() {
    const id = this.productId();
    if (!id) return;

    this.loading.set(true);
    this.productService.getPublicProduct('', id).subscribe({
      // Fallback: use list endpoint if specific endpoint not available
      next: (res) => {
        this.patchForm(res.data);
        this.loading.set(false);
      },
      error: () => {
        // Try alternate: fetch from list
        this.productService.listStoreProducts({ page: 1, limit: 100 }).subscribe({
          next: (res) => {
            const found = res.data.items.find((p: any) => p.id === id);
            if (found) this.patchForm(found);
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      },
    });
  }

  private patchForm(p: any) {
    this.form.patchValue({
      name: p.name || '',
      description: p.description || '',
      sku: p.sku || '',
      price_inr: p.price_inr ?? null,
      compare_price_inr: p.compare_price_inr ?? null,
      stock_quantity: p.stock_quantity ?? 0,
      category_id: p.category_id ?? null,
      image_url: p.image_url || '',
      is_active: !!p.is_active,
    });
  }

  get name() { return this.form.get('name')!; }
  get price_inr() { return this.form.get('price_inr')!; }
  get stock_quantity() { return this.form.get('stock_quantity')!; }

  hasError(control: string, error: string): boolean {
    const c = this.form.get(control);
    return !!c && c.hasError(error) && c.touched;
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.warning('Please fix the errors below');
      return;
    }

    this.saving.set(true);
    const payload = this.buildPayload();

    if (this.mode() === 'create') {
      this.productService.createProduct(payload as any).subscribe({
        next: () => {
          this.saving.set(false);
          this.notify.success('Product created successfully');
          this.router.navigate(['/merchant/products']);
        },
        error: (err) => {
          this.saving.set(false);
          this.notify.error(err.message || 'Failed to create product');
        },
      });
    } else {
      const id = this.productId()!;
      this.productService.updateProduct(id, payload as any).subscribe({
        next: () => {
          this.saving.set(false);
          this.notify.success('Product updated successfully');
          this.router.navigate(['/merchant/products']);
        },
        error: (err) => {
          this.saving.set(false);
          this.notify.error(err.message || 'Failed to update product');
        },
      });
    }
  }

  private buildPayload() {
    const v = this.form.value;
    return {
      name: v.name!,
      description: v.description || undefined,
      sku: v.sku || undefined,
      price_inr: Number(v.price_inr),
      compare_price_inr: v.compare_price_inr
        ? Number(v.compare_price_inr)
        : undefined,
      stock_quantity: Number(v.stock_quantity ?? 0),
      category_id: v.category_id || null,
      image_url: v.image_url || undefined,
      is_active: !!v.is_active,
    };
  }

  cancel() {
    this.router.navigate(['/merchant/products']);
  }

  get pageTitle(): string {
    return this.mode() === 'create' ? 'Add Product' : 'Edit Product';
  }

  get pageSubtitle(): string {
    return this.mode() === 'create'
      ? 'Create a new product listing'
      : 'Update product details';
  }
}