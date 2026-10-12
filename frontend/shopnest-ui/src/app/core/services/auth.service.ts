import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { tap, finalize } from 'rxjs/operators';
import { ApiService } from './api.service';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
} from '../models/user.model';

const TOKEN_KEY = 'shopnest_token';
const USER_KEY = 'shopnest_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  private userSignal = signal<User | null>(this.loadUserFromStorage());
  private loadingSignal = signal(false);

  readonly user = this.userSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly isLoggedIn = computed(() => this.userSignal() !== null);
  readonly role = computed(() => this.userSignal()?.role ?? null);
  readonly isMerchant = computed(() => {
    const r = this.userSignal()?.role;
    return r === 'STORE_OWNER' || r === 'STORE_MANAGER' || r === 'STORE_STAFF';
  });
  readonly isSuperAdmin = computed(() => this.userSignal()?.role === 'SUPER_ADMIN');

  loginAndPersist(input: LoginRequest) {
    this.loadingSignal.set(true);
    return this.api.post<AuthResponse>('/auth/login', input).pipe(
      finalize(() => this.loadingSignal.set(false)),
      tap((res) => this.persistSession(res.data))
    );
  }

  registerAndPersist(input: RegisterRequest) {
    this.loadingSignal.set(true);
    return this.api.post<AuthResponse>('/auth/register', input).pipe(
      finalize(() => this.loadingSignal.set(false)),
      tap((res) => this.persistSession(res.data))
    );
  }

  fetchMe() {
    return this.api.get<User>('/auth/me');
  }

  logout() {
    this.api.post('/auth/logout', {}).subscribe({
      next: () => {},
      error: () => {},
    });
    this.clearSession();
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private persistSession(data: AuthResponse) {
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    this.userSignal.set(data.user);
  }

  private clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.userSignal.set(null);
  }

  private loadUserFromStorage(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}