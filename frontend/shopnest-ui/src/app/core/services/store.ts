import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { Store } from '../models/store.model';

@Injectable({ providedIn: 'root' })
export class StoreService {
  private api = inject(ApiService);

  private currentStoreSignal = signal<Store | null>(null);
  private loadingSignal = signal(false);

  readonly currentStore = this.currentStoreSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();

  /**
   * Fetch store details by slug (public).
   */
  fetchStoreBySlug(slug: string): Observable<any> {
    this.loadingSignal.set(true);
    return this.api.get<Store>(`/stores/by-slug/${slug}`).pipe(
      tap({
        next: (res) => {
          this.currentStoreSignal.set(res.data);
          this.loadingSignal.set(false);
        },
        error: () => this.loadingSignal.set(false),
      })
    );
  }

  /**
   * Load the authenticated merchant's own store.
   */
  fetchCurrentStore(): Observable<any> {
    this.loadingSignal.set(true);
    return this.api.get<Store>('/stores/current').pipe(
      tap({
        next: (res) => {
          this.currentStoreSignal.set(res.data);
          this.loadingSignal.set(false);
        },
        error: () => this.loadingSignal.set(false),
      })
    );
  }

  /**
   * Create a new store (merchant onboarding).
   */
  createStore(input: { name: string; description?: string }): Observable<any> {
    return this.api.post<Store>('/stores', input).pipe(
      tap((res) => this.currentStoreSignal.set(res.data))
    );
  }

  /**
   * Update the current store.
   */
  updateStore(input: Partial<Store>): Observable<any> {
    return this.api.patch<Store>('/stores/current', input).pipe(
      tap((res) => this.currentStoreSignal.set(res.data))
    );
  }

  /**
   * Clear state (on logout).
   */
  clear() {
    this.currentStoreSignal.set(null);
  }
}