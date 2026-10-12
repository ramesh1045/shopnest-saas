import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CurrencyInrPipe } from '../../../shared/pipes/currency-inr.pipe';

interface PlatformStore {
  id: number;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  created_at: string;
  owner_email: string;
  owner_name: string;
  product_count: number;
  order_count: number;
  revenue_inr: number;
  plan_code: string | null;
}

@Component({
  selector: 'app-stores-manage',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyInrPipe],
  templateUrl: './stores-manage.html',
  styleUrl: './stores-manage.css',
})
export class StoresManage implements OnInit {
  private api = inject(ApiService);
  private notify = inject(NotificationService);

  loading = signal(true);
  stores = signal<PlatformStore[]>([]);
  updatingId = signal<number | null>(null);

  searchTerm = signal('');
  statusFilter = signal<string>('all');

  currentPage = signal(1);
  totalPages = signal(1);
  total = signal(0);
  pageSize = 20;

  ngOnInit() {
    this.loadStores();
  }

  loadStores() {
    this.loading.set(true);

    const params: any = {
      page: this.currentPage(),
      limit: this.pageSize,
    };
    if (this.searchTerm()) params.search = this.searchTerm();
    if (this.statusFilter() !== 'all') params.status = this.statusFilter();

    this.api.get<any>('/admin/stores', params).subscribe({
      next: (res) => {
        this.stores.set(res.data.items || []);
        this.totalPages.set(res.data.pagination?.totalPages || 1);
        this.total.set(res.data.pagination?.total || 0);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.notify.error(err.message || 'Failed to load stores');
      },
    });
  }

  onSearchChange(value: string) {
    this.searchTerm.set(value);
    this.currentPage.set(1);
    setTimeout(() => this.loadStores(), 400);
  }

  onStatusChange() {
    this.currentPage.set(1);
    this.loadStores();
  }

  clearFilters() {
    this.searchTerm.set('');
    this.statusFilter.set('all');
    this.currentPage.set(1);
    this.loadStores();
  }

  hasFilters(): boolean {
    return !!this.searchTerm() || this.statusFilter() !== 'all';
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadStores();
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

  toggleStatus(store: PlatformStore) {
    const newStatus = store.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';

    let confirmMessage = '';
    if (newStatus === 'SUSPENDED') {
      confirmMessage = `Suspend "${store.name}"?\n\nCustomers will not be able to browse or order from this store.`;
    } else {
      confirmMessage = `Activate "${store.name}"?\n\nStore will be visible to customers again.`;
    }

    if (!confirm(confirmMessage)) return;

    this.updatingId.set(store.id);

    this.api
      .patch(`/admin/stores/${store.id}/status`, { status: newStatus })
      .subscribe({
        next: () => {
          this.updatingId.set(null);
          this.notify.success(`Store ${newStatus.toLowerCase()}`);
          this.loadStores();
        },
        error: (err) => {
          this.updatingId.set(null);
          this.notify.error(err.message || 'Failed to update');
        },
      });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'badge-active';
      case 'SUSPENDED': return 'badge-suspended';
      case 'PENDING': return 'badge-pending';
      default: return 'badge-default';
    }
  }

  getStoreInitial(name: string): string {
    return (name || 'S').charAt(0).toUpperCase();
  }

  getPlanClass(planCode: string | null): string {
    switch (planCode) {
      case 'STARTER': return 'plan-starter';
      case 'GROWTH': return 'plan-growth';
      case 'PRO': return 'plan-pro';
      default: return 'plan-none';
    }
  }
}