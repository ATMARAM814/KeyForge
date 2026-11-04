import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';
import { SessionStateService } from '../../core/state/session-state.service';
import { AuthService } from '../../core/services/auth.service';
import { UserModeService } from '../../core/services/user-mode.service';

@Component({
  selector: 'kf-topbar',
  standalone: true,
  imports: [CommonModule, MatToolbarModule, MatIconModule, MatButtonModule, MatMenuModule, MatDividerModule],
  template: `
    <!-- Main Navigation Bar -->
    <mat-toolbar class="kf-topbar">
      <button mat-icon-button (click)="menuToggle.emit()" aria-label="Toggle navigation" class="kf-menu-btn">
        <mat-icon>menu</mat-icon>
      </button>

      <div class="kf-topbar__brand-wrap" (click)="navigateHome()">
        <span class="kf-topbar__brand">KeyForge</span>
        <span class="kf-gateway-tag">AI GATEWAY</span>
      </div>

      <span class="kf-topbar__spacer"></span>

      <!-- Quick Nav Links on Header -->
      <div class="kf-nav-links">
        @if (userModeService.isDeveloper()) {
          <a class="kf-nav-item" (click)="navigateMarketplace()">
            <mat-icon>storefront</mat-icon>
            <span>Marketplace</span>
          </a>

          <a class="kf-nav-item" (click)="navigateTestingConsole()">
            <mat-icon>terminal</mat-icon>
            <span>API Testing Console</span>
          </a>
        } @else {
          <a class="kf-nav-item" (click)="navigateProviderServices()">
            <mat-icon>inventory_2</mat-icon>
            <span>Provider Console</span>
          </a>

          <a class="kf-nav-item" (click)="navigateMarketplace()">
            <mat-icon>storefront</mat-icon>
            <span>Marketplace</span>
          </a>
        }

        <div class="kf-gateway-status-pill">
          <span class="kf-status-dot"></span>
          <span>Gateway: <strong>Operational</strong></span>
        </div>
      </div>

      @if (sessionState.organizations().length > 0) {
        <button mat-button [matMenuTriggerFor]="orgMenu" class="kf-topbar__org-switcher">
          <mat-icon>domain</mat-icon>
          <span>{{ sessionState.currentOrganization()?.name ?? 'Workspace' }}</span>
          <mat-icon>arrow_drop_down</mat-icon>
        </button>
        <mat-menu #orgMenu="matMenu" class="kf-org-menu">
          @for (org of sessionState.organizations(); track org.id) {
            <button mat-menu-item (click)="selectOrg(org.id)">
              {{ org.name }}
              <span class="kf-topbar__org-plan">{{ org.planTier }}</span>
            </button>
          }
        </mat-menu>
      }

      <!-- User Avatar & Dropdown -->
      <button mat-icon-button [matMenuTriggerFor]="userMenu" class="kf-topbar__avatar-btn" aria-label="User menu">
        <mat-icon>account_circle</mat-icon>
      </button>
      <mat-menu #userMenu="matMenu" class="kf-user-menu" xPosition="before">
        <div class="kf-menu-profile">
          <div class="kf-menu-name">{{ sessionState.currentUser()?.fullName }}</div>
          <div class="kf-menu-email">{{ sessionState.currentUser()?.email }}</div>
          <div class="kf-menu-badge-wrap">
            <span class="kf-menu-role-tag" [class.kf-menu-role-tag--prov]="userModeService.isProvider()">
              {{ sessionState.currentUser()?.role === 'DEVELOPER' ? 'Developer / Consumer' : sessionState.currentUser()?.role }}
            </span>
          </div>
        </div>
        <mat-divider style="border-top-color: #e2e8f0; margin: 4px 0;"></mat-divider>
        <button mat-menu-item (click)="logout()" class="kf-menu-signout">
          <mat-icon style="color: #ef4444; font-size: 18px; width: 18px; height: 18px; margin-right: 8px;">logout</mat-icon>
          <span style="color: #ef4444; font-weight: 600; font-size: 13.5px;">Sign out</span>
        </button>
      </mat-menu>
    </mat-toolbar>
  `,
  styles: [`
    .kf-topbar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: #ffffff;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 12px;
      height: 58px;
      padding: 0 20px;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03);
    }

    .kf-menu-btn {
      color: #475569;
    }

    .kf-topbar__brand-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;
    }

    .kf-topbar__brand {
      font-weight: 800;
      font-size: 20px;
      letter-spacing: -0.6px;
      color: #0f172a;
    }

    .kf-gateway-tag {
      font-size: 10px;
      font-weight: 800;
      color: #4f46e5;
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      padding: 2px 6px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }

    .kf-topbar__spacer {
      flex: 1;
    }

    .kf-nav-links {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-right: 12px;
    }

    .kf-nav-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      text-decoration: none;
      padding: 6px 10px;
      border-radius: 6px;
      transition: all 0.15s ease;
    }

    .kf-nav-item:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    .kf-nav-item mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #64748b;
    }

    .kf-gateway-status-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 4px 10px;
      border-radius: 100px;
      font-size: 12px;
      color: #475569;
    }

    .kf-status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
    }

    .kf-topbar__org-switcher {
      font-size: 13px;
      font-weight: 600;
      color: #334155;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      height: 34px;
      padding: 0 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .kf-topbar__org-switcher mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #64748b;
    }

    .kf-topbar__org-plan {
      font-size: 10.5px;
      font-weight: 700;
      color: #6366f1;
      background: #eef2ff;
      padding: 2px 6px;
      border-radius: 4px;
      margin-left: 8px;
      text-transform: uppercase;
    }

    .kf-topbar__avatar-btn {
      color: #475569;
    }

    .kf-menu-profile {
      padding: 12px 16px;
      min-width: 200px;
    }

    .kf-menu-name {
      font-weight: 700;
      font-size: 14px;
      color: #0f172a;
    }

    .kf-menu-email {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
    }

    .kf-menu-badge-wrap {
      margin-top: 8px;
    }

    .kf-menu-role-tag {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 7px;
      border-radius: 4px;
      background: #eef2ff;
      color: #4f46e5;
    }

    .kf-menu-role-tag--prov {
      background: #ecfdf5;
      color: #059669;
    }
  `],
})
export class TopbarComponent {
  protected readonly sessionState = inject(SessionStateService);
  protected readonly userModeService = inject(UserModeService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  menuToggle = output<void>();

  navigateHome(): void {
    if (this.userModeService.isProvider()) {
      this.router.navigate(['/provider/services']);
    } else {
      this.router.navigate(['/marketplace']);
    }
  }

  navigateMarketplace(): void {
    this.router.navigate(['/marketplace']);
  }

  navigateTestingConsole(): void {
    this.router.navigate(['/playground']);
  }

  navigateProviderServices(): void {
    this.router.navigate(['/provider/services']);
  }

  selectOrg(orgId: string): void {
    this.sessionState.setCurrentOrg(orgId);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
