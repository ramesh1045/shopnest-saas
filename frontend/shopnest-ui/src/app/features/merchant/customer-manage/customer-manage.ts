import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CurrencyInrPipe } from '../../../shared/pipes/currency-inr.pipe';

interface Customer {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  total_orders: number;
  total_spent_inr: number;
  created_at: string;
}

@Component({
  selector: 'app-customer-manage',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CurrencyInrPipe],
  templateUrl: './customer-manage.html',
  styleUrl: './customer-manage.css',
})
export class CustomerManage implements OnInit {
  private api = inject(ApiService);
  private notify = inject(NotificationService);

  loading = signal(true);
  customers = signal<Customer[]>([]);
  searchTerm = signal('');

  // Pagination
  currentPage = signal(1);
  totalPages = signal(1);
  total = signal(0);
  pageSize = 20;

  // Stats
  totalSpent = signal(0);
  topCustomer = signal<Customer | null>(null);

  ngOnInit() {
    this.loadCustomers();
  }

  loadCustomers() {
    this.loading.set(true);

    this.api
      .get<any>('/customers', {
        page: this.currentPage(),
        limit: this.pageSize,
        search: this.searchTerm() || undefined,
      })
      .subscribe({
        next: (res) => {
          const items = res.data.items || [];
          this.customers.set(items);
          this.totalPages.set(res.data.pagination?.totalPages || 1);
          this.total.set(res.data.pagination?.total || 0);

          // Calculate stats from current page
          let spent = 0;
          let top: Customer | null = null;
          for (const c of items) {
            spent += Number(c.total_spent_inr || 0);
            if (!top || Number(c.total_spent_inr) > Number(top.total_spent_inr)) {
              top = c;
            }
          }
          this.totalSpent.set(spent);
          this.topCustomer.set(top);

          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.notify.error(err.message || 'Failed to load customers');
        },
      });
  }

  onSearchChange(value: string) {
    this.searchTerm.set(value);
    this.currentPage.set(1);
    setTimeout(() => this.loadCustomers(), 400);
  }

  clearSearch() {
    this.searchTerm.set('');
    this.currentPage.set(1);
    this.loadCustomers();
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadCustomers();
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

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  getAvatarColor(name: string): string {
    const colors = [
      'linear-gradient(135deg, #ff6b00, #ff9147)',
      'linear-gradient(135deg, #3b82f6, #60a5fa)',
      'linear-gradient(135deg, #10b981, #34d399)',
      'linear-gradient(135deg, #8b5cf6, #a78bfa)',
      'linear-gradient(135deg, #ec4899, #f472b6)',
      'linear-gradient(135deg, #f59e0b, #fbbf24)',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }
}