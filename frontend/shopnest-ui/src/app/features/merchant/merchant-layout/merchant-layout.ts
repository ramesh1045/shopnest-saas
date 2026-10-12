import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { StoreService } from '../../../core/services/store';
import { NotificationService } from '../../../core/services/notification.service';
import { MerchantSidebarComponent } from '../../../shared/components/merchant-sidebar/merchant-sidebar';

@Component({
  selector: 'app-merchant-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    MerchantSidebarComponent,
  ],
  templateUrl: './merchant-layout.html',
  styleUrl: './merchant-layout.css',
})
export class MerchantLayoutComponent implements OnInit {
  private auth = inject(AuthService);
  private storeService = inject(StoreService);
  private router = inject(Router);
  private notify = inject(NotificationService);

  loading = signal(true);
  userMenuOpen = signal(false);

  readonly user = this.auth.user;
  readonly store = this.storeService.currentStore;

  ngOnInit() {
    // Must be logged in as merchant
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: '/merchant' },
      });
      return;
    }

    if (!this.auth.isMerchant()) {
      this.notify.error('Merchant access required');
      this.router.navigate(['/']);
      return;
    }

    // Load current store
    this.storeService.fetchCurrentStore().subscribe({
      next: () => this.loading.set(false),
      error: (err) => {
        this.loading.set(false);
        this.notify.error(err.message || 'No store found');
        // If no store, send to home (later: store creation flow)
        setTimeout(() => this.router.navigate(['/']), 2000);
      },
    });
  }

  toggleUserMenu() {
    this.userMenuOpen.update((v) => !v);
  }

  logout() {
    this.auth.logout();
  }
}