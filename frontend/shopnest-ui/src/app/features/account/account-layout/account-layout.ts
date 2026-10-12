import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-account-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './account-layout.html',
  styleUrl: './account-layout.css',
})
export class AccountLayoutComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private notify = inject(NotificationService);

  readonly user = this.auth.user;
  readonly isLoggedIn = this.auth.isLoggedIn;

  navItems = [
    { path: '/account/profile', label: 'Profile', icon: 'bi-person' },
    { path: '/account/orders', label: 'My Orders', icon: 'bi-receipt' },
  ];

  ngOnInit() {
    if (!this.isLoggedIn()) {
      this.notify.warning('Please sign in to access your account');
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: '/account/profile' },
      });
    }
  }

  logout() {
    this.auth.logout();
  }

  getInitials(): string {
    const name = this.user()?.fullName || '';
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }
}