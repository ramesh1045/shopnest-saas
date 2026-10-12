import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import {
  Product,
  Category,
  CreateProductRequest,
  ProductListParams,
} from '../models/product.model';
import { PaginatedResponse } from '../models/api.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private api = inject(ApiService);

  private productsSignal = signal<Product[]>([]);
  private loadingSignal = signal(false);

  readonly products = this.productsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();

  // ============ PUBLIC STOREFRONT ============

  listPublicProducts(
    storeSlug: string,
    params?: ProductListParams
  ): Observable<any> {
    this.loadingSignal.set(true);
    return this.api
      .get<PaginatedResponse<Product>>(
        `/public/${storeSlug}/products`,
        params
      )
      .pipe(
        tap({
          next: (res) => {
            this.productsSignal.set(res.data.items);
            this.loadingSignal.set(false);
          },
          error: () => this.loadingSignal.set(false),
        })
      );
  }

  getPublicProduct(
    storeSlug: string,
    productId: number
  ): Observable<any> {
    return this.api.get<Product>(
      `/public/${storeSlug}/products/${productId}`
    );
  }

  // ============ MERCHANT ============

  listStoreProducts(params?: ProductListParams): Observable<any> {
    this.loadingSignal.set(true);
    return this.api
      .get<PaginatedResponse<Product>>('/products', params)
      .pipe(
        tap({
          next: (res) => {
            this.productsSignal.set(res.data.items);
            this.loadingSignal.set(false);
          },
          error: () => this.loadingSignal.set(false),
        })
      );
  }

  createProduct(input: CreateProductRequest): Observable<any> {
    return this.api.post<Product>('/products', input);
  }

  updateProduct(
    productId: number,
    input: Partial<CreateProductRequest>
  ): Observable<any> {
    return this.api.patch<Product>(`/products/${productId}`, input);
  }

  deleteProduct(productId: number): Observable<any> {
    return this.api.delete(`/products/${productId}`);
  }

  // ============ CATEGORIES ============

  listCategories(): Observable<any> {
    return this.api.get<Category[]>('/categories');
  }

  createCategory(input: { name: string }): Observable<any> {
    return this.api.post<Category>('/categories', input);
  }

  clear() {
    this.productsSignal.set([]);
  }
}