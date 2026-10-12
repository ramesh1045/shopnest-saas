import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { StoreService } from '../../../core/services/store';

@Component({
  selector: 'app-merchant-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './merchant-sidebar.html',
  styleUrl: './merchant-sidebar.css',
})
export class MerchantSidebarComponent {
  private auth = inject(AuthService);
  private storeService = inject(StoreService);

  readonly user = this.auth.user;
  readonly store = this.storeService.currentStore;

  readonly storeInitial = computed(() => {
    const name = this.store()?.name || 'S';
    return name.charAt(0).toUpperCase();
  });

  readonly storeSlug = computed(() => this.store()?.slug || '');

  navItems = [
    { path: '/merchant', label: 'Dashboard', icon: 'bi-speedometer2', exact: true },
    { path: '/merchant/products', label: 'Products', icon: 'bi-box-seam', exact: false },
    { path: '/merchant/orders', label: 'Orders', icon: 'bi-receipt', exact: false },
    { path: '/merchant/customers', label: 'Customers', icon: 'bi-people', exact: false },
    { path: '/merchant/settings', label: 'Settings', icon: 'bi-gear', exact: false },
  ];
}