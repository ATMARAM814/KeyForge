import { Injectable, computed, inject } from '@angular/core';
import { SessionStateService } from '../state/session-state.service';
import { UserRole } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UserModeService {
  private readonly sessionState = inject(SessionStateService);

  readonly currentRole = computed<UserRole>(() => {
    return this.sessionState.currentUser()?.role ?? 'DEVELOPER';
  });

  isDeveloper(): boolean {
    return this.currentRole() === 'DEVELOPER';
  }

  isProvider(): boolean {
    return this.currentRole() === 'PROVIDER' || this.currentRole() === 'ADMIN';
  }
}
