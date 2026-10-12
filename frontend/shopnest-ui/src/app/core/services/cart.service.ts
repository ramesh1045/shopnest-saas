import { Injectable, inject, signal, computed } from '@angular/core';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Cart } from '../models/cart.model';

@Injectable({ providedIn: 'root' })
export class CartService {
  private api = inject(ApiService);

  private cartSignal = signal<Cart | null>(null);
  private loadingSignal = signal(false);

  readonly cart = this.cartSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly itemCount = computed(() => this.cartSignal()?.item_count ?? 0);
  readonly subtotal = computed(() => this.cartSignal()?.subtotal_inr ?? 0);

  /**
   * Load cart for a specific store.
   */
  loadCart(storeSlug: string) {
    this.loadingSignal.set(true);
    return this.api
      .get<Cart>(`/cart/${storeSlug}`)
      .pipe(tap(() => this.loadingSignal.set(false)))
      .subscribe({
        next: (res) => this.cartSignal.set(res.data),
        error: () => this.loadingSignal.set(false),
      });
  }

  /**
   * Add product to cart.
   */
  addItem(storeSlug: string, productId: number, quantity: number) {
    return this.api
      .post<Cart>(`/cart/${storeSlug}/items`, {
        product_id: productId,
        quantity,
      })
      .pipe(tap((res) => this.cartSignal.set(res.data)));
  }

  /**
   * Update cart item quantity.
   */
  updateItem(storeSlug: string, cartItemId: number, quantity: number) {
    return this.api
      .patch<Cart>(`/cart/${storeSlug}/items/${cartItemId}`, { quantity })
      .pipe(tap((res) => this.cartSignal.set(res.data)));
  }

  /**
   * Remove item from cart.
   */
  removeItem(storeSlug: string, cartItemId: number) {
    return this.api
      .delete<Cart>(`/cart/${storeSlug}/items/${cartItemId}`)
      .pipe(tap((res) => this.cartSignal.set(res.data)));
  }

  /**
   * Clear local cart state (not backend).
   */
  clear() {
    this.cartSignal.set(null);
  }
}