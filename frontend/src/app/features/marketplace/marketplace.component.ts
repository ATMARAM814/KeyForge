import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MarketplaceService } from '../../core/services/marketplace.service';
import { ServiceCategory, ServiceListing } from '../../core/models/marketplace.model';
import { SessionStateService } from '../../core/state/session-state.service';
import { UserModeService } from '../../core/services/user-mode.service';


@Component({
  selector: 'kf-marketplace',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule,
  ],
  template: `
    <div class="kf-market-page">
      <div class="kf-market-container">
        @if (userModeService.isProvider()) {
          <div class="kf-provider-role-notice">
            <mat-icon>domain</mat-icon>
            <div>
              <strong>Provider Console Available:</strong> You are viewing the public marketplace as <em>{{ sessionState.currentUser()?.fullName }}</em>.
              To manage your API services, publish new models, or approve rate-limit elevation requests, go to your
              <a (click)="goToProviderConsole()">Provider Governance Console &rarr;</a>
            </div>
          </div>
        }

        <!-- Top Workspace Header (Left Aligned, Enterprise App Style) -->
        <div class="kf-market-header">
          <div class="kf-market-header__info">
            <div class="kf-badge-inline">
              <mat-icon>verified</mat-icon>
              <span>Verified AI Gateway Registry</span>
            </div>
            <h1 class="kf-market-title">API & AI Marketplace</h1>
            <p class="kf-market-subtitle">
              Browse, test in sandbox, and subscribe to verified high-performance AI models, computer vision systems, and cloud microservices.
            </p>
          </div>

          <div class="kf-header-actions">
            <div class="kf-health-pill">
              <span class="kf-status-dot"></span>
              <span>Gateway: <strong>100% Operational</strong></span>
            </div>
            <button mat-stroked-button class="kf-btn-playground-hdr" (click)="navigateToPlayground()">
              <mat-icon>terminal</mat-icon>
              <span>Open Playground</span>
            </button>
          </div>
        </div>

        <!-- Filter & Search Toolbar (Left Aligned Control Panel) -->
        <div class="kf-toolbar-card">
          <!-- Search Bar -->
          <div class="kf-toolbar-search">
            <mat-icon class="kf-search-icon">search</mat-icon>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearchChange()"
              placeholder="Search by model name, provider, or capability (e.g. Anthropic, LLM, Vision, Whisper)..."
              class="kf-search-input"
            />
            @if (searchQuery) {
              <button mat-icon-button (click)="clearSearch()" class="kf-search-clear" aria-label="Clear search">
                <mat-icon>close</mat-icon>
              </button>
            }
          </div>

          <!-- Category Filter Pills -->
          <div class="kf-category-pills">
            @for (cat of categories; track cat.value) {
              <button
                class="kf-cat-btn"
                [class.kf-cat-btn--active]="selectedCategory === cat.value"
                (click)="selectCategory(cat.value)"
              >
                <mat-icon class="kf-cat-icon">{{ cat.icon }}</mat-icon>
                <span>{{ cat.label }}</span>
              </button>
            }
          </div>
        </div>

        <!-- Results Counter & Reset Action -->
        <div class="kf-catalog-meta">
          <span class="kf-catalog-count">
            Showing <strong>{{ services().length }}</strong> published service{{ services().length === 1 ? '' : 's' }}
          </span>
          @if (selectedCategory || searchQuery) {
            <button mat-button class="kf-reset-btn" (click)="clearSearch()">
              <mat-icon>clear_all</mat-icon>
              <span>Reset filters</span>
            </button>
          }
        </div>

        <!-- Catalog Content -->
        @if (loading()) {
          <div class="kf-market-loading">
            <mat-spinner diameter="40"></mat-spinner>
            <p>Loading catalog services...</p>
          </div>
        } @else if (services().length === 0) {
          <!-- Empty State -->
          <div class="kf-onboarding-hub">
            <div class="kf-hub-status-pill">
              <span class="kf-pulse-dot"></span>
              <span>CATALOG EMPTY / NO MATCHING RESULTS</span>
            </div>
            <h2>No Published AI Models Found</h2>
            <p class="kf-hub-desc">
              No API services currently match your search query or filter. Once a registered provider lists an active model,
              it will immediately appear here for 1-click subscription and sandbox testing.
            </p>

            <div class="kf-hub-cards">
              <div class="kf-hub-card">
                <div class="kf-hub-card__icon kf-hub-card__icon--indigo">
                  <mat-icon>vpn_key</mat-icon>
                </div>
                <h4>1-Click Key Provisioning</h4>
                <p>Subscribe to any listed model with automated scoping, quotas, and instant API token generation.</p>
              </div>

              <div class="kf-hub-card">
                <div class="kf-hub-card__icon kf-hub-card__icon--emerald">
                  <mat-icon>terminal</mat-icon>
                </div>
                <h4>Interactive Sandbox Playground</h4>
                <p>Inspect payloads, test request headers, and simulate prompt responses before integrating into code.</p>
              </div>

              <div class="kf-hub-card">
                <div class="kf-hub-card__icon kf-hub-card__icon--sky">
                  <mat-icon>speed</mat-icon>
                </div>
                <h4>Automated Rate Limiting & SLA</h4>
                <p>Enterprise quotas, 60s sliding window rate limits, and live telemetry tracking.</p>
              </div>
            </div>

            <div class="kf-hub-actions">
              <button mat-flat-button color="primary" class="kf-btn-primary" (click)="loadServices()">
                <mat-icon>refresh</mat-icon>
                <span>Refresh Catalog</span>
              </button>
              <button mat-stroked-button class="kf-btn-secondary" (click)="navigateToPlayground()">
                <mat-icon>terminal</mat-icon>
                <span>Explore Playground</span>
              </button>
            </div>
          </div>
        } @else {
          <!-- Services Grid (Left-Aligned Responsive Cards) -->
          <div class="kf-services-grid">
            @for (item of services(); track item.id) {
              <div class="kf-service-card">
                <!-- Card Header -->
                <div class="kf-card-header">
                  <div class="kf-category-tag" [attr.data-cat]="item.category">
                    <mat-icon class="kf-mini-icon">{{ getCategoryIcon(item.category) }}</mat-icon>
                    <span>{{ formatCategory(item.category) }}</span>
                  </div>
                  <span class="kf-pricing-badge">{{ item.pricingTier || 'Verified' }}</span>
                </div>

                <!-- Service Title & Provider -->
                <h3 class="kf-card-title">{{ item.name }}</h3>
                <div class="kf-card-provider">
                  <mat-icon class="kf-provider-icon">verified</mat-icon>
                  <span>Provider: <strong>{{ item.providerName }}</strong></span>
                </div>

                <!-- Description -->
                <p class="kf-card-desc">{{ item.description }}</p>

                <!-- Specs Row -->
                <div class="kf-card-specs">
                  <div class="kf-spec-item" matTooltip="Default sliding window rate limit">
                    <mat-icon>speed</mat-icon>
                    <span>{{ item.rateLimitPerMinute }} req/min</span>
                  </div>
                  <div class="kf-spec-item">
                    <mat-icon>dns</mat-icon>
                    <span>REST / JSON</span>
                  </div>
                  <div class="kf-spec-item">
                    <mat-icon>check_circle</mat-icon>
                    <span>99.9% SLA</span>
                  </div>
                </div>

                <!-- Upstream Endpoint Box -->
                <div class="kf-card-endpoint">
                  <span class="kf-endpoint-label">Gateway Target:</span>
                  <code class="kf-endpoint-code">{{ item.endpointUrl }}</code>
                  <button
                    mat-icon-button
                    class="kf-endpoint-copy-btn"
                    matTooltip="Copy upstream endpoint"
                    (click)="copyEndpoint(item.endpointUrl)"
                  >
                    <mat-icon>content_copy</mat-icon>
                  </button>
                </div>

                <!-- Card Actions -->
                <div class="kf-card-actions">
                  @if (isMyService(item)) {
                    <button
                      mat-flat-button
                      class="kf-action-manage"
                      (click)="goToProviderConsole()"
                    >
                      <mat-icon>settings</mat-icon>
                      <span>Manage Service</span>
                    </button>
                  } @else {
                    <button
                      mat-flat-button
                      color="primary"
                      class="kf-action-sub"
                      (click)="subscribe(item)"
                    >
                      <mat-icon>vpn_key</mat-icon>
                      <span>Get API Key</span>
                    </button>
                  }

                  <button
                    mat-stroked-button
                    class="kf-action-test"
                    (click)="testInPlayground(item)"
                  >
                    <mat-icon>terminal</mat-icon>
                    <span>Playground</span>
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .kf-market-page {
      background: #f8fafc;
      min-height: calc(100vh - 86px);
      padding: 32px 36px 64px 36px;
      color: #0f172a;
    }

    .kf-market-container {
      max-width: 1400px;
      margin: 0 auto;
    }

    /* Left-Aligned Header Section */
    .kf-market-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      gap: 20px;
      flex-wrap: wrap;
      text-align: left;
    }

    .kf-market-header__info {
      max-width: 780px;
    }

    .kf-badge-inline {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      font-weight: 700;
      color: #4f46e5;
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      padding: 3px 10px;
      border-radius: 9999px;
      margin-bottom: 10px;
      letter-spacing: 0.3px;
    }

    .kf-badge-inline mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: #4f46e5;
    }

    .kf-market-title {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.025em;
      margin: 0 0 6px 0;
      line-height: 1.25;
    }

    .kf-market-subtitle {
      font-size: 14.5px;
      color: #64748b;
      margin: 0;
      line-height: 1.5;
    }

    .kf-header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .kf-health-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #f0fdf4;
      color: #15803d;
      border: 1px solid #bbf7d0;
      font-size: 12px;
      font-weight: 600;
      padding: 7px 12px;
      border-radius: 8px;
    }

    .kf-status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #16a34a;
      box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.2);
    }

    .kf-btn-playground-hdr {
      height: 38px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 13px;
      border-color: #cbd5e1 !important;
      color: #334155 !important;
    }

    .kf-btn-playground-hdr:hover {
      background: #f1f5f9;
      color: #0f172a !important;
    }

    /* Toolbar Card (Search + Category Filter Row) */
    .kf-toolbar-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 16px 20px;
      margin-bottom: 18px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .kf-toolbar-search {
      position: relative;
      width: 100%;
      max-width: 520px;
    }

    .kf-search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #94a3b8;
      font-size: 19px;
      width: 19px;
      height: 19px;
    }

    .kf-search-input {
      width: 100%;
      height: 42px;
      padding: 0 38px 0 40px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13.5px;
      color: #0f172a;
      outline: none;
      transition: all 0.15s ease;
    }

    .kf-search-input:focus {
      background: #ffffff;
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
    }

    .kf-search-clear {
      position: absolute;
      right: 4px;
      top: 50%;
      transform: translateY(-50%);
      color: #94a3b8;
    }

    /* Category Filter Pills */
    .kf-category-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }

    .kf-cat-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 9999px;
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #e2e8f0;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .kf-cat-btn:hover {
      background: #e2e8f0;
      color: #0f172a;
    }

    .kf-cat-btn--active {
      background: #4f46e5 !important;
      color: #ffffff !important;
      border-color: #4f46e5 !important;
      box-shadow: 0 2px 4px rgba(79, 70, 229, 0.25);
    }

    .kf-cat-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
    }

    /* Results Meta Counter */
    .kf-catalog-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
      padding: 0 4px;
      font-size: 13px;
      color: #64748b;
    }

    .kf-reset-btn {
      font-size: 12.5px;
      font-weight: 600;
      color: #6366f1;
    }

    .kf-market-loading {
      text-align: center;
      padding: 60px 0;
      color: #64748b;
    }

    .kf-market-loading mat-spinner {
      margin: 0 auto 16px auto;
    }

    /* Services Grid */
    .kf-services-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 22px;
    }

    /* Service Card */
    .kf-service-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 22px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02);
      transition: all 0.2s ease;
    }

    .kf-service-card:hover {
      border-color: #cbd5e1;
      box-shadow: 0 8px 16px -4px rgba(15, 23, 42, 0.08);
      transform: translateY(-2px);
    }

    .kf-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }

    .kf-category-tag {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11.5px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 9999px;
      background: #eef2ff;
      color: #4f46e5;
      border: 1px solid #c7d2fe;
    }

    .kf-mini-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .kf-pricing-badge {
      font-size: 11.5px;
      font-weight: 700;
      padding: 3px 9px;
      border-radius: 6px;
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
    }

    .kf-card-title {
      font-size: 17.5px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 6px 0;
      letter-spacing: -0.01em;
      line-height: 1.3;
    }

    .kf-card-provider {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 13px;
      color: #64748b;
      margin-bottom: 12px;
    }

    .kf-provider-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
      color: #0ea5e9;
    }

    .kf-card-desc {
      font-size: 13.5px;
      color: #475569;
      line-height: 1.5;
      margin: 0 0 16px 0;
      flex-grow: 1;
    }

    /* Specs Row */
    .kf-card-specs {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      padding: 10px 14px;
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      border-radius: 8px;
      margin-bottom: 14px;
    }

    .kf-spec-item {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
    }

    .kf-spec-item mat-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
      color: #6366f1;
    }

    /* Endpoint Box */
    .kf-card-endpoint {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 6px 12px;
      margin-bottom: 18px;
    }

    .kf-endpoint-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.4px;
    }

    .kf-endpoint-code {
      flex: 1;
      font-size: 12px;
      color: #0f172a;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 600;
    }

    .kf-endpoint-copy-btn {
      color: #64748b;
      width: 28px;
      height: 28px;
      line-height: 28px;
    }

    .kf-endpoint-copy-btn:hover {
      color: #4f46e5;
    }

    /* Card Action Buttons */
    .kf-card-actions {
      display: flex;
      gap: 10px;
    }

    .kf-action-sub {
      flex: 1;
      height: 42px;
      background: #4f46e5 !important;
      color: #ffffff !important;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13.5px;
      letter-spacing: -0.01em;
    }

    .kf-action-test {
      height: 42px;
      border-radius: 8px;
      border-color: #cbd5e1 !important;
      color: #334155 !important;
      font-weight: 600;
      font-size: 13.5px;
    }

    .kf-action-test:hover {
      background: #f1f5f9;
      color: #0f172a !important;
    }

    /* Onboarding / Empty State Hub */
    .kf-onboarding-hub {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 48px 36px;
      text-align: center;
      max-width: 860px;
      margin: 20px auto;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .kf-hub-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
      padding: 4px 14px;
      border-radius: 9999px;
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-bottom: 16px;
    }

    .kf-pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
    }

    .kf-onboarding-hub h2 {
      font-size: 24px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 10px 0;
    }

    .kf-hub-desc {
      font-size: 14.5px;
      color: #64748b;
      line-height: 1.6;
      max-width: 680px;
      margin: 0 auto 32px auto;
    }

    .kf-hub-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
      text-align: left;
    }

    .kf-hub-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
    }

    .kf-hub-card__icon {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 14px;
    }

    .kf-hub-card__icon--indigo {
      background: #eef2ff;
      color: #4f46e5;
    }

    .kf-hub-card__icon--emerald {
      background: #ecfdf5;
      color: #059669;
    }

    .kf-hub-card__icon--sky {
      background: #f0f9ff;
      color: #0284c7;
    }

    .kf-hub-card h4 {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 6px 0;
    }

    .kf-hub-card p {
      font-size: 13px;
      color: #64748b;
      line-height: 1.5;
      margin: 0;
    }

    .kf-hub-actions {
      display: flex;
      justify-content: center;
      gap: 12px;
    }

    .kf-btn-primary {
      height: 44px;
      border-radius: 8px;
      font-weight: 600;
      padding: 0 20px;
    }

    .kf-btn-secondary {
      height: 44px;
      border-radius: 8px;
      font-weight: 600;
      padding: 0 20px;
    }

    .kf-provider-role-notice {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 10px;
      padding: 12px 18px;
      margin-bottom: 20px;
      font-size: 13.5px;
      color: #1e40af;
    }

    .kf-provider-role-notice mat-icon {
      color: #2563eb;
    }

    .kf-provider-role-notice a {
      color: #2563eb;
      font-weight: 700;
      cursor: pointer;
      text-decoration: underline;
    }

    .kf-action-manage {
      background: #4f46e5 !important;
      color: #ffffff !important;
      font-weight: 600 !important;
      font-size: 13px !important;
    }
  `],
})
export class MarketplaceComponent implements OnInit {
  private readonly marketplaceService = inject(MarketplaceService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  protected readonly sessionState = inject(SessionStateService);
  protected readonly userModeService = inject(UserModeService);

  isMyService(item: ServiceListing): boolean {
    const user = this.sessionState.currentUser();
    if (!user || user.role !== 'PROVIDER') return false;
    return item.providerUserId === user.userId;
  }

  goToProviderConsole(): void {
    this.router.navigate(['/provider/services']);
  }

  services = signal<ServiceListing[]>([]);
  loading = signal(true);
  subscribingId = signal<string | null>(null);

  searchQuery = '';
  selectedCategory: ServiceCategory | null = null;

  categories: { label: string; value: ServiceCategory | null; icon: string }[] = [
    { label: 'All Categories', value: null, icon: 'apps' },
    { label: 'Frontier AI & LLMs', value: 'AI_LLM' as ServiceCategory, icon: 'psychology' },
    { label: 'Speech & Voice', value: 'SPEECH' as ServiceCategory, icon: 'graphic_eq' },
    { label: 'Computer Vision', value: 'COMPUTER_VISION' as ServiceCategory, icon: 'visibility' },
    { label: 'Financial & NLP', value: 'NLP' as ServiceCategory, icon: 'analytics' },
    { label: 'REST APIs & Webhooks', value: 'REST_API' as ServiceCategory, icon: 'api' },
  ];

  ngOnInit(): void {
    this.loadServices();
  }

  loadServices(): void {
    this.loading.set(true);
    this.marketplaceService
      .listServices(this.selectedCategory ?? undefined, this.searchQuery)
      .subscribe({
        next: (data) => {
          this.services.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.snackBar.open('Failed to load marketplace services', 'Dismiss', { duration: 3000 });
        },
      });
  }

  onSearchChange(): void {
    this.loadServices();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.selectedCategory = null;
    this.loadServices();
  }

  selectCategory(cat: ServiceCategory | null): void {
    this.selectedCategory = cat;
    this.loadServices();
  }

  subscribe(service: ServiceListing): void {
    this.router.navigate(['/marketplace/subscribe', service.id]);
  }

  testInPlayground(service: ServiceListing): void {
    this.router.navigate(['/playground'], { queryParams: { serviceId: service.id } });
  }

  copyEndpoint(url: string): void {
    navigator.clipboard.writeText(url);
    this.snackBar.open(`Copied ${url} to clipboard`, undefined, { duration: 2500 });
  }

  formatCategory(category: ServiceCategory): string {
    return category.replace('_', ' ');
  }

  navigateToPlayground(): void {
    this.router.navigate(['/playground']);
  }

  getCategoryIcon(category: ServiceCategory): string {
    switch (category) {
      case 'AI_LLM': return 'psychology';
      case 'SPEECH': return 'graphic_eq';
      case 'COMPUTER_VISION': return 'visibility';
      case 'NLP': return 'analytics';
      case 'REST_API': return 'api';
      default: return 'widgets';
    }
  }
}
