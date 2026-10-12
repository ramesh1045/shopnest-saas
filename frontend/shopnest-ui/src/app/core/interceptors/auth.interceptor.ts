import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

/**
 * Functional HTTP interceptor:
 * 1. Attaches JWT token to all API requests.
 * 2. Handles 401 (auto-logout + redirect).
 * 3. Shows notifications on errors.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notify = inject(NotificationService);

  const token = auth.getToken();

  // Skip auth header for login/register endpoints
  const isAuthEndpoint =
    req.url.includes('/auth/login') || req.url.includes('/auth/register');

  const authReq =
    token && !isAuthEndpoint
      ? req.clone({
          setHeaders: { Authorization: `Bearer ${token}` },
        })
      : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Token invalid or expired → logout
        auth.logout();
      } else if (error.status >= 500) {
        notify.error('Server error. Please try again later.');
      }

      return throwError(() => error);
    })
  );
};