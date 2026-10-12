import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
export class AdminLayoutComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private notify = inject(NotificationService);

  userMenuOpen = signal(false);
  readonly user = this.auth.user;

  navItems = [
    { path: '/admin', label: 'Overview', icon: 'bi-speedometer2', exact: true },
    { path: '/admin/stores', label: 'Stores', icon: 'bi-shop', exact: false },
    { path: '/admin/plans', label: 'Plans', icon: 'bi-credit-card', exact: false },
  ];

  ngOnInit() {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: '/admin' },
      });
      return;
    }

    if (!this.auth.isSuperAdmin()) {
      this.notify.error('Super admin access required');
      this.router.navigate(['/']);
    }
  }

  toggleUserMenu() {
    this.userMenuOpen.update((v) => !v);
  }

  logout() {
    this.auth.logout();
  }
}