import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../../core/services/product';
import { NotificationService } from '../../../core/services/notification.service';
import { CurrencyInrPipe } from '../../../shared/pipes/currency-inr.pipe';
import { Product, Category } from '../../../core/models/product.model';

@Component({
  selector: 'app-product-manage',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CurrencyInrPipe],
  templateUrl: './product-manage.html',
  styleUrl: './product-manage.css',
})
export class ProductManage implements OnInit {
  private productService = inject(ProductService);
  private notify = inject(NotificationService);

  loading = signal(true);
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);

  // Filters
  searchTerm = signal('');
  selectedCategory = signal<number | null>(null);
  statusFilter = signal<string>('all'); // all | active | inactive

  // Pagination
  currentPage = signal(1);
  totalPages = signal(1);
  total = signal(0);
  pageSize = 20;

  ngOnInit() {
    this.loadCategories();
    this.loadProducts();
  }

  private loadCategories() {
    this.productService.listCategories().subscribe({
      next: (res) => this.categories.set(res.data || []),
      error: () => {},
    });
  }

  loadProducts() {
    this.loading.set(true);

    let isActive: boolean | undefined = undefined;
    if (this.statusFilter() === 'active') isActive = true;
    if (this.statusFilter() === 'inactive') isActive = false;

    this.productService
      .listStoreProducts({
        page: this.currentPage(),
        limit: this.pageSize,
        search: this.searchTerm() || undefined,
        categoryId: this.selectedCategory() || undefined,
        isActive,
      })
      .subscribe({
        next: (res) => {
          this.products.set(res.data.items || []);
          this.totalPages.set(res.data.pagination?.totalPages || 1);
          this.total.set(res.data.pagination?.total || 0);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.notify.error(err.message || 'Failed to load products');
        },
      });
  }

  onSearchChange(value: string) {
    this.searchTerm.set(value);
    this.currentPage.set(1);
    // Simple debounce
    setTimeout(() => this.loadProducts(), 400);
  }

  onCategoryChange() {
    this.currentPage.set(1);
    this.loadProducts();
  }

  onStatusChange() {
    this.currentPage.set(1);
    this.loadProducts();
  }

  clearFilters() {
    this.searchTerm.set('');
    this.selectedCategory.set(null);
    this.statusFilter.set('all');
    this.currentPage.set(1);
    this.loadProducts();
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadProducts();
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

  deleteProduct(product: Product) {
    if (
      !confirm(
        `Delete "${product.name}"?\n\nThis cannot be undone.`
      )
    ) {
      return;
    }

    this.productService.deleteProduct(product.id).subscribe({
      next: () => {
        this.notify.success('Product deleted');
        this.loadProducts();
      },
      error: (err) => {
        this.notify.error(err.message || 'Failed to delete');
      },
    });
  }

  toggleActive(product: Product) {
    const newState = !product.is_active;
    this.productService
      .updateProduct(product.id, { is_active: newState as any })
      .subscribe({
        next: () => {
          this.notify.success(
            newState ? 'Product activated' : 'Product deactivated'
          );
          this.loadProducts();
        },
        error: (err) => {
          this.notify.error(err.message || 'Failed to update');
        },
      });
  }

  hasFilters(): boolean {
    return (
      !!this.searchTerm() ||
      this.selectedCategory() !== null ||
      this.statusFilter() !== 'all'
    );
  }
}