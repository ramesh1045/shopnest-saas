import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    StoreHeaderComponent,
    CurrencyInrPipe,
  ],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private storeService = inject(StoreService);
  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private auth = inject(AuthService);
  private notify = inject(NotificationService);

  store = signal<StoreModel | null>(null);
  product = signal<Product | null>(null);
  quantity = signal(1);
  loading = signal(true);
  addingToCart = signal(false);
  error = signal<string | null>(null);

  readonly isLoggedIn = this.auth.isLoggedIn;

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug');
    const productId = this.route.snapshot.paramMap.get('id');

    if (!slug || !productId) {
      this.error.set('Product not found');
      this.loading.set(false);
      return;
    }

    // Fetch store
    this.storeService.fetchStoreBySlug(slug).subscribe({
      next: () => this.store.set(this.storeService.currentStore()),
      error: () => {},
    });

    // Fetch product
    this.productService
      .getPublicProduct(slug, Number(productId))
      .subscribe({
        next: (res) => {
          this.product.set(res.data);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err.message || 'Product not found');
          this.loading.set(false);
        },
      });
  }

  incrementQty() {
    const p = this.product();
    if (!p) return;
    if (this.quantity() < p.stock_quantity) {
      this.quantity.update((q) => q + 1);
    } else {
      this.notify.warning(`Only ${p.stock_quantity} items available`);
    }
  }

  decrementQty() {
    if (this.quantity() > 1) {
      this.quantity.update((q) => q - 1);
    }
  }

  onQuantityInput(value: string) {
    const n = Number(value);
    const p = this.product();
    if (!p) return;
    if (isNaN(n) || n < 1) {
      this.quantity.set(1);
    } else if (n > p.stock_quantity) {
      this.quantity.set(p.stock_quantity);
    } else {
      this.quantity.set(n);
    }
  }

  addToCart(buyNow = false) {
    if (!this.isLoggedIn()) {
      this.notify.warning('Please sign in to add items to cart');
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    const p = this.product();
    const slug = this.store()?.slug;
    if (!p || !slug) return;

    if (p.stock_quantity === 0) {
      this.notify.error('Product is out of stock');
      return;
    }

    this.addingToCart.set(true);

    this.cartService.addItem(slug, p.id, this.quantity()).subscribe({
      next: () => {
        this.addingToCart.set(false);
        this.notify.success(`${p.name} added to cart`);

        if (buyNow) {
          this.router.navigate(['/store', slug, 'cart']);
        }
      },
      error: (err) => {
        this.addingToCart.set(false);
        this.notify.error(err.message || 'Failed to add to cart');
      },
    });
  }

  getDiscountPercent(): number {
    const p = this.product();
    if (!p || !p.compare_price_inr || p.compare_price_inr <= p.price_inr) {
      return 0;
    }
    return Math.round(
      ((p.compare_price_inr - p.price_inr) / p.compare_price_inr) * 100
    );
  }
}