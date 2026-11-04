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

          <a class="kf-nav-item" (click)="navigatePlayground()">
            <mat-icon>terminal</mat-icon>
            <span>Playground</span>
          </a>
        } @else {
          <a class="kf-nav-item" (click)="navigateHome()">
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
          <span>Engine: <strong>Operational</strong> (14ms)</span>
        </div>
      </div>

      @if (sessionState.organizations().length > 0) {
        <button mat-button [matMenuTriggerFor]="orgMenu" class="kf-topbar__org-switcher">
          <mat-icon>domain</mat-icon>
          <span>{{ sessionState.currentOrganization()?.name ?? 'Organization' }}</span>
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
              {{ sessionState.currentUser()?.role }}
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
    /* Main Toolbar - Crisp Enterprise Light Theme */
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
      letter-spacing: -0.03em;
      color: #0f172a;
    }

    .kf-gateway-tag {
      font-size: 10px;
      background: #eef2ff;
      color: #4f46e5;
      border: 1px solid #c7d2fe;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    .kf-topbar__spacer {
      flex: 1 1 auto;
    }

    /* Header Nav Links (Kong Style) */
    .kf-nav-links {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-right: 12px;
    }

    .kf-nav-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13.5px;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      text-decoration: none;
      padding: 6px 12px;
      border-radius: 6px;
      transition: all 0.15s ease;
    }

    .kf-nav-item:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    .kf-nav-item mat-icon {
      font-size: 17px;
      width: 17px;
      height: 17px;
      color: #6366f1;
    }

    .kf-gateway-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #f0fdf4;
      color: #15803d;
      border: 1px solid #bbf7d0;
      font-size: 12px;
      font-weight: 500;
      padding: 4px 10px;
      border-radius: 9999px;
    }

    .kf-status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #16a34a;
      box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.2);
    }

    .kf-topbar__org-switcher {
      color: #334155;
      font-weight: 600;
      font-size: 13.5px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      height: 38px;
    }

    .kf-topbar__org-plan {
      margin-left: 8px;
      font-size: 11px;
      color: #64748b;
    }

    .kf-topbar__avatar-btn {
      color: #475569;
    }

    @media (max-width: 860px) {
      .kf-nav-links {
        display: none;
      }
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

  navigatePlayground(): void {
    this.router.navigate(['/playground']);
  }

  selectOrg(orgId: string): void {
    this.sessionState.setCurrentOrg(orgId);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
