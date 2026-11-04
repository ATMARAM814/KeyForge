import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiKeyService } from '../../core/services/api-key.service';
import { ApiKey } from '../../core/models/api-key.model';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { MaskKeyPipe } from '../../shared/pipes/mask-key.pipe';

@Component({
  selector: 'kf-subscribed-keys',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    LoadingSpinnerComponent,
    MaskKeyPipe,
  ],
  template: `
    <div class="kf-page">
      <div class="kf-page-header">
        <div>
          <h1 class="kf-page-title">My Subscribed Keys</h1>
          <p class="kf-page-subtitle">
            Manage your active AI model subscriptions, API access credentials, and gateway rate limits.
          </p>
        </div>
        <button mat-flat-button color="primary" class="kf-header-btn" (click)="goToMarketplace()">
          <mat-icon>storefront</mat-icon>
          <span>Explore Marketplace</span>
        </button>
      </div>

      @if (loading()) {
        <kf-loading-spinner label="Loading your subscribed keys..."></kf-loading-spinner>
      } @else if (keys().length === 0) {
        <div class="kf-empty-container">
          <div class="kf-empty-card">
            <div class="kf-empty-card__icon">
              <mat-icon>vpn_key_off</mat-icon>
            </div>
            <h2>No Subscribed API Keys Yet</h2>
            <p>
              You haven't subscribed to any AI models or API services yet. Browse the Marketplace
              to subscribe to verified AI providers and instantly generate your production API keys.
            </p>
            <button mat-flat-button color="primary" class="kf-cta-btn" (click)="goToMarketplace()">
              <mat-icon>storefront</mat-icon>
              <span>Browse API & AI Marketplace</span>
            </button>
          </div>
        </div>
      } @else {
        <div class="kf-table-card mat-elevation-z1">
          <table mat-table [dataSource]="keys()" class="kf-full-width">
            <!-- Service / Model Name -->
            <ng-container matColumnDef="service">
              <th mat-header-cell *matHeaderCellDef>AI Model / Service</th>
              <td mat-cell *matCellDef="let key">
                <div class="kf-service-cell">
                  <div class="kf-service-icon">
                    <mat-icon>psychology</mat-icon>
                  </div>
                  <div>
                    <div class="kf-service-name">{{ getCleanServiceName(key) }}</div>
                    <div class="kf-provider-sub">
                      Provider: <strong>{{ key.providerName || 'Verified Provider' }}</strong>
                    </div>
                  </div>
                </div>
              </td>
            </ng-container>

            <!-- Key Token / Prefix -->
            <ng-container matColumnDef="keyPrefix">
              <th mat-header-cell *matHeaderCellDef>API Key Credential</th>
              <td mat-cell *matCellDef="let key">
                <div class="kf-key-token-cell">
                  <code class="kf-key-code" matTooltip="Secret key is hashed and hidden after generation for security">{{ key.keyPrefix | maskKey }}</code>
                </div>
              </td>
            </ng-container>

            <!-- Quota / Rate Limit -->
            <ng-container matColumnDef="rateLimit">
              <th mat-header-cell *matHeaderCellDef>Rate Limit Quota</th>
              <td mat-cell *matCellDef="let key">
                <span class="kf-rate-pill">
                  <mat-icon class="kf-mini-icon">speed</mat-icon>
                  {{ key.rateLimitPerMinute }} req/min
                </span>
              </td>
            </ng-container>

            <!-- Subscribed Date -->
            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef>Subscribed Date</th>
              <td mat-cell *matCellDef="let key">
                <span class="kf-date-text">{{ key.createdAt | date: 'mediumDate' }}</span>
              </td>
            </ng-container>

            <!-- Status -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let key">
                @if (key.status === 'ACTIVE') {
                  <span class="kf-status-badge kf-status-badge--active">
                    <span class="kf-pulse-dot"></span> Active
                  </span>
                } @else {
                  <span class="kf-status-badge kf-status-badge--revoked">
                    Revoked
                  </span>
                }
              </td>
            </ng-container>

            <!-- Actions -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef style="text-align: right;">Actions</th>
              <td mat-cell *matCellDef="let key" style="text-align: right;">
                <div class="kf-actions-group">
                  <button
                    mat-stroked-button
                    class="kf-btn-playground"
                    (click)="openInPlayground(key)"
                  >
                    <mat-icon>terminal</mat-icon>
                    <span>Test in Console</span>
                  </button>

                  @if (key.status === 'ACTIVE') {
                    <button
                      mat-button
                      color="warn"
                      class="kf-btn-revoke"
                      (click)="revokeKey(key)"
                    >
                      <mat-icon>block</mat-icon>
                      <span>Revoke</span>
                    </button>
                  }
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .kf-page {
      padding: 32px;
      max-width: 1300px;
      margin: 0 auto;
    }

    .kf-page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 28px;
    }

    .kf-page-title {
      font-size: 24px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 6px 0;
      letter-spacing: -0.4px;
    }

    .kf-page-subtitle {
      font-size: 14px;
      color: #64748b;
      margin: 0;
    }

    .kf-header-btn {
      height: 42px;
      border-radius: 8px;
      font-weight: 600;
    }

    .kf-table-card {
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }

    .kf-full-width {
      width: 100%;
    }

    .kf-service-cell {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
    }

    .kf-service-icon {
      width: 38px;
      height: 38px;
      border-radius: 8px;
      background: #eef2ff;
      color: #6366f1;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .kf-service-name {
      font-weight: 600;
      font-size: 14px;
      color: #1e293b;
    }

    .kf-provider-sub {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
    }

    .kf-key-token-cell {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .kf-key-code {
      background: #f1f5f9;
      color: #0f172a;
      padding: 4px 8px;
      border-radius: 6px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      font-weight: 600;
      border: 1px solid #e2e8f0;
    }

    .kf-copy-btn {
      color: #64748b;
      width: 32px;
      height: 32px;
      line-height: 32px;
    }

    .kf-copy-btn:hover {
      color: #4f46e5;
    }

    .kf-rate-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12.5px;
      font-weight: 600;
      background: #f0fdf4;
      color: #15803d;
      padding: 3px 10px;
      border-radius: 9999px;
      border: 1px solid #bbf7d0;
    }

    .kf-mini-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
    }

    .kf-date-text {
      font-size: 13px;
      color: #64748b;
    }

    .kf-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 9999px;
      letter-spacing: 0.3px;
    }

    .kf-status-badge--active {
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
    }

    .kf-status-badge--revoked {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }

    .kf-pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
    }

    .kf-actions-group {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .kf-btn-playground {
      border-radius: 6px;
      font-size: 12.5px;
      font-weight: 600;
    }

    .kf-btn-revoke {
      font-size: 12.5px;
      font-weight: 600;
    }

    /* Empty state */
    .kf-empty-container {
      display: flex;
      justify-content: center;
      padding: 40px 0;
    }

    .kf-empty-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 48px 32px;
      text-align: center;
      max-width: 520px;
    }

    .kf-empty-card__icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #eef2ff;
      color: #6366f1;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px auto;
    }

    .kf-empty-card__icon mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .kf-empty-card h2 {
      font-size: 20px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 10px 0;
    }

    .kf-empty-card p {
      font-size: 14px;
      color: #64748b;
      line-height: 1.5;
      margin: 0 0 24px 0;
    }

    .kf-cta-btn {
      height: 44px;
      border-radius: 8px;
      font-weight: 600;
      padding: 0 24px;
    }
  `],
})
export class SubscribedKeysComponent implements OnInit {
  private readonly apiKeyService = inject(ApiKeyService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  keys = signal<ApiKey[]>([]);
  loading = signal(true);

  displayedColumns = ['service', 'keyPrefix', 'rateLimit', 'createdAt', 'status', 'actions'];

  ngOnInit(): void {
    this.loadKeys();
  }

  loadKeys(): void {
    this.loading.set(true);
    this.apiKeyService.getMySubscribedKeys().subscribe({
      next: (data) => {
        this.keys.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Unable to load subscribed keys', 'Dismiss', { duration: 3000 });
      },
    });
  }

  getCleanServiceName(key: ApiKey): string {
    if (key.serviceName) {
      return key.serviceName;
    }
    if (key.name && key.name.startsWith('Sub: ')) {
      return key.name.substring(5);
    }
    return key.name || 'AI Gateway Service';
  }

  copyPrefix(prefix: string): void {
    navigator.clipboard.writeText(prefix);
    this.snackBar.open(`Copied ${prefix} to clipboard`, undefined, { duration: 2500 });
  }

  goToMarketplace(): void {
    this.router.navigate(['/marketplace']);
  }

  openInPlayground(key: ApiKey): void {
    const queryParams: any = {};
    if (key.serviceId) {
      queryParams.serviceId = key.serviceId;
    }
    this.router.navigate(['/playground'], { queryParams });
  }

  revokeKey(key: ApiKey): void {
    if (!confirm(`Are you sure you want to revoke the key for "${this.getCleanServiceName(key)}"? This cannot be undone.`)) {
      return;
    }

    this.apiKeyService.revoke(key.id).subscribe({
      next: () => {
        this.snackBar.open('API key revoked successfully', undefined, { duration: 3000 });
        this.loadKeys();
      },
      error: () => {
        this.snackBar.open('Unable to revoke key', 'Dismiss', { duration: 3000 });
      },
    });
  }
}
