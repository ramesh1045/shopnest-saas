import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StoreService } from '../../../core/services/store';
import { ApiService } from '../../../core/services/api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { StoreHeaderComponent } from '../../../shared/components/store-header/store-header';
import { CurrencyInrPipe } from '../../../shared/pipes/currency-inr.pipe';
import { Store as StoreModel } from '../../../core/models/store.model';
import { Order } from '../../../core/models/order.model';

@Component({
  selector: 'app-order-confirm',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    StoreHeaderComponent,
    CurrencyInrPipe,
  ],
  templateUrl: './order-confirm.html',
  styleUrl: './order-confirm.css',
})
export class OrderConfirmComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private storeService = inject(StoreService);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private notify = inject(NotificationService);

  store = signal<StoreModel | null>(null);
  order = signal<Order | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  readonly isLoggedIn = this.auth.isLoggedIn;

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug');
    const orderId = this.route.snapshot.paramMap.get('id');

    if (!slug || !orderId) {
      this.error.set('Order not found');
      this.loading.set(false);
      return;
    }

    // Must be logged in
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

    // Fetch order
    this.api.get<Order>(`/orders/my/${orderId}`).subscribe({
      next: (res) => {
        this.order.set(res.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to load order');
        this.loading.set(false);
      },
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'status-pending';
      case 'CONFIRMED':
        return 'status-confirmed';
      case 'PROCESSING':
        return 'status-processing';
      case 'SHIPPED':
        return 'status-shipped';
      case 'DELIVERED':
        return 'status-delivered';
      case 'CANCELLED':
        return 'status-cancelled';
      default:
        return 'status-default';
    }
  }

  goToOrders() {
    this.router.navigate(['/account/orders']);
  }

  continueShopping() {
    const slug = this.store()?.slug;
    if (!slug) return;
    this.router.navigate(['/store', slug, 'products']);
  }
}