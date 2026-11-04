import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionStateService } from '../state/session-state.service';

export const authGuard: CanActivateFn = () => {
  const sessionState = inject(SessionStateService);
  const router = inject(Router);

  if (sessionState.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = () => {
  const sessionState = inject(SessionStateService);
  const router = inject(Router);

  if (!sessionState.isAuthenticated()) {
    return true;
  }

  const role = sessionState.currentUser()?.role;
  if (role === 'PROVIDER') {
    return router.createUrlTree(['/provider/services']);
  } else if (role === 'ADMIN') {
    return router.createUrlTree(['/admin-console']);
  }
  return router.createUrlTree(['/marketplace']);
};

export const homeGuard: CanActivateFn = () => {
  const sessionState = inject(SessionStateService);
  const router = inject(Router);

  if (!sessionState.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const role = sessionState.currentUser()?.role;
  if (role === 'PROVIDER') {
    return router.createUrlTree(['/provider/services']);
  } else if (role === 'ADMIN') {
    return router.createUrlTree(['/admin-console']);
  }
  return router.createUrlTree(['/marketplace']);
};

export const providerGuard: CanActivateFn = () => {
  const sessionState = inject(SessionStateService);
  const router = inject(Router);

  if (sessionState.isAuthenticated() && (sessionState.currentUser()?.role === 'PROVIDER' || sessionState.currentUser()?.role === 'ADMIN')) {
    return true;
  }

  return router.createUrlTree(['/marketplace']);
};

export const adminGuard: CanActivateFn = () => {
  const sessionState = inject(SessionStateService);
  const router = inject(Router);

  if (sessionState.isAuthenticated() && sessionState.currentUser()?.role === 'ADMIN') {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
