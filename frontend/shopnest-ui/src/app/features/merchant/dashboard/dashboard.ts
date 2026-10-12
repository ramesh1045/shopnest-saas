import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { StoreService } from '../../../core/services/store';
import { ProductService } from '../../../core/services/product';
import { CurrencyInrPipe } from '../../../shared/pipes/currency-inr.pipe';
import { OrderSummary } from '../../../core/models/order.model';
import { Product } from '../../../core/models/product.model';

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalCustomers: number;
  pendingOrders: number;
  lowStockProducts: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyInrPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private api = inject(ApiService);
  private storeService = inject(StoreService);
  private productService = inject(ProductService);

  loading = signal(true);
  stats = signal<DashboardStats>({
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    totalCustomers: 0,
    pendingOrders: 0,
    lowStockProducts: 0,
  });
  recentOrders = signal<OrderSummary[]>([]);
  lowStockItems = signal<Product[]>([]);

  readonly store = this.storeService.currentStore;

  ngOnInit() {
    this.loadDashboard();
  }

  private loadDashboard() {
    this.loading.set(true);

    forkJoin({
      orders: this.api.get<any>('/orders', { limit: 5 }),
      products: this.api.get<any>('/products', { limit: 100 }),
      customers: this.api.get<any>('/customers', { limit: 1 }),
    }).subscribe({
      next: ({ orders, products, customers }) => {
        const orderItems: OrderSummary[] = orders.data?.items || [];
        const productItems: Product[] = products.data?.items || [];
        const customerTotal = customers.data?.pagination?.total || 0;
        const orderTotal = orders.data?.pagination?.total || 0;

        // Calculate revenue from orders (excluding cancelled)
        let revenue = 0;
        for (const o of orderItems) {
          if (o.status !== 'CANCELLED') {
            revenue += Number(o.total_inr || 0);
          }
        }

        // Pending orders
        const pending = orderItems.filter((o) => o.status === 'PENDING').length;

        // Low stock (≤ 5)
        const lowStock = productItems.filter(
          (p) => p.stock_quantity <= 5 && p.is_active
        );

        this.stats.set({
          totalOrders: orderTotal,
          totalRevenue: revenue,
          totalProducts: products.data?.pagination?.total || 0,
          totalCustomers: customerTotal,
          pendingOrders: pending,
          lowStockProducts: lowStock.length,
        });

        this.recentOrders.set(orderItems.slice(0, 5));
        this.lowStockItems.set(lowStock.slice(0, 5));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING': return 'badge-soft-warning';
      case 'CONFIRMED': return 'badge-soft-info';
      case 'PROCESSING': return 'badge-soft-info';
      case 'SHIPPED': return 'badge-soft-info';
      case 'DELIVERED': return 'badge-soft-success';
      case 'CANCELLED': return 'badge-soft-danger';
      default: return 'badge-soft-muted';
    }
  }
}