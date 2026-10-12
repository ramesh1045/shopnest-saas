import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StoreService } from '../../../core/services/store';
import { ProductService } from '../../../core/services/product';
import { CartService } from '../../../core/services/cart.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { StoreHeaderComponent } from '../../../shared/components/store-header/store-header';
import { CurrencyInrPipe } from '../../../shared/pipes/currency-inr.pipe';
import { Store as StoreModel } from '../../../core/models/store.model';
import { Product } from '../../../core/models/product.model';

@Component({
  selector: 'app-store-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    StoreHeaderComponent,
    CurrencyInrPipe,
  ],
  templateUrl: './store-home.html',
  styleUrl: './store-home.css',
})
export class StoreHomeComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private storeService = inject(StoreService);
  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private auth = inject(AuthService);
  private notify = inject(NotificationService);

  store = signal<StoreModel | null>(null);
  products = signal<Product[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  readonly isLoggedIn = this.auth.isLoggedIn;

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.error.set('Store not found');
      this.loading.set(false);
      return;
    }

    this.storeService.fetchStoreBySlug(slug).subscribe({
      next: () => {
        this.store.set(this.storeService.currentStore());
        this.loadFeaturedProducts(slug);
      },
      error: (err) => {
        this.error.set(err.message || 'Store not found');
        this.loading.set(false);
      },
    });

    if (this.isLoggedIn()) {
      this.cartService.loadCart(slug);
    }
  }

  private loadFeaturedProducts(slug: string) {
    this.productService
      .listPublicProducts(slug, { page: 1, limit: 8 })
      .subscribe({
        next: (res) => {
          this.products.set(res.data.items || []);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  addToCart(product: Product, event: Event) {
    event.stopPropagation();
    event.preventDefault();

    if (!this.isLoggedIn()) {
      this.notify.warning('Please sign in to add items to cart');
      return;
    }

    const slug = this.store()?.slug;
    if (!slug) return;

    this.cartService.addItem(slug, product.id, 1).subscribe({
      next: () => {
        this.notify.success(`${product.name} added to cart`);
      },
      error: (err) => {
        this.notify.error(err.message || 'Failed to add to cart');
      },
    });
  }
}