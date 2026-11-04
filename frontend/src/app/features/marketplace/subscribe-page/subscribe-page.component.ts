import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  DeclaredEndpointPermission,
  ServiceListing,
  SubscribeServiceRequest,
} from '../../../core/models/marketplace.model';
import { MarketplaceService } from '../../../core/services/marketplace.service';
import { ApiKeyCreatedResponse } from '../../../core/models/api-key.model';

interface EndpointModelOption {
  endpoint: string;
  name: string;
  supportsWrite: boolean;
  readSelected: boolean;
  writeSelected: boolean;
}

@Component({
  selector: 'kf-subscribe-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  template: `
    <div class="kf-sub-page">
      <div class="kf-sub-container">

        <!-- Top Breadcrumbs -->
        <div class="kf-sub-topbar">
          <button mat-button class="kf-back-link" (click)="goBack()">
            <mat-icon>arrow_back</mat-icon>
            <span>Back to Marketplace</span>
          </button>
          <div class="kf-sub-breadcrumbs">
            <span>Marketplace</span>
            <mat-icon>chevron_right</mat-icon>
            <span class="active">Issue API Key</span>
          </div>
        </div>

        @if (loadingService()) {
          <div class="kf-page-loading">
            <mat-spinner diameter="40"></mat-spinner>
            <p>Loading service...</p>
          </div>
        } @else if (!service()) {
          <div class="kf-error-card">
            <mat-icon class="kf-err-icon">error_outline</mat-icon>
            <h3>Service Not Found</h3>
            <p>The requested service could not be found or has been removed.</p>
            <button mat-flat-button color="primary" (click)="goBack()">Return to Catalog</button>
          </div>
        } @else {

          <!-- Page Header -->
          <div class="kf-page-header">
            <h1 class="kf-title">Issue API Key</h1>
            <p class="kf-subtitle">
              Configure credentials and governance controls for <strong>{{ service()?.name }}</strong>
            </p>
          </div>

          <!-- Main 2-Column Layout -->
          <div class="kf-page-layout">

            <!-- LEFT COLUMN: Clean Service Overview -->
            <div class="kf-sidebar-col">
              <div class="kf-service-card">
                <div class="kf-service-head">
                  <div class="kf-service-icon">
                    <mat-icon>{{ getCategoryIcon(service()?.category || 'AI_LLM') }}</mat-icon>
                  </div>
                  <div>
                    <span class="kf-cat-tag">{{ service()?.category }}</span>
                    <h3 class="kf-service-name">{{ service()?.name }}</h3>
                  </div>
                </div>

                <!-- Provider Info (Uneditable) -->
                <div class="kf-provider-row">
                  <span class="kf-spec-label">Provider</span>
                  <div class="kf-provider-value">
                    <span>{{ service()?.providerName }}</span>
                    <mat-icon class="kf-verified-icon" matTooltip="Verified Provider (Uneditable)">verified</mat-icon>
                  </div>
                </div>

                <!-- Specs List -->
                <div class="kf-spec-table">
                  <div class="kf-spec-item">
                    <span class="kf-spec-label">Rate Limit</span>
                    <strong class="kf-spec-val">{{ service()?.rateLimitPerMinute }} req/min</strong>
                  </div>
                  <div class="kf-spec-item">
                    <span class="kf-spec-label">Plan Tier</span>
                    <span class="kf-spec-val">{{ service()?.pricingTier || 'Verified' }}</span>
                  </div>
                  <div class="kf-spec-item">
                    <span class="kf-spec-label">Rotation Policy</span>
                    <span class="kf-spec-val">{{ allowNeverExpires ? 'Permanent Allowed' : 'Max 1 Year' }}</span>
                  </div>
                </div>

                <!-- Endpoint URL -->
                <div class="kf-endpoint-box">
                  <div class="kf-endpoint-head">
                    <span class="kf-spec-label">Gateway Endpoint</span>
                    <button mat-icon-button class="kf-mini-copy" (click)="copyText(service()?.endpointUrl || '')" matTooltip="Copy Endpoint">
                      <mat-icon>content_copy</mat-icon>
                    </button>
                  </div>
                  <code class="kf-endpoint-code">{{ service()?.endpointUrl }}</code>
                </div>

                <!-- Description -->
                @if (service()?.description) {
                  <p class="kf-service-desc">{{ service()?.description }}</p>
                }
              </div>
            </div>

            <!-- RIGHT COLUMN: Wizard Steps or Reveal -->
            <div class="kf-main-col">

              @if (!provisionedKey()) {
                <!-- Modern Stepper -->
                <div class="kf-stepper">
                  <div class="kf-step" [class.active]="currentStep() === 1" [class.done]="currentStep() > 1" (click)="goToStep(1)">
                    <span class="kf-step-num">
                      @if (currentStep() > 1) { <mat-icon>check</mat-icon> } @else { 1 }
                    </span>
                    <span class="kf-step-text">Application</span>
                  </div>
                  <div class="kf-step-line" [class.done]="currentStep() > 1"></div>

                  <div class="kf-step" [class.active]="currentStep() === 2" [class.done]="currentStep() > 2" (click)="goToStep(2)">
                    <span class="kf-step-num">
                      @if (currentStep() > 2) { <mat-icon>check</mat-icon> } @else { 2 }
                    </span>
                    <span class="kf-step-text">Traffic & Limits</span>
                  </div>
                  <div class="kf-step-line" [class.done]="currentStep() > 2"></div>

                  <div class="kf-step" [class.active]="currentStep() === 3" (click)="goToStep(3)">
                    <span class="kf-step-num">3</span>
                    <span class="kf-step-text">Security</span>
                  </div>
                </div>

                <!-- Form Card -->
                <div class="kf-card">

                  <!-- STEP 1: Application -->
                  @if (currentStep() === 1) {
                    <div class="kf-step-content">
                      <div class="kf-step-title-row">
                        <h2>Application Identity</h2>
                        <span class="kf-step-badge">Step 1 of 3</span>
                      </div>

                      <!-- Key Name -->
                      <div class="kf-form-item">
                        <label class="kf-label" for="keyName">Key Name <span class="kf-req">*</span></label>
                        <input
                          id="keyName"
                          type="text"
                          class="kf-input"
                          [(ngModel)]="keyName"
                          placeholder="e.g. Production Backend, Web App Client"
                          required
                        />
                      </div>

                      <!-- Environment: Clean Segmented Control -->
                      <div class="kf-form-item">
                        <label class="kf-label">Environment</label>
                        <div class="kf-env-segmented">
                          <button
                            type="button"
                            class="kf-env-btn"
                            [class.active]="environment === 'PRODUCTION'"
                            (click)="environment = 'PRODUCTION'"
                          >
                            <span class="kf-env-dot kf-env-dot--live"></span>
                            <span class="kf-env-label">Live</span>
                            <code class="kf-env-code">kf_live_...</code>
                          </button>

                          <button
                            type="button"
                            class="kf-env-btn"
                            [class.active]="environment === 'STAGING'"
                            (click)="environment = 'STAGING'"
                          >
                            <span class="kf-env-dot kf-env-dot--staging"></span>
                            <span class="kf-env-label">Staging</span>
                            <code class="kf-env-code">kf_test_...</code>
                          </button>

                          <button
                            type="button"
                            class="kf-env-btn"
                            [class.active]="environment === 'DEVELOPMENT'"
                            (click)="environment = 'DEVELOPMENT'"
                          >
                            <span class="kf-env-dot kf-env-dot--dev"></span>
                            <span class="kf-env-label">Dev</span>
                            <code class="kf-env-code">kf_test_...</code>
                          </button>
                        </div>
                      </div>

                      <!-- Owner Contact Email -->
                      <div class="kf-form-item">
                        <label class="kf-label" for="ownerEmail">Owner Contact Email <span class="kf-req">*</span></label>
                        <input
                          id="ownerEmail"
                          type="email"
                          class="kf-input"
                          [(ngModel)]="ownerEmail"
                          placeholder="developer@company.com"
                          required
                        />
                        <span class="kf-input-helper">Used for key rotation notices and security alerts</span>
                      </div>

                      <!-- Client Type: 4 Clean Icon Cards -->
                      <div class="kf-form-item">
                        <label class="kf-label">Client Type</label>
                        <div class="kf-client-grid">
                          <div
                            class="kf-client-pill"
                            [class.active]="clientType === 'server'"
                            (click)="setClientType('server')"
                          >
                            <mat-icon>dns</mat-icon>
                            <span>Server</span>
                          </div>

                          <div
                            class="kf-client-pill"
                            [class.active]="clientType === 'browser'"
                            (click)="setClientType('browser')"
                          >
                            <mat-icon>web</mat-icon>
                            <span>Browser</span>
                          </div>

                          <div
                            class="kf-client-pill"
                            [class.active]="clientType === 'mobile'"
                            (click)="setClientType('mobile')"
                          >
                            <mat-icon>smartphone</mat-icon>
                            <span>Mobile</span>
                          </div>

                          <div
                            class="kf-client-pill"
                            [class.active]="clientType === 'ci_batch'"
                            (click)="setClientType('ci_batch')"
                          >
                            <mat-icon>terminal</mat-icon>
                            <span>CI / Batch</span>
                          </div>
                        </div>
                      </div>

                      <!-- Footer Action -->
                      <div class="kf-actions">
                        <div></div>
                        <button
                          mat-flat-button
                          color="primary"
                          class="kf-btn-next"
                          [disabled]="!keyName.trim() || !ownerEmail.trim()"
                          (click)="nextStep()"
                        >
                          <span>Continue to Traffic & Limits</span>
                          <mat-icon>arrow_forward</mat-icon>
                        </button>
                      </div>
                    </div>
                  }

                  <!-- STEP 2: Usage & Limits -->
                  @if (currentStep() === 2) {
                    <div class="kf-step-content">
                      <div class="kf-step-title-row">
                        <h2>Traffic Profile & Rate Limits</h2>
                        <span class="kf-step-badge">Step 2 of 3</span>
                      </div>

                      <!-- Rate Limit Banner -->
                      <div class="kf-rate-banner">
                        <mat-icon class="kf-rate-icon">speed</mat-icon>
                        <div>
                          <div class="kf-rate-title">
                            Default Enforced Limit: <strong>{{ service()?.rateLimitPerMinute }} req/min</strong>
                          </div>
                          <p class="kf-rate-sub">Established by provider policy. Higher limits can be requested below.</p>
                        </div>
                      </div>

                      <!-- Expected Baseline Grid -->
                      <div class="kf-grid-2">
                        <div class="kf-form-item">
                          <label class="kf-label" for="expDaily">Expected Requests / Day <span class="kf-req">*</span></label>
                          <input
                            id="expDaily"
                            type="number"
                            min="1"
                            class="kf-input"
                            [(ngModel)]="expectedRequestsPerDay"
                            placeholder="e.g. 25000"
                          />
                        </div>

                        <div class="kf-form-item">
                          <label class="kf-label" for="expPeak">Expected Peak / Minute <span class="kf-req">*</span></label>
                          <input
                            id="expPeak"
                            type="number"
                            min="1"
                            class="kf-input"
                            [(ngModel)]="expectedPeakPerMinute"
                            placeholder="e.g. 150"
                          />
                        </div>
                      </div>

                      <!-- Typical Regions -->
                      <div class="kf-form-item">
                        <label class="kf-label">Typical Request Regions</label>
                        <div class="kf-chips-row">
                          @for (region of availableRegions; track region.code) {
                            <button
                              type="button"
                              class="kf-chip"
                              [class.active]="isRegionSelected(region.code)"
                              (click)="toggleRegion(region.code)"
                            >
                              <mat-icon>{{ isRegionSelected(region.code) ? 'check' : 'add' }}</mat-icon>
                              <span>{{ region.label }}</span>
                            </button>
                          }
                        </div>
                      </div>

                      <!-- Higher Limit Request Toggle -->
                      <div class="kf-higher-limit-box">
                        <label class="kf-check-label">
                          <input type="checkbox" [(ngModel)]="requestHigherLimit" />
                          <span>Request a higher rate limit (Optional, pending approval)</span>
                        </label>

                        @if (requestHigherLimit) {
                          <div class="kf-higher-fields">
                            <div class="kf-form-item">
                              <label class="kf-label" for="reqLimit">Desired Limit (req/min)</label>
                              <input
                                id="reqLimit"
                                type="number"
                                class="kf-input"
                                [(ngModel)]="requestedRateLimit"
                                placeholder="e.g. 300"
                              />
                            </div>
                            <div class="kf-form-item">
                              <label class="kf-label" for="reqReason">Justification <span class="kf-req">*</span></label>
                              <textarea
                                id="reqReason"
                                class="kf-textarea"
                                rows="2"
                                [(ngModel)]="requestedRateLimitReason"
                                placeholder="Explain why your workload needs higher throughput..."
                              ></textarea>
                            </div>
                          </div>
                        }
                      </div>

                      <!-- Footer Actions -->
                      <div class="kf-actions">
                        <button mat-button class="kf-btn-back" (click)="prevStep()">
                          <mat-icon>arrow_back</mat-icon>
                          <span>Back</span>
                        </button>
                        <button mat-flat-button color="primary" class="kf-btn-next" (click)="nextStep()">
                          <span>Continue to Security</span>
                          <mat-icon>arrow_forward</mat-icon>
                        </button>
                      </div>
                    </div>
                  }

                  <!-- STEP 3: Security & Access -->
                  @if (currentStep() === 3) {
                    <div class="kf-step-content">
                      <div class="kf-step-title-row">
                        <h2>Access & Security Controls</h2>
                        <span class="kf-step-badge">Step 3 of 3</span>
                      </div>

                      <!-- Allowed Endpoints / Models -->
                      <div class="kf-form-item">
                        <label class="kf-label">Allowed Endpoints & HTTP Methods</label>
                        <div class="kf-endpoints-list">
                          @for (ep of endpointOptions; track ep.endpoint) {
                            <div class="kf-ep-card">
                              <div class="kf-ep-main">
                                <code class="kf-ep-path">{{ ep.endpoint }}</code>
                                <span class="kf-ep-name">{{ ep.name }}</span>
                              </div>
                              <div class="kf-ep-methods">
                                <label class="kf-method-tag">
                                  <input type="checkbox" [(ngModel)]="ep.readSelected" />
                                  <span>Read (GET)</span>
                                </label>
                                @if (ep.supportsWrite) {
                                  <label class="kf-method-tag">
                                    <input type="checkbox" [(ngModel)]="ep.writeSelected" />
                                    <span>Write (POST/PUT)</span>
                                  </label>
                                }
                              </div>
                            </div>
                          }
                        </div>
                      </div>

                      <!-- Key Expiration -->
                      <div class="kf-form-item">
                        <label class="kf-label">Key Expiration</label>
                        <div class="kf-expiry-pills">
                          @if (isExpiryOptionAllowed(30)) {
                            <button type="button" class="kf-exp-btn" [class.active]="expiryDays === 30" (click)="expiryDays = 30">30 Days</button>
                          }
                          @if (isExpiryOptionAllowed(90)) {
                            <button type="button" class="kf-exp-btn" [class.active]="expiryDays === 90" (click)="expiryDays = 90">90 Days</button>
                          }
                          @if (isExpiryOptionAllowed(180)) {
                            <button type="button" class="kf-exp-btn" [class.active]="expiryDays === 180" (click)="expiryDays = 180">180 Days</button>
                          }
                          @if (isExpiryOptionAllowed(365)) {
                            <button type="button" class="kf-exp-btn" [class.active]="expiryDays === 365" (click)="expiryDays = 365">1 Year</button>
                          }
                          @if (isExpiryOptionAllowed(0)) {
                            <button type="button" class="kf-exp-btn" [class.active]="expiryDays === 0" (click)="expiryDays = 0">Never</button>
                          }
                        </div>
                      </div>

                      <!-- Network / Origin Restrictions -->
                      <div class="kf-form-item">
                        <label class="kf-label">
                          @switch (clientType) {
                            @case ('server') { IP Allowlist (CIDR) }
                            @case ('browser') { Allowed Origins (CORS) }
                            @case ('mobile') { Application Bundle ID }
                            @case ('ci_batch') { Runner IP / Subnet }
                          }
                        </label>
                        <input
                          type="text"
                          class="kf-input"
                          [(ngModel)]="restrictionValue"
                          [placeholder]="getRestrictionPlaceholder()"
                        />
                        <span class="kf-input-helper">
                          @if (clientType === 'server' || clientType === 'ci_batch') {
                            Comma-separated IP addresses or CIDR blocks.
                          } @else if (clientType === 'browser') {
                            Origin URLs (e.g. https://app.example.com).
                          } @else {
                            Unique mobile app package identifier.
                          }
                        </span>
                      </div>

                      <!-- Footer Actions -->
                      <div class="kf-actions">
                        <button mat-button class="kf-btn-back" (click)="prevStep()" [disabled]="submitting()">
                          <mat-icon>arrow_back</mat-icon>
                          <span>Back</span>
                        </button>
                        <button
                          mat-flat-button
                          color="primary"
                          class="kf-btn-submit"
                          [disabled]="submitting() || !keyName.trim() || !ownerEmail.trim()"
                          (click)="submitProvisioning()"
                        >
                          @if (submitting()) {
                            <mat-spinner diameter="18"></mat-spinner>
                            <span>Generating...</span>
                          }
                          @if (!submitting()) {
                            <mat-icon>vpn_key</mat-icon>
                            <span>Issue API Key</span>
                          }
                        </button>
                      </div>
                    </div>
                  }
                </div>
              } @else {

                <!-- SUCCESS VIEW: Clean Key Revealed Screen -->
                <div class="kf-success-card">
                  <div class="kf-success-head">
                    <mat-icon class="kf-check-circle">check_circle</mat-icon>
                    <div>
                      <h2>API Key Created Successfully</h2>
                      <p>Save this key immediately. For security, it cannot be shown again.</p>
                    </div>
                  </div>

                  <!-- Key Reveal Box -->
                  <div class="kf-key-box">
                    <code class="kf-key-code">{{ provisionedKey()?.fullKey }}</code>
                    <button mat-flat-button color="primary" class="kf-copy-btn" (click)="copySecret()">
                      <mat-icon>{{ copied() ? 'check' : 'content_copy' }}</mat-icon>
                      <span>{{ copied() ? 'Copied' : 'Copy Key' }}</span>
                    </button>
                  </div>

                  <!-- Key Metadata Table -->
                  <div class="kf-meta-grid">
                    <div class="kf-meta-item">
                      <span class="kf-meta-label">Key Name</span>
                      <strong>{{ provisionedKey()?.apiKey?.name }}</strong>
                    </div>
                    <div class="kf-meta-item">
                      <span class="kf-meta-label">Environment</span>
                      <span>{{ environment }}</span>
                    </div>
                    <div class="kf-meta-item">
                      <span class="kf-meta-label">Prefix</span>
                      <code>{{ provisionedKey()?.apiKey?.keyPrefix }}...</code>
                    </div>
                    <div class="kf-meta-item">
                      <span class="kf-meta-label">Rate Limit</span>
                      <strong>{{ provisionedKey()?.apiKey?.rateLimitPerMinute }} req/min</strong>
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="kf-success-actions">
                    <button mat-stroked-button class="kf-btn-keys" (click)="goToSubscribedKeys()">
                      <mat-icon>vpn_key</mat-icon>
                      <span>View in My API Keys</span>
                    </button>
                    <button mat-flat-button color="primary" class="kf-btn-done" (click)="goBack()">
                      <span>Return to Marketplace</span>
                    </button>
                  </div>
                </div>
              }

            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .kf-sub-page {
      background: #f8fafc;
      min-height: calc(100vh - 60px);
      padding: 24px 32px 64px 32px;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    .kf-sub-container {
      max-width: 1160px;
      margin: 0 auto;
    }

    /* Top Bar & Breadcrumbs */
    .kf-sub-topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .kf-back-link {
      color: #4f46e5 !important;
      font-weight: 600 !important;
      font-size: 13px !important;
      padding: 0 8px !important;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .kf-sub-breadcrumbs {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12.5px;
      color: #64748b;
    }

    .kf-sub-breadcrumbs mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .kf-sub-breadcrumbs .active {
      color: #0f172a;
      font-weight: 600;
    }

    /* Header */
    .kf-page-header {
      margin-bottom: 24px;
    }

    .kf-title {
      font-size: 24px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 4px 0;
      letter-spacing: -0.3px;
    }

    .kf-subtitle {
      font-size: 14px;
      color: #64748b;
      margin: 0;
    }

    /* 2-Column Layout */
    .kf-page-layout {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 24px;
      align-items: start;
    }

    @media (max-width: 900px) {
      .kf-page-layout {
        grid-template-columns: 1fr;
      }
    }

    /* Left Sidebar: Service Overview Card */
    .kf-service-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .kf-service-head {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-bottom: 16px;
    }

    .kf-service-icon {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      background: #eef2ff;
      color: #4f46e5;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .kf-cat-tag {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #4f46e5;
      background: #eef2ff;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .kf-service-name {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin: 4px 0 0 0;
      line-height: 1.3;
    }

    .kf-provider-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-top: 1px solid #f1f5f9;
      border-bottom: 1px solid #f1f5f9;
      margin-bottom: 12px;
    }

    .kf-provider-value {
      display: flex;
      align-items: center;
      gap: 4px;
      font-weight: 600;
      font-size: 13px;
      color: #0f172a;
    }

    .kf-verified-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #2563eb;
    }

    .kf-spec-table {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 14px;
    }

    .kf-spec-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12.5px;
    }

    .kf-spec-label {
      color: #64748b;
      font-weight: 500;
    }

    .kf-spec-val {
      color: #0f172a;
    }

    .kf-endpoint-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 14px;
    }

    .kf-endpoint-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .kf-mini-copy {
      width: 24px !important;
      height: 24px !important;
      padding: 0 !important;
    }

    .kf-mini-copy mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: #64748b;
    }

    .kf-endpoint-code {
      font-size: 11.5px;
      color: #0f172a;
      word-break: break-all;
      font-family: monospace;
    }

    .kf-service-desc {
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
      margin: 0;
    }

    /* Right Column: Stepper */
    .kf-stepper {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      background: #ffffff;
      padding: 12px 20px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
    }

    .kf-step {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      opacity: 0.5;
      transition: opacity 0.2s;
    }

    .kf-step.active, .kf-step.done {
      opacity: 1;
    }

    .kf-step-num {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #f1f5f9;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
    }

    .kf-step.active .kf-step-num {
      background: #4f46e5;
      color: #ffffff;
    }

    .kf-step.done .kf-step-num {
      background: #10b981;
      color: #ffffff;
    }

    .kf-step.done .kf-step-num mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .kf-step-text {
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
    }

    .kf-step-line {
      flex: 1;
      height: 2px;
      background: #e2e8f0;
    }

    .kf-step-line.done {
      background: #10b981;
    }

    /* Form Card */
    .kf-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px 28px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .kf-step-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid #f1f5f9;
    }

    .kf-step-title-row h2 {
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .kf-step-badge {
      font-size: 11.5px;
      font-weight: 600;
      color: #64748b;
      background: #f1f5f9;
      padding: 3px 8px;
      border-radius: 6px;
    }

    .kf-form-item {
      margin-bottom: 18px;
    }

    .kf-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 6px;
    }

    .kf-req {
      color: #ef4444;
    }

    .kf-input {
      width: 100%;
      height: 40px;
      padding: 0 12px;
      font-size: 13.5px;
      color: #0f172a;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .kf-input:focus {
      border-color: #4f46e5;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
    }

    .kf-input-helper {
      display: block;
      font-size: 11.5px;
      color: #64748b;
      margin-top: 4px;
    }

    /* Segmented Environment Control */
    .kf-env-segmented {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }

    .kf-env-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 42px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s;
      padding: 0 12px;
    }

    .kf-env-btn.active {
      border-color: #4f46e5;
      background: #eef2ff;
    }

    .kf-env-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .kf-env-dot--live { background: #3b82f6; }
    .kf-env-dot--staging { background: #f59e0b; }
    .kf-env-dot--dev { background: #10b981; }

    .kf-env-label {
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
    }

    .kf-env-code {
      font-size: 11px;
      color: #64748b;
      font-family: monospace;
    }

    /* Client Grid */
    .kf-client-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }

    .kf-client-pill {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 42px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      color: #475569;
      transition: all 0.15s;
    }

    .kf-client-pill mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #64748b;
    }

    .kf-client-pill.active {
      border-color: #4f46e5;
      background: #eef2ff;
      color: #4f46e5;
    }

    .kf-client-pill.active mat-icon {
      color: #4f46e5;
    }

    /* Actions */
    .kf-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #f1f5f9;
    }

    .kf-btn-next, .kf-btn-submit {
      height: 40px !important;
      padding: 0 18px !important;
      border-radius: 8px !important;
      font-weight: 600 !important;
      font-size: 13.5px !important;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .kf-btn-back {
      color: #64748b !important;
      font-weight: 600 !important;
      font-size: 13px !important;
    }

    /* Step 2: Rate Banner */
    .kf-rate-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 18px;
    }

    .kf-rate-icon {
      color: #16a34a;
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .kf-rate-title {
      font-size: 13.5px;
      color: #15803d;
    }

    .kf-rate-sub {
      font-size: 12px;
      color: #166534;
      margin: 2px 0 0 0;
    }

    .kf-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    /* Chips Row */
    .kf-chips-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .kf-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 20px;
      font-size: 12.5px;
      font-weight: 500;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s;
    }

    .kf-chip mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .kf-chip.active {
      background: #eef2ff;
      border-color: #4f46e5;
      color: #4f46e5;
    }

    /* Higher Limit Box */
    .kf-higher-limit-box {
      margin-top: 14px;
      padding: 12px 14px;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      background: #fafafa;
    }

    .kf-check-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
      cursor: pointer;
    }

    .kf-higher-fields {
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
    }

    .kf-textarea {
      width: 100%;
      padding: 8px 12px;
      font-size: 13px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      box-sizing: border-box;
      outline: none;
      font-family: inherit;
    }

    .kf-textarea:focus {
      border-color: #4f46e5;
    }

    /* Step 3: Endpoints */
    .kf-endpoints-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .kf-ep-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }

    .kf-ep-main {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .kf-ep-path {
      font-size: 12.5px;
      font-weight: 600;
      color: #0f172a;
      font-family: monospace;
    }

    .kf-ep-name {
      font-size: 11.5px;
      color: #64748b;
    }

    .kf-ep-methods {
      display: flex;
      gap: 12px;
    }

    .kf-method-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #334155;
      cursor: pointer;
    }

    /* Expiry Pills */
    .kf-expiry-pills {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .kf-exp-btn {
      padding: 6px 14px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 12.5px;
      font-weight: 500;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s;
    }

    .kf-exp-btn.active {
      background: #eef2ff;
      border-color: #4f46e5;
      color: #4f46e5;
      font-weight: 600;
    }

    /* Success Card */
    .kf-success-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 28px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .kf-success-head {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 20px;
    }

    .kf-check-circle {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: #10b981;
    }

    .kf-success-head h2 {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 4px 0;
    }

    .kf-success-head p {
      font-size: 13px;
      color: #64748b;
      margin: 0;
    }

    .kf-key-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0f172a;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 20px;
    }

    .kf-key-code {
      font-size: 14px;
      color: #38bdf8;
      font-family: monospace;
      font-weight: 600;
    }

    .kf-copy-btn {
      height: 36px !important;
      border-radius: 6px !important;
    }

    .kf-meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      background: #f8fafc;
      padding: 14px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      margin-bottom: 20px;
    }

    .kf-meta-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 12.5px;
    }

    .kf-meta-label {
      color: #64748b;
      font-size: 11px;
    }

    .kf-success-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .kf-btn-keys, .kf-btn-done {
      height: 40px !important;
      border-radius: 8px !important;
      font-weight: 600 !important;
    }

    .kf-page-loading, .kf-error-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 48px;
      text-align: center;
    }
  `],
})
export class SubscribePageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly marketplaceService = inject(MarketplaceService);
  private readonly snackBar = inject(MatSnackBar);

  service = signal<ServiceListing | null>(null);
  loadingService = signal<boolean>(true);
  currentStep = signal<number>(1);
  submitting = signal<boolean>(false);
  copied = signal<boolean>(false);
  provisionedKey = signal<ApiKeyCreatedResponse | null>(null);

  // STEP 1 Form State
  keyName = '';
  environment: 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT' = 'PRODUCTION';
  ownerEmail = '';
  clientType: 'server' | 'browser' | 'mobile' | 'ci_batch' = 'server';

  // STEP 2 Form State (Usage & Limits)
  expectedRequestsPerDay: number = 25000;
  expectedPeakPerMinute: number = 150;
  selectedRegions: string[] = ['US', 'EU'];
  availableRegions = [
    { code: 'US', label: 'North America (US/CA)' },
    { code: 'EU', label: 'Europe (EU/UK)' },
    { code: 'APAC', label: 'Asia-Pacific (APAC)' },
    { code: 'LATAM', label: 'Latin America (LATAM)' },
    { code: 'IN', label: 'India (IN)' },
    { code: 'GLOBAL', label: 'Global (Worldwide CDN)' },
  ];
  requestHigherLimit = false;
  requestedRateLimit = 120;
  requestedRateLimitReason = '';

  // STEP 3 Form State (Access and Security)
  endpointOptions: EndpointModelOption[] = [
    {
      endpoint: '/v1/chat/completions',
      name: 'Conversational Inference & Function Calling',
      supportsWrite: true,
      readSelected: false,
      writeSelected: false,
    },
    {
      endpoint: '/v1/embeddings',
      name: 'Vector Embeddings & Semantic Search',
      supportsWrite: true,
      readSelected: false,
      writeSelected: false,
    },
    {
      endpoint: '/v1/models',
      name: 'Catalog Introspection & Model Metadata',
      supportsWrite: false,
      readSelected: false,
      writeSelected: false,
    },
  ];

  // Existing scopes (Unchecked by default)
  scopes: string[] = [];

  // Expiry (90 days default)
  expiryDays = 90;
  allowNeverExpires = false; // Provider policy flag

  // Rotation grace-period length (Default 24 hours)
  rotationGraceHours = 24;

  // Restrictions
  restrictionValue = '';

  // Advanced collapsed
  showAdvanced = false;
  spendCapUsd?: number;
  alertChannel: 'EMAIL' | 'WEBHOOK' = 'EMAIL';
  alertWebhookUrl = '';
  riskAction: 'ALERT_ONLY' | 'THROTTLE' | 'AUTO_SUSPEND' = 'ALERT_ONLY';
  tags = '';

  ngOnInit(): void {
    const serviceId = this.route.snapshot.paramMap.get('id');
    if (!serviceId) {
      this.loadingService.set(false);
      return;
    }

    this.marketplaceService.getServiceById(serviceId).subscribe({
      next: (item) => {
        this.service.set(item);
        const defLimit = item.defaultRateLimit || item.rateLimitPerMinute || 60;
        const maxLimit = item.maxRateLimit || Math.max(defLimit * 5, 1000);
        this.requestedRateLimit = Math.min(defLimit * 2, maxLimit);
        this.allowNeverExpires = item.allowNeverExpires ?? false;
        const maxExp = item.maxExpiryDays ?? 365;
        if (this.expiryDays > maxExp) {
          this.expiryDays = maxExp;
        }
        this.loadingService.set(false);
      },
      error: () => {
        this.loadingService.set(false);
      },
    });
  }

  isScopeAllowedByProvider(scope: string): boolean {
    const s = this.service();
    if (!s || !s.allowedScopes || !s.allowedScopes.trim()) return true;
    return s.allowedScopes.toUpperCase().includes(scope.toUpperCase());
  }

  isExpiryOptionAllowed(days: number): boolean {
    if (days === 0) return this.allowNeverExpires;
    const maxExp = this.service()?.maxExpiryDays || 365;
    return days <= maxExp;
  }

  setClientType(type: 'server' | 'browser' | 'mobile' | 'ci_batch'): void {
    this.clientType = type;
    this.restrictionValue = '';
  }

  getRestrictionPlaceholder(): string {
    switch (this.clientType) {
      case 'server':
      case 'ci_batch':
        return 'e.g. 192.168.1.50/32, 10.0.0.0/16';
      case 'browser':
        return 'e.g. https://app.yourdomain.com';
      case 'mobile':
        return 'e.g. com.company.myapp';
    }
  }

  isWildcardIpEntered(): boolean {
    if (this.clientType !== 'server' && this.clientType !== 'ci_batch') return false;
    return this.restrictionValue.includes('0.0.0.0/0');
  }

  isRegionSelected(code: string): boolean {
    return this.selectedRegions.includes(code);
  }

  toggleRegion(code: string): void {
    if (this.isRegionSelected(code)) {
      this.selectedRegions = this.selectedRegions.filter(r => r !== code);
    } else {
      this.selectedRegions.push(code);
    }
  }

  goToStep(step: number): void {
    if (step > 1 && (!this.keyName.trim() || !this.ownerEmail.trim())) {
      this.snackBar.open('Please specify Key Name and Owner Contact Email', undefined, { duration: 2500 });
      return;
    }
    this.currentStep.set(step);
  }

  nextStep(): void {
    if (this.currentStep() === 1 && (!this.keyName.trim() || !this.ownerEmail.trim())) {
      return;
    }
    if (this.currentStep() === 2 && this.requestHigherLimit) {
      if (!this.requestedRateLimitReason.trim()) {
        this.snackBar.open('Please provide a justification for requesting a higher rate limit', undefined, { duration: 3000 });
        return;
      }
      const maxLimit = this.service()?.maxRateLimit || 1000;
      if (this.requestedRateLimit > maxLimit) {
        this.snackBar.open(`Requested limit cannot exceed provider ceiling of ${maxLimit} req/min`, undefined, { duration: 3500 });
        return;
      }
    }
    this.currentStep.update(s => Math.min(3, s + 1));
  }

  prevStep(): void {
    this.currentStep.update(s => Math.max(1, s - 1));
  }

  submitProvisioning(): void {
    const s = this.service();
    if (!s || !this.keyName.trim() || !this.ownerEmail.trim()) return;

    // Validate provider policy: IP allowlist for production
    if (s.requireIpAllowlistForProduction && this.environment === 'PRODUCTION') {
      if (this.clientType === 'server' || this.clientType === 'ci_batch') {
        if (!this.restrictionValue.trim() || this.isWildcardIpEntered()) {
          this.snackBar.open('Provider policy requires an explicit IP allowlist for Production keys ("0.0.0.0/0" is prohibited)', 'Dismiss', { duration: 4500 });
          return;
        }
      }
    }

    // Validate provider policy: Expiry
    if (this.expiryDays > (s.maxExpiryDays || 365)) {
      this.snackBar.open(`Expiry period cannot exceed provider maximum of ${s.maxExpiryDays || 365} days`, 'Dismiss', { duration: 3500 });
      return;
    }

    if (this.expiryDays === 0 && !this.allowNeverExpires) {
      this.snackBar.open('Provider policy does not allow non-expiring keys. Please select an expiry duration.', 'Dismiss', { duration: 3500 });
      return;
    }

    this.submitting.set(true);

    let expiresAt: string | null = null;
    if (this.expiryDays > 0) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + this.expiryDays);
      expiresAt = expDate.toISOString();
    }

    const allowedEndpoints: DeclaredEndpointPermission[] = this.endpointOptions
      .filter(ep => ep.readSelected || ep.writeSelected)
      .map(ep => {
        const methods: string[] = [];
        if (ep.readSelected) methods.push('GET', 'HEAD');
        if (ep.writeSelected) methods.push('POST', 'PUT', 'DELETE');
        return { endpoint: ep.endpoint, methods };
      });

    const payload: SubscribeServiceRequest = {
      applicationName: this.keyName.trim(),
      environment: this.environment,
      ownerEmail: this.ownerEmail.trim(),
      clientType: this.clientType,
      expectedRequestsPerDay: this.expectedRequestsPerDay,
      expectedPeakPerMinute: this.expectedPeakPerMinute,
      typicalRegions: this.selectedRegions,
      requestedRateLimit: this.requestHigherLimit ? this.requestedRateLimit : undefined,
      requestedRateLimitReason: this.requestHigherLimit ? this.requestedRateLimitReason.trim() : undefined,
      expiresAt,
      rotationGracePeriodSeconds: this.rotationGraceHours * 3600,
      restrictions: this.restrictionValue.trim() || undefined,
      allowedEndpoints: allowedEndpoints.length > 0 ? allowedEndpoints : undefined,
      scopes: this.scopes,
      spendCapUsd: this.spendCapUsd,
      alertChannel: this.alertChannel,
      alertWebhookUrl: this.alertChannel === 'WEBHOOK' ? this.alertWebhookUrl.trim() : undefined,
      riskAction: this.riskAction,
      tags: this.tags.trim() || undefined,
      rateLimitPerMinute: s.rateLimitPerMinute,
      allowedIps: (this.clientType === 'server' || this.clientType === 'ci_batch') ? this.restrictionValue.trim() : undefined,
    };

    this.marketplaceService.subscribe(s.id, payload).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.provisionedKey.set(res);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err) => {
        this.submitting.set(false);
        const msg = err.error?.message || 'Failed to provision API credential';
        this.snackBar.open(msg, 'Dismiss', { duration: 4000 });
      },
    });
  }

  copySecret(): void {
    const key = this.provisionedKey()?.fullKey;
    if (!key) return;

    navigator.clipboard.writeText(key).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 3000);
      this.snackBar.open('Copied API key to clipboard', undefined, { duration: 2500 });
    });
  }

  copyText(text: string): void {
    navigator.clipboard.writeText(text);
    this.snackBar.open(`Copied to clipboard`, undefined, { duration: 2500 });
  }

  goBack(): void {
    this.router.navigate(['/marketplace']);
  }

  goToPlayground(): void {
    const s = this.service();
    const key = this.provisionedKey()?.fullKey;
    this.router.navigate(['/playground'], {
      queryParams: {
        serviceId: s?.id,
        key: key || undefined,
      },
    });
  }

  goToSubscribedKeys(): void {
    this.router.navigate(['/subscribed-keys']);
  }

  getCategoryIcon(category: string): string {
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
