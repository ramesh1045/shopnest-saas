import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { StoreService } from '../../../core/services/store';
import { ProductService } from '../../../core/services/product';
import { CartService } from '../../../core/services/cart.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { StoreHeaderComponent } from '../../../shared/components/store-header/store-header';
import { CurrencyInrPipe } from '../../../shared/pipes/currency-inr.pipe';
import { Store as StoreModel } from '../../../core/models/store.model';
import { Product, Category } from '../../../core/models/product.model';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    StoreHeaderComponent,
    CurrencyInrPipe,
  ],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductListComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private storeService = inject(StoreService);
  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private auth = inject(AuthService);
  private notify = inject(NotificationService);

  store = signal<StoreModel | null>(null);
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // Filters
  searchTerm = signal('');
  selectedCategoryId = signal<number | null>(null);
  sortBy = signal<'newest' | 'price_asc' | 'price_desc'>('newest');

  // Pagination
  currentPage = signal(1);
  totalPages = signal(1);
  total = signal(0);
  pageSize = 12;

  readonly isLoggedIn = this.auth.isLoggedIn;

  private search$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.error.set('Store not found');
      this.loading.set(false);
      return;
    }

    // Handle query params
    this.route.queryParamMap.subscribe((params) => {
      const search = params.get('search');
      const category = params.get('category');
      if (search !== null) this.searchTerm.set(search);
      if (category !== null) this.selectedCategoryId.set(Number(category));
      this.loadProducts(slug);
    });

    // Debounced search
    this.search$
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((term) => {
        this.currentPage.set(1);
        this.updateUrl();
      });

    // Fetch store
    this.storeService.fetchStoreBySlug(slug).subscribe({
      next: () => this.store.set(this.storeService.currentStore()),
      error: () => {},
    });

    // Load categories (public — if logged in)
    if (this.isLoggedIn()) {
      this.productService.listCategories().subscribe({
        next: (res) => this.categories.set(res.data || []),
        error: () => {},
      });
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchInput(value: string) {
    this.searchTerm.set(value);
    this.search$.next(value);
  }

  onCategoryChange(categoryId: number | null) {
    this.selectedCategoryId.set(categoryId);
    this.currentPage.set(1);
    this.updateUrl();
  }

  onSortChange(sort: 'newest' | 'price_asc' | 'price_desc') {
    this.sortBy.set(sort);
    this.currentPage.set(1);
    this.loadProducts(this.store()?.slug || '');
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadProducts(this.store()?.slug || '');
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
    if (current > 3) pages.push(-1); // ellipsis

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (current < total - 2) pages.push(-2); // ellipsis
    pages.push(total);
    return pages;
  }

  private loadProducts(slug: string) {
    if (!slug) return;
    this.loading.set(true);

    this.productService
      .listPublicProducts(slug, {
        page: this.currentPage(),
        limit: this.pageSize,
        search: this.searchTerm() || undefined,
        categoryId: this.selectedCategoryId() || undefined,
        sort: this.sortBy(),
      })
      .subscribe({
        next: (res) => {
          this.products.set(res.data.items || []);
          this.totalPages.set(res.data.pagination?.totalPages || 1);
          this.total.set(res.data.pagination?.total || 0);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err.message || 'Failed to load products');
          this.loading.set(false);
        },
      });
  }

  private updateUrl() {
    const slug = this.store()?.slug;
    if (!slug) return;
    const queryParams: any = {};
    if (this.searchTerm()) queryParams.search = this.searchTerm();
    if (this.selectedCategoryId())
      queryParams.category = this.selectedCategoryId();

    this.router.navigate(['/store', slug, 'products'], { queryParams });
  }

  addToCart(product: Product, event: Event) {
    event.stopPropagation();
    event.preventDefault();

    if (!this.isLoggedIn()) {
      this.notify.warning('Please sign in to add items to cart');
      return;
    }

    if (product.stock_quantity === 0) {
      this.notify.error('Product is out of stock');
      return;
    }

    const slug = this.store()?.slug;
    if (!slug) return;

    this.cartService.addItem(slug, product.id, 1).subscribe({
      next: () => {
        this.notify.success(`${product.name} added to cart`);
      },
      error: (err) => {
        this.notify.error(err.message || 'Failed to add to cart');
      },
    });
  }

  clearFilters() {
    this.searchTerm.set('');
    this.selectedCategoryId.set(null);
    this.currentPage.set(1);
    this.updateUrl();
  }
}