import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CurrencyInrPipe } from '../../../shared/pipes/currency-inr.pipe';
import { OrderSummary, OrderStatus } from '../../../core/models/order.model';

@Component({
  selector: 'app-order-manage',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CurrencyInrPipe],
  templateUrl: './order-manage.html',
  styleUrl: './order-manage.css',
})
export class OrderManage implements OnInit {
  private api = inject(ApiService);
  private notify = inject(NotificationService);

  loading = signal(true);
  orders = signal<OrderSummary[]>([]);
  updatingId = signal<number | null>(null);

  statusFilter = signal<string>('all');

  // Pagination
  currentPage = signal(1);
  totalPages = signal(1);
  total = signal(0);
  pageSize = 20;

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

    const params: any = {
      page: this.currentPage(),
      limit: this.pageSize,
    };
    if (this.statusFilter() !== 'all') {
      params.status = this.statusFilter();
    }

    this.api.get<any>('/orders', params).subscribe({
      next: (res) => {
        this.orders.set(res.data.items || []);
        this.totalPages.set(res.data.pagination?.totalPages || 1);
        this.total.set(res.data.pagination?.total || 0);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.notify.error(err.message || 'Failed to load orders');
      },
    });
  }

  onStatusFilterChange() {
    this.currentPage.set(1);
    this.loadOrders();
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadOrders();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getPages(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (current > 3) pages.push(-1);
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 2) pages.push(-2);
    pages.push(total);
    return pages;
  }

  quickUpdateStatus(order: OrderSummary, newStatus: OrderStatus) {
    if (order.status === newStatus) return;

    let confirmMessage = `Change status to ${newStatus}?`;
    if (newStatus === 'CANCELLED') {
      confirmMessage =
        'Cancel this order? Stock will be restored automatically.';
    }

    if (!confirm(confirmMessage)) return;

    this.updatingId.set(order.id);

    this.api
      .patch(`/orders/${order.id}/status`, { status: newStatus })
      .subscribe({
        next: () => {
          this.updatingId.set(null);
          this.notify.success(`Order ${newStatus.toLowerCase()}`);
          this.loadOrders();
        },
        error: (err) => {
          this.updatingId.set(null);
          this.notify.error(err.message || 'Failed to update');
        },
      });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING': return 'badge-pending';
      case 'CONFIRMED': return 'badge-confirmed';
      case 'PROCESSING': return 'badge-processing';
      case 'SHIPPED': return 'badge-shipped';
      case 'DELIVERED': return 'badge-delivered';
      case 'CANCELLED': return 'badge-cancelled';
      default: return 'badge-default';
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

  getNextStatus(status: OrderStatus): OrderStatus | null {
    switch (status) {
      case 'PENDING': return 'CONFIRMED';
      case 'CONFIRMED': return 'PROCESSING';
      case 'PROCESSING': return 'SHIPPED';
      case 'SHIPPED': return 'DELIVERED';
      default: return null;
    }
  }

  canCancel(status: OrderStatus): boolean {
    return status !== 'CANCELLED' && status !== 'DELIVERED';
  }
}