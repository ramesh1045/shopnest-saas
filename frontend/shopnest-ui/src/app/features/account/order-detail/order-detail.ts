import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CurrencyInrPipe } from '../../../shared/pipes/currency-inr.pipe';
import { Order, OrderStatus } from '../../../core/models/order.model';

@Component({
  selector: 'app-account-order-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyInrPipe],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.css',
})
export class OrderDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private notify = inject(NotificationService);

  loading = signal(true);
  order = signal<Order | null>(null);
  error = signal<string | null>(null);

  readonly flow: OrderStatus[] = [
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
  ];

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Order not found');
      this.loading.set(false);
      return;
    }
    this.loadOrder(Number(id));
  }

  loadOrder(id: number) {
    this.loading.set(true);
    this.api.get<Order>(`/orders/my/${id}`).subscribe({
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
      case 'PENDING': return 'status-pending';
      case 'CONFIRMED': return 'status-confirmed';
      case 'PROCESSING': return 'status-processing';
      case 'SHIPPED': return 'status-shipped';
      case 'DELIVERED': return 'status-delivered';
      case 'CANCELLED': return 'status-cancelled';
      default: return 'status-default';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'PENDING': return 'bi-hourglass-split';
      case 'CONFIRMED': return 'bi-check-circle';
      case 'PROCESSING': return 'bi-gear';
      case 'SHIPPED': return 'bi-truck';
      case 'DELIVERED': return 'bi-check-circle-fill';
      case 'CANCELLED': return 'bi-x-circle';
      default: return 'bi-circle';
    }
  }

  isCompleted(step: OrderStatus): boolean {
    const order = this.order();
    if (!order) return false;
    if (order.status === 'CANCELLED') return false;
    const currentIdx = this.flow.indexOf(order.status);
    const stepIdx = this.flow.indexOf(step);
    return stepIdx <= currentIdx;
  }

  isCurrent(step: OrderStatus): boolean {
    return this.order()?.status === step;
  }

  getStatusMessage(): string {
    const s = this.order()?.status;
    switch (s) {
      case 'PENDING':
        return 'Your order has been placed and is awaiting confirmation.';
      case 'CONFIRMED':
        return 'Your order has been confirmed by the store.';
      case 'PROCESSING':
        return 'Your order is being prepared for shipping.';
      case 'SHIPPED':
        return 'Your order is on the way.';
      case 'DELIVERED':
        return 'Your order has been delivered. Enjoy!';
      case 'CANCELLED':
        return 'This order has been cancelled.';
      default:
        return '';
    }
  }
}