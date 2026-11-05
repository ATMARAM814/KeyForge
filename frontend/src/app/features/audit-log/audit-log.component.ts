import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { OrganizationService } from '../../core/services/organization.service';
import { SessionStateService } from '../../core/state/session-state.service';
import { AuditLogEntry } from '../../core/models/audit-log.model';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'kf-audit-log',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    LoadingSpinnerComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="kf-page">
      <div class="kf-page-header">
        <div>
          <h1 class="kf-page-title">Security & Audit Log</h1>
          <p class="kf-page-subtitle">Complete chronological record of all API key operations, service subscriptions, and security events.</p>
        </div>
        <button mat-stroked-button (click)="load()" class="kf-refresh-btn">
          <mat-icon>refresh</mat-icon>
          <span>Refresh</span>
        </button>
      </div>

      @if (loading()) {
        <kf-loading-spinner label="Loading audit logs..."></kf-loading-spinner>
      } @else if (logs().length === 0) {
        <kf-empty-state
          icon="history"
          title="No audit events found"
          message="Security and management events (key creation, revocation, rotation, subscriptions) will be automatically recorded here."
        ></kf-empty-state>
      } @else {
        <div class="kf-table-card mat-elevation-z1">
          <table mat-table [dataSource]="logs()" style="width: 100%;">
            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef style="width: 180px;">Timestamp</th>
              <td mat-cell *matCellDef="let log" class="kf-timestamp-cell">
                {{ log.createdAt | date: 'medium' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="actorEmail">
              <th mat-header-cell *matHeaderCellDef>Actor / User</th>
              <td mat-cell *matCellDef="let log">
                <span class="kf-actor-pill">{{ log.actorEmail }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="action">
              <th mat-header-cell *matHeaderCellDef>Action</th>
              <td mat-cell *matCellDef="let log">
                <span class="kf-action-badge" [class]="actionChipClass(log.action)">
                  {{ formatAction(log.action) }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="details">
              <th mat-header-cell *matHeaderCellDef>Event Details</th>
              <td mat-cell *matCellDef="let log" class="kf-details-cell">
                {{ log.details || (log.targetType + ' ID: ' + log.targetId) }}
              </td>
            </ng-container>

            <ng-container matColumnDef="targetType">
              <th mat-header-cell *matHeaderCellDef>Target</th>
              <td mat-cell *matCellDef="let log">
                <code class="kf-target-code">{{ log.targetType }}</code>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>

          <mat-paginator
            [length]="totalElements()"
            [pageSize]="pageSize()"
            [pageIndex]="pageIndex()"
            [pageSizeOptions]="[10, 20, 50]"
            (page)="onPageChange($event)"
          ></mat-paginator>
        </div>
      }
    </div>
  `,
  styles: [`
    .kf-page {
      padding: 24px 32px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .kf-page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }

    .kf-page-title {
      font-size: 24px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 6px 0;
    }

    .kf-page-subtitle {
      color: #64748b;
      font-size: 14px;
      margin: 0;
    }

    .kf-refresh-btn {
      color: #475569;
      border-color: #cbd5e1;
    }

    .kf-table-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }

    .kf-timestamp-cell {
      font-size: 13px;
      color: #475569;
      white-space: nowrap;
    }

    .kf-actor-pill {
      font-size: 13px;
      color: #0f172a;
      font-weight: 500;
    }

    .kf-action-badge {
      display: inline-block;
      font-size: 11.5px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      letter-spacing: 0.3px;
    }

    .action-chip-created {
      background-color: #dcfce7;
      color: #15803d;
    }

    .action-chip-revoked {
      background-color: #fee2e2;
      color: #b91c1c;
    }

    .action-chip-rotated {
      background-color: #e0f2fe;
      color: #0369a1;
    }

    .action-chip-published {
      background-color: #f3e8ff;
      color: #7e22ce;
    }

    .action-chip-deleted {
      background-color: #fef2f2;
      color: #991b1b;
    }

    .action-chip-approved {
      background-color: #ecfdf5;
      color: #047857;
    }

    .action-chip-registered {
      background-color: #fef9c3;
      color: #a16207;
    }

    .action-chip-default {
      background-color: #f1f5f9;
      color: #475569;
    }

    .kf-details-cell {
      font-size: 13px;
      color: #334155;
    }

    .kf-target-code {
      font-size: 11.5px;
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      color: #475569;
    }
  `],
})
export class AuditLogComponent implements OnInit {
  private readonly orgService = inject(OrganizationService);
  private readonly sessionState = inject(SessionStateService);

  logs = signal<AuditLogEntry[]>([]);
  totalElements = signal(0);
  pageSize = signal(10);
  pageIndex = signal(0);
  loading = signal(true);

  displayedColumns = ['createdAt', 'actorEmail', 'action', 'details', 'targetType'];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const orgId = this.sessionState.currentOrgId();

    this.orgService.getAuditLogs(orgId, this.pageIndex(), this.pageSize()).subscribe({
      next: (page) => {
        this.logs.set(page.content);
        this.totalElements.set(page.totalElements);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.load();
  }

  formatAction(action: string): string {
    return action.replace(/_/g, ' ');
  }

  actionChipClass(action: string): string {
    switch (action) {
      case 'API_KEY_CREATED':
        return 'action-chip-created';
      case 'API_KEY_REVOKED':
        return 'action-chip-revoked';
      case 'API_KEY_ROTATED':
        return 'action-chip-rotated';
      case 'SERVICE_PUBLISHED':
        return 'action-chip-published';
      case 'SERVICE_DELETED':
        return 'action-chip-deleted';
      case 'RATE_LIMIT_APPROVED':
        return 'action-chip-approved';
      case 'USER_REGISTERED':
        return 'action-chip-registered';
      default:
        return 'action-chip-default';
    }
  }
}
