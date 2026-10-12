import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StoreService } from '../../../core/services/store';
import { ApiService } from '../../../core/services/api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CurrencyInrPipe } from '../../../shared/pipes/currency-inr.pipe';

interface Subscription {
  subscription_id: number;
  plan_id: number;
  plan_code: string;
  plan_name: string;
  price_inr: number;
  max_products: number;
  max_staff: number;
  features: any;
  status: string;
  started_at: string;
  current_period_end: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, CurrencyInrPipe],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings implements OnInit {
  private fb = inject(FormBuilder);
  private storeService = inject(StoreService);
  private api = inject(ApiService);
  private notify = inject(NotificationService);

  loading = signal(true);
  saving = signal(false);
  activeTab = signal<'profile' | 'branding' | 'plan'>('profile');

  store = this.storeService.currentStore;
  subscription = signal<Subscription | null>(null);

  profileForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    theme_color: ['#FF6B00'],
  });

  brandingForm = this.fb.group({
    logo_url: [''],
    banner_url: [''],
  });

  ngOnInit() {
    this.loadStore();
    this.loadSubscription();
  }

  private loadStore() {
    this.loading.set(true);
    this.storeService.fetchCurrentStore().subscribe({
      next: () => {
        const s = this.storeService.currentStore();
        if (s) {
          this.profileForm.patchValue({
            name: s.name || '',
            description: s.description || '',
            theme_color: s.theme_color || '#FF6B00',
          });
          this.brandingForm.patchValue({
            logo_url: s.logo_url || '',
            banner_url: s.banner_url || '',
          });
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.notify.error(err.message || 'Failed to load store');
      },
    });
  }

  private loadSubscription() {
    this.api.get<Subscription>('/subscriptions/current').subscribe({
      next: (res) => this.subscription.set(res.data),
      error: () => {},
    });
  }

  switchTab(tab: 'profile' | 'branding' | 'plan') {
    this.activeTab.set(tab);
  }

  saveProfile() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.notify.warning('Please fix errors');
      return;
    }

    this.saving.set(true);
    this.storeService.updateStore(this.profileForm.value as any).subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success('Store profile updated');
      },
      error: (err) => {
        this.saving.set(false);
        this.notify.error(err.message || 'Failed to update');
      },
    });
  }

  saveBranding() {
    this.saving.set(true);
    this.storeService.updateStore(this.brandingForm.value as any).subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success('Branding updated');
      },
      error: (err) => {
        this.saving.set(false);
        this.notify.error(err.message || 'Failed to update');
      },
    });
  }

  get name() { return this.profileForm.get('name')!; }

  copyStoreUrl() {
    const slug = this.store()?.slug;
    if (!slug) return;
    const url = `${window.location.origin}/store/${slug}`;
    navigator.clipboard.writeText(url);
    this.notify.success('Store URL copied!');
  }

  getDaysRemaining(): number {
    const sub = this.subscription();
    if (!sub) return 0;
    const end = new Date(sub.current_period_end).getTime();
    const now = Date.now();
    return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  }
}