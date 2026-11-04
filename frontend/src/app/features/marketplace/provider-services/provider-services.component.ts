import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MarketplaceService } from '../../../core/services/marketplace.service';
import { ServiceListing } from '../../../core/models/marketplace.model';
import { ApiKey } from '../../../core/models/api-key.model';
import { PublishServiceDialogComponent } from './publish-service-dialog.component';

@Component({
  selector: 'kf-provider-services',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  template: `
    <div class="kf-provider-page">
      <div class="kf-provider-header">
        <div>
          <h1>Provider Governance & Policy Console</h1>
          <p>Configure provider security policies, audit traffic limits, and review developer elevation requests.</p>
        </div>
        <button mat-flat-button color="primary" class="kf-btn-publish" (click)="openPublishDialog()">
          <mat-icon>add</mat-icon>
          <span>Publish Service / Model</span>
        </button>
      </div>

      <!-- Quick Metrics -->
      <div class="kf-metrics-row">
        <mat-card class="kf-metric-card">
          <div class="kf-metric-label">Published Services</div>
          <div class="kf-metric-value">{{ services().length }}</div>
        </mat-card>
        <mat-card class="kf-metric-card">
          <div class="kf-metric-label">Pending Quota Elevation Requests</div>
          <div class="kf-metric-value" [class.kf-metric-alert]="pendingRequestsCount() > 0">
            {{ pendingRequestsCount() }}
          </div>
        </mat-card>
        <mat-card class="kf-metric-card">
          <div class="kf-metric-label">Gateway Policy Enforcement</div>
          <div class="kf-metric-value kf-status-up">Active & Enforced</div>
        </mat-card>
      </div>

      <!-- Tab Navigation -->
      <div class="kf-tab-bar">
        <button
          class="kf-tab-btn"
          [class.active]="activeTab() === 'services'"
          (click)="activeTab.set('services')"
        >
          <mat-icon>hub</mat-icon>
          <span>Published Services & Policy Templates</span>
          <span class="kf-tab-count">{{ services().length }}</span>
        </button>

        <button
          class="kf-tab-btn"
          [class.active]="activeTab() === 'requests'"
          (click)="activeTab.set('requests')"
        >
          <mat-icon>speed</mat-icon>
          <span>Rate Limit Increase Requests</span>
          @if (pendingRequestsCount() > 0) {
            <span class="kf-tab-badge">{{ pendingRequestsCount() }}</span>
          }
        </button>
      </div>

      <!-- TAB 1: Services & Policy Templates -->
      @if (activeTab() === 'services') {
        <mat-card class="kf-services-table-card">
          @if (loading()) {
            <div class="kf-table-loading">
              <mat-spinner diameter="40"></mat-spinner>
              <p>Loading your services & policy templates...</p>
            </div>
          } @else if (services().length === 0) {
            <div class="kf-table-empty">
              <mat-icon>cloud_off</mat-icon>
              <h3>No services published yet</h3>
              <p>Click "Publish Service / Model" above to list your first API or AI model with governance templates.</p>
              <button mat-flat-button color="primary" (click)="openPublishDialog()">
                <mat-icon>add</mat-icon> Publish Your First Service
              </button>
            </div>
          } @else {
            <table mat-table [dataSource]="services()" class="kf-table">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Name & Category</th>
                <td mat-cell *matCellDef="let s">
                  <div class="kf-table-name">{{ s.name }}</div>
                  <div class="kf-cat-row">
                    <span class="kf-cat-badge">{{ s.category }}</span>
                    <span class="kf-tier-badge">{{ s.pricingTier }}</span>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="endpoint">
                <th mat-header-cell *matHeaderCellDef>Gateway Endpoint</th>
                <td mat-cell *matCellDef="let s">
                  <code>{{ s.endpointUrl }}</code>
                </td>
              </ng-container>

              <ng-container matColumnDef="rateLimit">
                <th mat-header-cell *matHeaderCellDef>Rate Limit Bounds</th>
                <td mat-cell *matCellDef="let s">
                  <div class="kf-rate-info">
                    <strong>Default:</strong> {{ s.defaultRateLimit || s.rateLimitPerMinute }} rpm
                  </div>
                  <div class="kf-rate-max">
                    <strong>Max Ceiling:</strong> {{ s.maxRateLimit || 1000 }} rpm
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="policy">
                <th mat-header-cell *matHeaderCellDef>Provider Policy Template</th>
                <td mat-cell *matCellDef="let s">
                  <div class="kf-policy-tags">
                    <span class="kf-policy-tag" title="Maximum expiration duration">
                      Max Expiry: {{ s.maxExpiryDays || 365 }}d
                    </span>
                    <span class="kf-policy-tag" [class.kf-tag-ok]="s.allowNeverExpires" [class.kf-tag-deny]="!s.allowNeverExpires">
                      {{ s.allowNeverExpires ? 'Never Allowed' : 'No Permanent Keys' }}
                    </span>
                    <span class="kf-policy-tag" [class.kf-tag-warn]="s.requireIpAllowlistForProduction">
                      {{ s.requireIpAllowlistForProduction ? 'IP Allowlist Required (Prod)' : 'Optional Allowlist' }}
                    </span>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let s">
                  <button mat-icon-button color="warn" (click)="deleteService(s)" title="Delete Service">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="columns"></tr>
              <tr mat-row *matRowDef="let row; columns: columns"></tr>
            </table>
          }
        </mat-card>
      }

      <!-- TAB 2: Rate Limit Increase Requests -->
      @if (activeTab() === 'requests') {
        <mat-card class="kf-services-table-card">
          @if (loadingRequests()) {
            <div class="kf-table-loading">
              <mat-spinner diameter="40"></mat-spinner>
              <p>Loading rate limit elevation requests...</p>
            </div>
          } @else if (rateLimitRequests().length === 0) {
            <div class="kf-table-empty">
              <mat-icon>verified</mat-icon>
              <h3>No Rate Limit Elevation Requests</h3>
              <p>All developers are currently operating within your standard plan quota baselines.</p>
            </div>
          } @else {
            <table mat-table [dataSource]="rateLimitRequests()" class="kf-table">
              <ng-container matColumnDef="key">
                <th mat-header-cell *matHeaderCellDef>Key / App Identity</th>
                <td mat-cell *matCellDef="let r">
                  <div class="kf-table-name">{{ r.name }}</div>
                  <div class="kf-key-meta">
                    <code>{{ r.keyPrefix }}...</code>
                    <span class="kf-client-chip">{{ r.clientType || 'SERVER' }}</span>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="service">
                <th mat-header-cell *matHeaderCellDef>Service Target</th>
                <td mat-cell *matCellDef="let r">
                  <div class="kf-table-name">{{ r.serviceName }}</div>
                  <div class="kf-owner-email">{{ r.ownerEmail || 'No contact' }}</div>
                </td>
              </ng-container>

              <ng-container matColumnDef="traffic">
                <th mat-header-cell *matHeaderCellDef>Declared Baseline Profile</th>
                <td mat-cell *matCellDef="let r">
                  <div class="kf-baseline-line">
                    <span>Expected Daily:</span> <strong>{{ r.expectedRequestsPerDay ? (r.expectedRequestsPerDay | number) : '—' }}</strong>
                  </div>
                  <div class="kf-baseline-line">
                    <span>Expected Peak:</span> <strong>{{ r.expectedPeakPerMinute ? r.expectedPeakPerMinute + ' rpm' : '—' }}</strong>
                  </div>
                  <div class="kf-baseline-line">
                    <span>Regions:</span> <code>{{ r.typicalRegions || 'GLOBAL' }}</code>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="requestQuota">
                <th mat-header-cell *matHeaderCellDef>Quota Request</th>
                <td mat-cell *matCellDef="let r">
                  <div class="kf-quota-comparison">
                    <span class="kf-quota-current">Current: {{ r.rateLimitPerMinute }} rpm</span>
                    <mat-icon class="kf-arrow-icon">arrow_forward</mat-icon>
                    <span class="kf-quota-requested">Requested: {{ r.requestedRateLimit }} rpm</span>
                  </div>
                  <div class="kf-reason-box" *ngIf="r.requestedRateLimitReason">
                    <strong>Reason:</strong> "{{ r.requestedRateLimitReason }}"
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Approval Status</th>
                <td mat-cell *matCellDef="let r">
                  @switch (r.rateLimitApprovalStatus) {
                    @case ('PENDING_APPROVAL') {
                      <span class="kf-status-pill kf-status-pending">
                        <mat-icon>hourglass_top</mat-icon> Pending Approval
                      </span>
                    }
                    @case ('APPROVED') {
                      <span class="kf-status-pill kf-status-approved">
                        <mat-icon>check_circle</mat-icon> Approved
                      </span>
                    }
                    @case ('REJECTED') {
                      <span class="kf-status-pill kf-status-rejected">
                        <mat-icon>cancel</mat-icon> Rejected
                      </span>
                    }
                    @default {
                      <span class="kf-status-pill">{{ r.rateLimitApprovalStatus }}</span>
                    }
                  }
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Provider Action</th>
                <td mat-cell *matCellDef="let r">
                  @if (r.rateLimitApprovalStatus === 'PENDING_APPROVAL') {
                    <div class="kf-action-btns">
                      <button
                        mat-flat-button
                        class="kf-btn-approve"
                        (click)="approveRequest(r)"
                        [disabled]="processingKeyId() === r.id"
                      >
                        <mat-icon>check</mat-icon>
                        <span>Approve</span>
                      </button>
                      <button
                        mat-stroked-button
                        class="kf-btn-reject"
                        (click)="rejectRequest(r)"
                        [disabled]="processingKeyId() === r.id"
                      >
                        <mat-icon>close</mat-icon>
                        <span>Reject</span>
                      </button>
                    </div>
                  } @else {
                    <span class="kf-resolved-text">Resolved</span>
                  }
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="requestColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: requestColumns"></tr>
            </table>
          }
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .kf-provider-page {
      padding: 32px;
      max-width: 1280px;
      margin: 0 auto;
    }

    .kf-provider-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .kf-provider-header h1 {
      font-size: 26px;
      font-weight: 800;
      margin: 0 0 4px 0;
      color: #0f172a;
    }

    .kf-provider-header p {
      color: #64748b;
      margin: 0;
      font-size: 14px;
    }

    .kf-btn-publish {
      height: 42px;
      font-weight: 600;
      background: #4f46e5 !important;
      color: #fff !important;
      border-radius: 8px;
    }

    .kf-metrics-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .kf-metric-card {
      padding: 20px !important;
      border-radius: 10px !important;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    .kf-metric-label {
      font-size: 12px;
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }

    .kf-metric-value {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
    }

    .kf-metric-alert {
      color: #d97706;
    }

    .kf-status-up {
      color: #16a34a;
    }

    .kf-tab-bar {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 2px;
    }

    .kf-tab-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border: none;
      background: transparent;
      color: #64748b;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      border-radius: 8px 8px 0 0;
      transition: all 0.2s ease;
      position: relative;
    }

    .kf-tab-btn:hover {
      color: #0f172a;
      background: #f1f5f9;
    }

    .kf-tab-btn.active {
      color: #4f46e5;
      border-bottom: 3px solid #4f46e5;
      background: #eef2ff;
    }

    .kf-tab-count {
      background: #e2e8f0;
      color: #475569;
      font-size: 11px;
      padding: 2px 7px;
      border-radius: 999px;
      font-weight: 700;
    }

    .kf-tab-badge {
      background: #ef4444;
      color: #fff;
      font-size: 11px;
      padding: 2px 7px;
      border-radius: 999px;
      font-weight: 700;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.15); }
    }

    .kf-services-table-card {
      border-radius: 12px !important;
      overflow: hidden;
      padding: 0 !important;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    .kf-table {
      width: 100%;
    }

    .kf-table th {
      background: #f8fafc;
      color: #475569;
      font-weight: 700;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 14px 16px;
    }

    .kf-table td {
      padding: 16px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }

    .kf-table-name {
      font-weight: 700;
      color: #0f172a;
      font-size: 14px;
      margin-bottom: 4px;
    }

    .kf-cat-row {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .kf-cat-badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 6px;
      background: #e0e7ff;
      color: #3730a3;
      font-weight: 600;
    }

    .kf-tier-badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 6px;
      background: #f1f5f9;
      color: #475569;
      font-weight: 600;
    }

    .kf-policy-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .kf-policy-tag {
      font-size: 11px;
      padding: 2px 7px;
      border-radius: 4px;
      background: #f1f5f9;
      color: #334155;
      font-weight: 600;
      border: 1px solid #e2e8f0;
    }

    .kf-tag-ok {
      background: #dcfce7;
      color: #166534;
      border-color: #bbf7d0;
    }

    .kf-tag-deny {
      background: #fef2f2;
      color: #991b1b;
      border-color: #fecaca;
    }

    .kf-tag-warn {
      background: #fef3c7;
      color: #92400e;
      border-color: #fde68a;
    }

    .kf-key-meta {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-top: 4px;
    }

    .kf-client-chip {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
      background: #e2e8f0;
      color: #334155;
    }

    .kf-owner-email {
      font-size: 12px;
      color: #64748b;
    }

    .kf-baseline-line {
      font-size: 12px;
      color: #475569;
      margin-bottom: 2px;
    }

    .kf-baseline-line span {
      color: #64748b;
      margin-right: 4px;
    }

    .kf-quota-comparison {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }

    .kf-quota-current {
      color: #64748b;
    }

    .kf-arrow-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #94a3b8;
    }

    .kf-quota-requested {
      font-weight: 800;
      color: #4f46e5;
    }

    .kf-reason-box {
      margin-top: 6px;
      background: #f8fafc;
      padding: 6px 10px;
      border-radius: 6px;
      border-left: 3px solid #6366f1;
      font-size: 12px;
      color: #334155;
    }

    .kf-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 999px;
    }

    .kf-status-pill mat-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
    }

    .kf-status-pending {
      background: #fef3c7;
      color: #92400e;
    }

    .kf-status-approved {
      background: #dcfce7;
      color: #166534;
    }

    .kf-status-rejected {
      background: #fee2e2;
      color: #991b1b;
    }

    .kf-action-btns {
      display: flex;
      gap: 8px;
    }

    .kf-btn-approve {
      background: #16a34a !important;
      color: #fff !important;
      font-size: 12px;
      font-weight: 700;
      height: 32px;
      padding: 0 12px;
      border-radius: 6px;
    }

    .kf-btn-approve mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      margin-right: 4px;
    }

    .kf-btn-reject {
      color: #dc2626 !important;
      border-color: #fca5a5 !important;
      font-size: 12px;
      font-weight: 700;
      height: 32px;
      padding: 0 12px;
      border-radius: 6px;
    }

    .kf-btn-reject mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      margin-right: 4px;
    }

    .kf-resolved-text {
      font-size: 12px;
      color: #94a3b8;
      font-style: italic;
    }

    .kf-table-loading, .kf-table-empty {
      padding: 48px;
      text-align: center;
      color: #64748b;
    }

    .kf-table-empty mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: #94a3b8;
      margin-bottom: 12px;
    }
  `],
})
export class ProviderServicesComponent implements OnInit {
  private readonly marketplaceService = inject(MarketplaceService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  activeTab = signal<'services' | 'requests'>('services');

  loading = signal(true);
  services = signal<ServiceListing[]>([]);
  columns = ['name', 'endpoint', 'rateLimit', 'policy', 'actions'];

  loadingRequests = signal(false);
  rateLimitRequests = signal<ApiKey[]>([]);
  requestColumns = ['key', 'service', 'traffic', 'requestQuota', 'status', 'actions'];

  processingKeyId = signal<string | null>(null);

  get pendingRequestsCount(): () => number {
    return () => this.rateLimitRequests().filter(r => r.rateLimitApprovalStatus === 'PENDING_APPROVAL').length;
  }

  ngOnInit(): void {
    this.loadMyServices();
    this.loadRateLimitRequests();
  }

  loadMyServices(): void {
    this.loading.set(true);
    this.marketplaceService.getMyServices().subscribe({
      next: (data) => {
        this.services.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  loadRateLimitRequests(): void {
    this.loadingRequests.set(true);
    this.marketplaceService.getProviderRateLimitRequests().subscribe({
      next: (requests) => {
        this.rateLimitRequests.set(requests);
        this.loadingRequests.set(false);
      },
      error: () => {
        this.loadingRequests.set(false);
      },
    });
  }

  approveRequest(req: ApiKey): void {
    this.processingKeyId.set(req.id);
    this.marketplaceService.approveRateLimitRequest(req.id).subscribe({
      next: () => {
        this.processingKeyId.set(null);
        this.snackBar.open(`Approved rate limit of ${req.requestedRateLimit} rpm for key '${req.name}'!`, 'Dismiss', { duration: 3500 });
        this.loadRateLimitRequests();
      },
      error: (err) => {
        this.processingKeyId.set(null);
        this.snackBar.open(err.error?.message || 'Failed to approve request', 'Dismiss', { duration: 3500 });
      },
    });
  }

  rejectRequest(req: ApiKey): void {
    this.processingKeyId.set(req.id);
    this.marketplaceService.rejectRateLimitRequest(req.id).subscribe({
      next: () => {
        this.processingKeyId.set(null);
        this.snackBar.open(`Rejected rate limit request for '${req.name}'.`, 'Dismiss', { duration: 3500 });
        this.loadRateLimitRequests();
      },
      error: (err) => {
        this.processingKeyId.set(null);
        this.snackBar.open(err.error?.message || 'Failed to reject request', 'Dismiss', { duration: 3500 });
      },
    });
  }

  openPublishDialog(): void {
    const ref = this.dialog.open(PublishServiceDialogComponent, {
      width: '640px',
    });
    ref.afterClosed().subscribe((created) => {
      if (created) {
        this.loadMyServices();
      }
    });
  }

  deleteService(service: ServiceListing): void {
    if (!confirm(`Are you sure you want to unpublish '${service.name}'?`)) return;

    this.marketplaceService.deleteService(service.id).subscribe({
      next: () => {
        this.snackBar.open('Service deleted', 'Dismiss', { duration: 2500 });
        this.loadMyServices();
      },
      error: () => {
        this.snackBar.open('Failed to delete service', 'Dismiss', { duration: 3000 });
      },
    });
  }
}
