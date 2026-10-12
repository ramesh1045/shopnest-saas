import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CurrencyInrPipe } from '../../../shared/pipes/currency-inr.pipe';
import { OrderSummary, OrderStatus } from '../../../core/models/order.model';

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyInrPipe],
  templateUrl: './my-orders.html',
  styleUrl: './my-orders.css',
})
export class MyOrdersComponent implements OnInit {
  private api = inject(ApiService);
  private notify = inject(NotificationService);

  loading = signal(true);
  orders = signal<OrderSummary[]>([]);
  filter = signal<string>('all');

  readonly statuses: OrderStatus[] = [
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
  ];

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.loading.set(true);
    this.api.get<any>('/orders/my').subscribe({
      next: (res) => {
        this.orders.set(res.data || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.notify.error(err.message || 'Failed to load orders');
      },
    });
  }

  getFilteredOrders(): OrderSummary[] {
    const f = this.filter();
    if (f === 'all') return this.orders();
    return this.orders().filter((o) => o.status === f);
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

  getStatusCount(status: string): number {
    return this.orders().filter((o) => o.status === status).length;
  }
}