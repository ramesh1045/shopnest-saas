import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Blocks access unless user is a merchant (STORE_OWNER, STORE_MANAGER, or STORE_STAFF).
 */
export const merchantGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  if (auth.isMerchant()) return true;

  router.navigate(['/']);
  return false;
};

/**
 * Blocks access unless user is a STORE_OWNER specifically.
 */
export const ownerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  if (auth.role() === 'STORE_OWNER' || auth.role() === 'SUPER_ADMIN') {
    return true;
  }

  router.navigate(['/']);
  return false;
};