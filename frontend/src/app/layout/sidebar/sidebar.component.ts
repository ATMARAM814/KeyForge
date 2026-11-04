import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { SessionStateService } from '../../core/state/session-state.service';
import { UserModeService } from '../../core/services/user-mode.service';

@Component({
  selector: 'kf-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatListModule, MatIconModule, MatDividerModule],
  template: `
    <mat-nav-list class="kf-sidebar">
      <!-- Section Header -->
      <div class="kf-sidebar-header">
        @if (userModeService.isDeveloper()) {
          <span class="kf-role-tag kf-role-tag--dev">Developer Workspace</span>
        } @else {
          <span class="kf-role-tag kf-role-tag--prov">Provider Console</span>
        }
      </div>

      <!-- Developer Mode Links -->
      @if (userModeService.isDeveloper()) {
        <a mat-list-item routerLink="/marketplace" routerLinkActive="kf-sidebar__item--active">
          <mat-icon matListItemIcon class="kf-nav-icon">storefront</mat-icon>
          <span matListItemTitle>API & AI Marketplace</span>
        </a>

        <a mat-list-item routerLink="/playground" routerLinkActive="kf-sidebar__item--active">
          <mat-icon matListItemIcon class="kf-nav-icon">terminal</mat-icon>
          <span matListItemTitle>Model Playground</span>
        </a>

        <a mat-list-item routerLink="/subscribed-keys" routerLinkActive="kf-sidebar__item--active">
          <mat-icon matListItemIcon class="kf-nav-icon">vpn_key</mat-icon>
          <span matListItemTitle>My Subscribed Keys</span>
        </a>

        <a mat-list-item routerLink="/dashboard" routerLinkActive="kf-sidebar__item--active">
          <mat-icon matListItemIcon class="kf-nav-icon">analytics</mat-icon>
          <span matListItemTitle>Live Usage Stats</span>
        </a>
      }

      <!-- Provider Mode Links -->
      @if (userModeService.isProvider()) {
        <a mat-list-item routerLink="/provider/services" routerLinkActive="kf-sidebar__item--active">
          <mat-icon matListItemIcon class="kf-nav-icon">inventory_2</mat-icon>
          <span matListItemTitle>My Listed Services</span>
        </a>

        <a mat-list-item routerLink="/projects" routerLinkActive="kf-sidebar__item--active">
          <mat-icon matListItemIcon class="kf-nav-icon">folder_special</mat-icon>
          <span matListItemTitle>Projects & Gateways</span>
        </a>

        <a mat-list-item routerLink="/dashboard" routerLinkActive="kf-sidebar__item--active">
          <mat-icon matListItemIcon class="kf-nav-icon">query_stats</mat-icon>
          <span matListItemTitle>Traffic & Performance</span>
        </a>
      }

      <mat-divider style="margin: 12px 0;"></mat-divider>

      <a mat-list-item routerLink="/audit-log" routerLinkActive="kf-sidebar__item--active">
        <mat-icon matListItemIcon class="kf-nav-icon">history</mat-icon>
        <span matListItemTitle>Audit Log</span>
      </a>

      @if (sessionState.currentUser()?.role === 'ADMIN') {
        <mat-divider style="margin: 8px 0;"></mat-divider>
        <a mat-list-item routerLink="/admin-console" routerLinkActive="kf-sidebar__item--active">
          <mat-icon matListItemIcon style="color: #8b5cf6;">admin_panel_settings</mat-icon>
          <span matListItemTitle style="color: #8b5cf6; font-weight: 600;">Admin Console</span>
        </a>
      }
    </mat-nav-list>
  `,
  styles: [`
    .kf-sidebar {
      padding-top: 12px;
    }

    .kf-sidebar-header {
      padding: 4px 16px 12px 16px;
    }

    .kf-role-tag {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      padding: 3px 8px;
      border-radius: 4px;
    }

    .kf-role-tag--dev {
      background: rgba(99, 102, 241, 0.12);
      color: #6366f1;
    }

    .kf-role-tag--prov {
      background: rgba(16, 185, 129, 0.12);
      color: #10b981;
    }

    .kf-nav-icon {
      color: #64748b;
    }

    .kf-sidebar__item--active {
      background-color: rgba(99, 102, 241, 0.1) !important;
      font-weight: 600;
    }

    .kf-sidebar__item--active .kf-nav-icon {
      color: #6366f1 !important;
    }

    .kf-sidebar__item--active span {
      color: #6366f1 !important;
    }
  `],
})
export class SidebarComponent {
  protected readonly sessionState = inject(SessionStateService);
  protected readonly userModeService = inject(UserModeService);
}
