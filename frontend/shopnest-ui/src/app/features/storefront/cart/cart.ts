import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StoreService } from '../../../core/services/store';
import { CartService } from '../../../core/services/cart.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { StoreHeaderComponent } from '../../../shared/components/store-header/store-header';
import { CurrencyInrPipe } from '../../../shared/pipes/currency-inr.pipe';
import { Store as StoreModel } from '../../../core/models/store.model';
import { CartItem } from '../../../core/models/cart.model';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    StoreHeaderComponent,
    CurrencyInrPipe,
  ],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class CartComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private storeService = inject(StoreService);
  private cartService = inject(CartService);
  private auth = inject(AuthService);
  private notify = inject(NotificationService);

  store = signal<StoreModel | null>(null);
  loading = signal(true);
  updatingId = signal<number | null>(null);

  readonly cart = this.cartService.cart;
  readonly itemCount = this.cartService.itemCount;
  readonly subtotal = this.cartService.subtotal;
  readonly isLoggedIn = this.auth.isLoggedIn;

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) return;

    // Redirect if not logged in
    if (!this.isLoggedIn()) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    // Fetch store
    this.storeService.fetchStoreBySlug(slug).subscribe({
      next: () => this.store.set(this.storeService.currentStore()),
      error: () => {},
    });

    // Load cart
    this.cartService.loadCart(slug);
    setTimeout(() => this.loading.set(false), 300);
  }

  updateQuantity(item: CartItem, newQty: number) {
    const slug = this.store()?.slug;
    if (!slug) return;

    if (newQty < 1) return;
    if (newQty > item.stock_quantity) {
      this.notify.warning(`Only ${item.stock_quantity} items available`);
      return;
    }

    this.updatingId.set(item.id);

    this.cartService.updateItem(slug, item.id, newQty).subscribe({
      next: () => this.updatingId.set(null),
      error: (err) => {
        this.updatingId.set(null);
        this.notify.error(err.message || 'Failed to update');
      },
    });
  }

  increment(item: CartItem) {
    this.updateQuantity(item, item.quantity + 1);
  }

  decrement(item: CartItem) {
    if (item.quantity > 1) {
      this.updateQuantity(item, item.quantity - 1);
    }
  }

  removeItem(item: CartItem) {
    const slug = this.store()?.slug;
    if (!slug) return;

    if (!confirm(`Remove "${item.name}" from cart?`)) return;

    this.updatingId.set(item.id);

    this.cartService.removeItem(slug, item.id).subscribe({
      next: () => {
        this.updatingId.set(null);
        this.notify.success('Item removed');
      },
      error: (err) => {
        this.updatingId.set(null);
        this.notify.error(err.message || 'Failed to remove');
      },
    });
  }

  goToCheckout() {
    const slug = this.store()?.slug;
    if (!slug) return;
    this.router.navigate(['/store', slug, 'checkout']);
  }

  continueShopping() {
    const slug = this.store()?.slug;
    if (!slug) return;
    this.router.navigate(['/store', slug, 'products']);
  }
}