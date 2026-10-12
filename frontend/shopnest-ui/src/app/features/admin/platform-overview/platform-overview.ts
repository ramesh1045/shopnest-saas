import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CurrencyInrPipe } from '../../../shared/pipes/currency-inr.pipe';

interface PlatformStats {
  stores: {
    total: number;
    active: number;
    suspended: number;
    pending: number;
  };
  users: {
    total: number;
    admins: number;
    owners: number;
    customers: number;
  };
  subscriptions: {
    total_active: number;
    starter: number;
    growth: number;
    pro: number;
  };
  revenue: {
    mrr_inr: number;
    total_order_volume_inr: number;
    total_orders: number;
  };
}

interface RecentOrder {
  id: number;
  order_number: string;
  status: string;
  total_inr: number;
  created_at: string;
  payment_method: string;
  store_name: string;
  store_slug: string;
}

@Component({
  selector: 'app-platform-overview',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyInrPipe],
  templateUrl: './platform-overview.html',
  styleUrl: './platform-overview.css',
})
export class PlatformOverviewComponent implements OnInit {
  private api = inject(ApiService);
  private notify = inject(NotificationService);

  loading = signal(true);
  stats = signal<PlatformStats | null>(null);
  recentOrders = signal<RecentOrder[]>([]);

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.loading.set(true);

    forkJoin({
      stats: this.api.get<PlatformStats>('/admin/dashboard'),
      orders: this.api.get<RecentOrder[]>('/admin/recent-orders'),
    }).subscribe({
      next: ({ stats, orders }) => {
        this.stats.set(stats.data);
        this.recentOrders.set(orders.data || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.notify.error(err.message || 'Failed to load dashboard');
      },
    });
  }

  getTotalPlanCount(): number {
    const s = this.stats();
    if (!s) return 0;
    return s.subscriptions.starter + s.subscriptions.growth + s.subscriptions.pro;
  }

  getPlanPercent(count: number): number {
    const total = this.getTotalPlanCount();
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
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
}