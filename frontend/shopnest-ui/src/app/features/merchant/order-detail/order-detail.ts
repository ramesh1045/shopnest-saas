import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CurrencyInrPipe } from '../../../shared/pipes/currency-inr.pipe';
import { Order, OrderStatus } from '../../../core/models/order.model';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CurrencyInrPipe],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.css',
})
export class OrderDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  private notify = inject(NotificationService);

  loading = signal(true);
  order = signal<Order | null>(null);
  updating = signal(false);
  error = signal<string | null>(null);

  readonly statuses: OrderStatus[] = [
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
  ];

  selectedStatus = signal<OrderStatus>('PENDING');

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
    this.api.get<Order>(`/orders/${id}`).subscribe({
      next: (res) => {
        this.order.set(res.data);
        this.selectedStatus.set(res.data.status);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to load order');
        this.loading.set(false);
      },
    });
  }

  updateStatus() {
    const order = this.order();
    if (!order) return;

    const newStatus = this.selectedStatus();
    if (newStatus === order.status) return;

    let confirmMessage = `Change order status to ${newStatus}?`;
    if (newStatus === 'CANCELLED') {
      confirmMessage =
        'Cancel this order? Stock will be restored automatically.';
    }

    if (!confirm(confirmMessage)) {
      // Revert dropdown
      this.selectedStatus.set(order.status);
      return;
    }

    this.updating.set(true);

    this.api
      .patch(`/orders/${order.id}/status`, { status: newStatus })
      .subscribe({
        next: () => {
          this.updating.set(false);
          this.notify.success(`Order ${newStatus.toLowerCase()}`);
          this.loadOrder(order.id);
        },
        error: (err) => {
          this.updating.set(false);
          this.notify.error(err.message || 'Failed to update');
          this.selectedStatus.set(order.status);
        },
      });
  }

  cancelOrder() {
    this.selectedStatus.set('CANCELLED');
    this.updateStatus();
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

  // Status timeline helper
  isCompleted(step: OrderStatus): boolean {
    const order = this.order();
    if (!order) return false;
    if (order.status === 'CANCELLED') return step === 'CANCELLED';

    const flow: OrderStatus[] = [
      'PENDING',
      'CONFIRMED',
      'PROCESSING',
      'SHIPPED',
      'DELIVERED',
    ];
    const currentIdx = flow.indexOf(order.status);
    const stepIdx = flow.indexOf(step);
    return stepIdx <= currentIdx;
  }

  canCancel(): boolean {
    const s = this.order()?.status;
    return s !== 'CANCELLED' && s !== 'DELIVERED';
  }
}