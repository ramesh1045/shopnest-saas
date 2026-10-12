
import { Component, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { Store } from '../../../core/models/store.model';

@Component({
  selector: 'app-store-header',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './store-header.html',
  styleUrl: './store-header.css',
})
export class StoreHeaderComponent {
  @Input() store!: Store;

  private auth = inject(AuthService);
  private cart = inject(CartService);
  private router = inject(Router);

  readonly user = this.auth.user;
  readonly isLoggedIn = this.auth.isLoggedIn;
  readonly cartCount = this.cart.itemCount;

  searchTerm = signal('');
  menuOpen = signal(false);

  toggleMenu() {
    this.menuOpen.update((v) => !v);
  }

  onSearch() {
    const term = this.searchTerm().trim();
    if (!this.store) return;
    if (term) {
      this.router.navigate(['/store', this.store.slug, 'products'], {
        queryParams: { search: term },
      });
    } else {
      this.router.navigate(['/store', this.store.slug, 'products']);
    }
  }

  logout() {
    this.auth.logout();
  }

  goToCart() {
    if (!this.store) return;
    this.router.navigate(['/store', this.store.slug, 'cart']);
  }

  goToAccount() {
    this.router.navigate(['/account/orders']);
  }
}