import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Blocks access to routes when user is not logged in.
 * Redirects to /login with returnUrl.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) return true;

  router.navigate(['/login'], {
    queryParams: { returnUrl: state.url },
  });
  return false;
};