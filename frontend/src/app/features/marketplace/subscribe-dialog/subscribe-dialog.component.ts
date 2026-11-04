import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ServiceListing, SubscribeServiceRequest } from '../../../core/models/marketplace.model';
import { MarketplaceService } from '../../../core/services/marketplace.service';
import { ApiKeyCreatedResponse } from '../../../core/models/api-key.model';

export interface SubscribeDialogData {
  service: ServiceListing;
}

@Component({
  selector: 'kf-subscribe-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="kf-sub-dialog">
      <!-- Dialog Header -->
      <div class="kf-dialog-header">
        <div class="kf-header-left">
          <div class="kf-service-avatar">
            <mat-icon>{{ getCategoryIcon(data.service.category) }}</mat-icon>
          </div>
          <div>
            <div class="kf-dialog-badge">
              <span class="kf-pulse-dot"></span>
              <span>API KEY PROVISIONING WIZARD</span>
            </div>
            <h2 class="kf-dialog-title">Subscribe to {{ data.service.name }}</h2>
            <p class="kf-dialog-subtitle">Configure governance, environment tier, and rate limit quotas</p>
          </div>
        </div>
        <button mat-icon-button class="kf-close-btn" (click)="closeDialog()" aria-label="Close dialog">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Step Navigation Indicator (Hidden on Key Revealed Step) -->
      @if (!provisionedKey()) {
        <div class="kf-steps-nav">
          <div class="kf-step-item" [class.active]="currentStep() === 1" [class.completed]="currentStep() > 1" (click)="goToStep(1)">
            <span class="kf-step-number">1</span>
            <span class="kf-step-label">Application</span>
          </div>
          <div class="kf-step-divider" [class.active]="currentStep() > 1"></div>
          <div class="kf-step-item" [class.active]="currentStep() === 2" [class.completed]="currentStep() > 2" (click)="goToStep(2)">
            <span class="kf-step-number">2</span>
            <span class="kf-step-label">Quota & SLA</span>
          </div>
          <div class="kf-step-divider" [class.active]="currentStep() > 2"></div>
          <div class="kf-step-item" [class.active]="currentStep() === 3" (click)="goToStep(3)">
            <span class="kf-step-number">3</span>
            <span class="kf-step-label">Security & Scopes</span>
          </div>
        </div>
      }

      <!-- Step 1: Workload & Environment -->
      @if (currentStep() === 1 && !provisionedKey()) {
        <div class="kf-step-body">
          <!-- Service Metadata Summary Card -->
          <div class="kf-service-summary-card">
            <div class="kf-summary-row">
              <span class="kf-summary-label">Target Service:</span>
              <strong class="kf-summary-val">{{ data.service.name }}</strong>
            </div>
            <div class="kf-summary-row">
              <span class="kf-summary-label">Provider:</span>
              <span class="kf-summary-val">{{ data.service.providerName }}</span>
            </div>
            <div class="kf-summary-row">
              <span class="kf-summary-label">Gateway Target:</span>
              <code class="kf-summary-code">{{ data.service.endpointUrl }}</code>
            </div>
          </div>

          <!-- Application Name -->
          <div class="kf-form-group">
            <label class="kf-label" for="appName">
              <span>Application / Service Client Name</span>
              <span class="kf-required">*</span>
            </label>
            <p class="kf-hint">Provide an identifiable name for this credential in audit logs and metrics.</p>
            <input
              id="appName"
              type="text"
              class="kf-input"
              [(ngModel)]="applicationName"
              placeholder="e.g. Customer Support AI Bot, Logistics Engine"
              required
            />
          </div>

          <!-- Deployment Environment -->
          <div class="kf-form-group">
            <label class="kf-label">Deployment Environment</label>
            <p class="kf-hint">Select the lifecycle stage. This controls key prefix formatting and monitoring policies.</p>
            <div class="kf-env-grid">
              <div
                class="kf-env-card"
                [class.selected]="environment === 'PRODUCTION'"
                (click)="environment = 'PRODUCTION'"
              >
                <div class="kf-env-header">
                  <span class="kf-env-radio" [class.checked]="environment === 'PRODUCTION'"></span>
                  <strong>Production</strong>
                  <span class="kf-prefix-pill">kf_live_...</span>
                </div>
                <p>Live user-facing systems. Strict monitoring, SLA tracking, and audit logging.</p>
              </div>

              <div
                class="kf-env-card"
                [class.selected]="environment === 'STAGING'"
                (click)="environment = 'STAGING'"
              >
                <div class="kf-env-header">
                  <span class="kf-env-radio" [class.checked]="environment === 'STAGING'"></span>
                  <strong>Staging</strong>
                  <span class="kf-prefix-pill">kf_test_...</span>
                </div>
                <p>Pre-release staging environments and CI/CD automated test suites.</p>
              </div>

              <div
                class="kf-env-card"
                [class.selected]="environment === 'DEVELOPMENT'"
                (click)="environment = 'DEVELOPMENT'"
              >
                <div class="kf-env-header">
                  <span class="kf-env-radio" [class.checked]="environment === 'DEVELOPMENT'"></span>
                  <strong>Development</strong>
                  <span class="kf-prefix-pill">kf_test_...</span>
                </div>
                <p>Local workstations, sandbox playground experiments, and prototyping.</p>
              </div>
            </div>
          </div>

          <!-- Optional Notes -->
          <div class="kf-form-group">
            <label class="kf-label" for="appDesc">Workload Description (Optional)</label>
            <textarea
              id="appDesc"
              class="kf-textarea"
              rows="2"
              [(ngModel)]="description"
              placeholder="Brief context regarding how your service will consume this API..."
            ></textarea>
          </div>
        </div>
      }

      <!-- Step 2: Quota & SLA Tier -->
      @if (currentStep() === 2 && !provisionedKey()) {
        <div class="kf-step-body">
          <div class="kf-section-intro">
            <h4>Traffic Quotas & Throughput Limits</h4>
            <p>Define request rate boundaries to prevent inadvertent throttling and guarantee service uptime.</p>
          </div>

          <!-- Provider Default Callout -->
          <div class="kf-quota-highlight">
            <div class="kf-quota-icon">
              <mat-icon>speed</mat-icon>
            </div>
            <div class="kf-quota-content">
              <h5>Provider Base Capacity</h5>
              <p>The provider offers <strong>{{ data.service.rateLimitPerMinute }} requests/minute</strong> by default under the <strong>{{ data.service.pricingTier || 'Free Developer' }}</strong> tier.</p>
            </div>
          </div>

          <!-- Tier Choices -->
          <div class="kf-form-group">
            <label class="kf-label">Allocated Request Limit</label>
            <div class="kf-tier-options">
              <div
                class="kf-tier-item"
                [class.selected]="selectedRateLimit === data.service.rateLimitPerMinute"
                (click)="selectedRateLimit = data.service.rateLimitPerMinute"
              >
                <div class="kf-tier-top">
                  <span class="kf-env-radio" [class.checked]="selectedRateLimit === data.service.rateLimitPerMinute"></span>
                  <strong>Standard Developer Limit</strong>
                  <span class="kf-tier-value">{{ data.service.rateLimitPerMinute }} req/min</span>
                </div>
                <p class="kf-tier-sub">Recommended for prototyping, background jobs, and small teams.</p>
              </div>

              <div
                class="kf-tier-item"
                [class.selected]="selectedRateLimit === data.service.rateLimitPerMinute * 2"
                (click)="selectedRateLimit = data.service.rateLimitPerMinute * 2"
              >
                <div class="kf-tier-top">
                  <span class="kf-env-radio" [class.checked]="selectedRateLimit === data.service.rateLimitPerMinute * 2"></span>
                  <strong>High Throughput Burst</strong>
                  <span class="kf-tier-value">{{ data.service.rateLimitPerMinute * 2 }} req/min</span>
                </div>
                <p class="kf-tier-sub">Elevated capacity for batch workloads and parallel user sessions.</p>
              </div>
            </div>
          </div>

          <!-- SLA Features Box -->
          <div class="kf-sla-box">
            <div class="kf-sla-item">
              <mat-icon class="kf-check-icon">verified</mat-icon>
              <div>
                <strong>99.9% Uptime Guarantee</strong>
                <span>Fault-tolerant reverse proxy gateway routing</span>
              </div>
            </div>
            <div class="kf-sla-item">
              <mat-icon class="kf-check-icon">verified</mat-icon>
              <div>
                <strong>Sliding Window Throttling</strong>
                <span>Graceful HTTP 429 response handling without service interruption</span>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Step 3: Security & Scopes -->
      @if (currentStep() === 3 && !provisionedKey()) {
        <div class="kf-step-body">
          <div class="kf-section-intro">
            <h4>Security Guardrails & Key Governance</h4>
            <p>Enforce the principle of least privilege and schedule cryptographic key rotation.</p>
          </div>

          <!-- Expiration Setting -->
          <div class="kf-form-group">
            <label class="kf-label">Credential Expiry Period</label>
            <p class="kf-hint">Keys should be rotated periodically according to enterprise compliance standards.</p>
            <div class="kf-expiry-grid">
              @for (opt of expiryOptions; track opt.days) {
                <div
                  class="kf-expiry-btn"
                  [class.selected]="expiryDays === opt.days"
                  (click)="expiryDays = opt.days"
                >
                  <strong>{{ opt.label }}</strong>
                  <span>{{ opt.sub }}</span>
                </div>
              }
            </div>
          </div>

          <!-- Scope Authorization -->
          <div class="kf-form-group">
            <label class="kf-label">Granted Permissions (Scopes)</label>
            <p class="kf-hint">Limit what this API credential is authorized to perform within your workspace.</p>
            <div class="kf-scopes-list">
              <label class="kf-scope-row" [class.checked]="hasScope('READ_ANALYTICS')">
                <input
                  type="checkbox"
                  [checked]="hasScope('READ_ANALYTICS')"
                  (change)="toggleScope('READ_ANALYTICS')"
                />
                <div class="kf-scope-text">
                  <strong>READ_ANALYTICS</strong>
                  <span>Allow querying invocation analytics, token counts, and latency telemetry.</span>
                </div>
              </label>

              <label class="kf-scope-row" [class.checked]="hasScope('READ_PROJECTS')">
                <input
                  type="checkbox"
                  [checked]="hasScope('READ_PROJECTS')"
                  (change)="toggleScope('READ_PROJECTS')"
                />
                <div class="kf-scope-text">
                  <strong>READ_PROJECTS</strong>
                  <span>Permit reading project identity and organization routing metadata.</span>
                </div>
              </label>

              <label class="kf-scope-row" [class.checked]="hasScope('WRITE_PROJECTS')">
                <input
                  type="checkbox"
                  [checked]="hasScope('WRITE_PROJECTS')"
                  (change)="toggleScope('WRITE_PROJECTS')"
                />
                <div class="kf-scope-text">
                  <strong>WRITE_PROJECTS</strong>
                  <span>Permit configuring and updating upstream downstream endpoint configurations.</span>
                </div>
              </label>
            </div>
          </div>

          <!-- IP Allowlist -->
          <div class="kf-form-group">
            <label class="kf-label" for="ipAllow">Allowed Origin CIDR / IP Whitelist (Optional)</label>
            <input
              id="ipAllow"
              type="text"
              class="kf-input"
              [(ngModel)]="allowedIps"
              placeholder="e.g. 0.0.0.0/0 (Global) or 192.168.1.50"
            />
          </div>
        </div>
      }

      <!-- Step 4: Key Successfully Provisioned -->
      @if (provisionedKey()) {
        <div class="kf-step-body kf-step-revealed">
          <div class="kf-success-badge">
            <mat-icon>verified</mat-icon>
            <span>API KEY PROVISIONED & ACTIVATED</span>
          </div>

          <h3 class="kf-revealed-title">Secret Credential Issued</h3>

          <!-- One-Time Warning Banner -->
          <div class="kf-warning-box">
            <mat-icon>warning</mat-icon>
            <div>
              <strong>Store this secret key now</strong>
              <p>For your security, KeyForge stores only a one-way cryptographic SHA-256 hash. <strong>You will not be able to retrieve or view this plaintext secret again.</strong></p>
            </div>
          </div>

          <!-- Secret Key Display Box -->
          <div class="kf-secret-box">
            <div class="kf-secret-content">
              <span class="kf-secret-label">Plaintext Secret:</span>
              <code class="kf-secret-code">{{ provisionedKey()?.fullKey }}</code>
            </div>
            <button
              mat-flat-button
              class="kf-copy-secret-btn"
              [class.copied]="copied()"
              (click)="copySecret()"
            >
              <mat-icon>{{ copied() ? 'check' : 'content_copy' }}</mat-icon>
              <span>{{ copied() ? 'Copied to Clipboard' : 'Copy Key' }}</span>
            </button>
          </div>

          <!-- Key Metadata Grid -->
          <div class="kf-meta-recap">
            <div class="kf-meta-cell">
              <span class="kf-cell-label">Key Name</span>
              <span class="kf-cell-val">{{ provisionedKey()?.apiKey?.name }}</span>
            </div>
            <div class="kf-meta-cell">
              <span class="kf-cell-label">Environment</span>
              <span class="kf-cell-val kf-badge-env">{{ environment }}</span>
            </div>
            <div class="kf-meta-cell">
              <span class="kf-cell-label">Key Prefix</span>
              <span class="kf-cell-val font-mono">{{ provisionedKey()?.apiKey?.keyPrefix }}...</span>
            </div>
            <div class="kf-meta-cell">
              <span class="kf-cell-label">Rate Limit</span>
              <span class="kf-cell-val">{{ provisionedKey()?.apiKey?.rateLimitPerMinute }} req/min</span>
            </div>
            <div class="kf-meta-cell">
              <span class="kf-cell-label">Status</span>
              <span class="kf-cell-val kf-badge-active">ACTIVE</span>
            </div>
            <div class="kf-meta-cell">
              <span class="kf-cell-label">Expiry Date</span>
              <span class="kf-cell-val">{{ formatExpiry(provisionedKey()?.apiKey?.expiresAt) }}</span>
            </div>
          </div>
        </div>
      }

      <!-- Dialog Footer Actions -->
      <div class="kf-dialog-footer">
        @if (!provisionedKey()) {
          <div class="kf-footer-left">
            @if (currentStep() > 1) {
              <button mat-button class="kf-btn-secondary" (click)="prevStep()" [disabled]="submitting()">
                <mat-icon>arrow_back</mat-icon>
                <span>Back</span>
              </button>
            }
          </div>
          <div class="kf-footer-right">
            <button mat-button class="kf-btn-cancel" (click)="closeDialog()" [disabled]="submitting()">
              Cancel
            </button>

            @if (currentStep() < 3) {
              <button
                mat-flat-button
                color="primary"
                class="kf-btn-next"
                (click)="nextStep()"
                [disabled]="currentStep() === 1 && !applicationName.trim()"
              >
                <span>Continue</span>
                <mat-icon>arrow_forward</mat-icon>
              </button>
            } @else {
              <button
                mat-flat-button
                color="primary"
                class="kf-btn-provision"
                (click)="submitProvisioning()"
                [disabled]="submitting() || !applicationName.trim()"
              >
                @if (submitting()) {
                  <mat-spinner diameter="18"></mat-spinner>
                  <span>Provisioning Key...</span>
                } @else {
                  <ng-container>
                    <mat-icon>key</mat-icon>
                    <span>Provision API Key</span>
                  </ng-container>
                }
              </button>
            }
          </div>
        } @else {
          <!-- Key revealed actions -->
          <div class="kf-revealed-actions">
            <button mat-stroked-button class="kf-action-btn" (click)="goToPlayground()">
              <mat-icon>terminal</mat-icon>
              <span>Test in API Playground</span>
            </button>
            <button mat-stroked-button class="kf-action-btn" (click)="goToSubscribedKeys()">
              <mat-icon>vpn_key</mat-icon>
              <span>Manage in My Subscribed Keys</span>
            </button>
            <button mat-flat-button color="primary" class="kf-action-done" (click)="closeDialog()">
              Done
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .kf-sub-dialog {
      background: #ffffff;
      color: #0f172a;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      width: 100%;
    }

    /* Dialog Header */
    .kf-dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 28px 20px 28px;
      border-bottom: 1px solid #f1f5f9;
    }

    .kf-header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .kf-service-avatar {
      width: 46px;
      height: 46px;
      border-radius: 12px;
      background: #eef2ff;
      border: 1px solid #e0e7ff;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #4f46e5;
    }

    .kf-service-avatar mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .kf-dialog-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 10.5px;
      font-weight: 700;
      color: #4f46e5;
      background: #eef2ff;
      padding: 2px 8px;
      border-radius: 9999px;
      margin-bottom: 4px;
    }

    .kf-pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
    }

    .kf-dialog-title {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
      line-height: 1.3;
    }

    .kf-dialog-subtitle {
      font-size: 13px;
      color: #64748b;
      margin: 2px 0 0 0;
    }

    .kf-close-btn {
      color: #94a3b8;
    }

    .kf-close-btn:hover {
      color: #0f172a;
    }

    /* Step Indicator */
    .kf-steps-nav {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px 28px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      gap: 12px;
    }

    .kf-step-item {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      opacity: 0.6;
      transition: all 0.2s ease;
    }

    .kf-step-item.active {
      opacity: 1;
    }

    .kf-step-item.completed {
      opacity: 0.9;
    }

    .kf-step-number {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #e2e8f0;
      color: #475569;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
    }

    .kf-step-item.active .kf-step-number {
      background: #4f46e5;
      color: #ffffff;
    }

    .kf-step-item.completed .kf-step-number {
      background: #10b981;
      color: #ffffff;
    }

    .kf-step-label {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
    }

    .kf-step-divider {
      flex: 0 0 32px;
      height: 2px;
      background: #e2e8f0;
    }

    .kf-step-divider.active {
      background: #10b981;
    }

    /* Step Body */
    .kf-step-body {
      padding: 24px 28px;
      overflow-y: auto;
      max-height: 480px;
    }

    .kf-section-intro {
      margin-bottom: 20px;
    }

    .kf-section-intro h4 {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 4px 0;
    }

    .kf-section-intro p {
      font-size: 13px;
      color: #64748b;
      margin: 0;
    }

    /* Service Summary Card */
    .kf-service-summary-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .kf-summary-row {
      display: flex;
      align-items: center;
      font-size: 13px;
      gap: 8px;
    }

    .kf-summary-label {
      color: #64748b;
      min-width: 105px;
      font-weight: 500;
    }

    .kf-summary-val {
      color: #1e293b;
    }

    .kf-summary-code {
      font-family: 'JetBrains Mono', 'Roboto Mono', monospace;
      font-size: 12px;
      color: #4f46e5;
      background: #eef2ff;
      padding: 2px 6px;
      border-radius: 4px;
    }

    /* Form Controls */
    .kf-form-group {
      margin-bottom: 20px;
    }

    .kf-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 4px;
    }

    .kf-required {
      color: #ef4444;
      margin-left: 3px;
    }

    .kf-hint {
      font-size: 12px;
      color: #64748b;
      margin: 0 0 8px 0;
    }

    .kf-input, .kf-textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13.5px;
      font-family: inherit;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      transition: border-color 0.15s ease;
    }

    .kf-input:focus, .kf-textarea:focus {
      border-color: #4f46e5;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
    }

    /* Environment Grid */
    .kf-env-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    .kf-env-card {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px;
      background: #ffffff;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .kf-env-card:hover {
      border-color: #cbd5e1;
      background: #f8fafc;
    }

    .kf-env-card.selected {
      border-color: #4f46e5;
      background: #f5f7ff;
      box-shadow: 0 0 0 1px #4f46e5;
    }

    .kf-env-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .kf-env-radio {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 2px solid #cbd5e1;
      position: relative;
    }

    .kf-env-radio.checked {
      border-color: #4f46e5;
    }

    .kf-env-radio.checked::after {
      content: '';
      position: absolute;
      top: 3px;
      left: 3px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #4f46e5;
    }

    .kf-env-header strong {
      font-size: 13.5px;
      color: #0f172a;
    }

    .kf-prefix-pill {
      margin-left: auto;
      font-family: monospace;
      font-size: 10.5px;
      background: #e2e8f0;
      color: #475569;
      padding: 1px 6px;
      border-radius: 4px;
    }

    .kf-env-card.selected .kf-prefix-pill {
      background: #e0e7ff;
      color: #4f46e5;
    }

    .kf-env-card p {
      font-size: 12px;
      color: #64748b;
      margin: 0;
      line-height: 1.4;
    }

    /* Quota Highlight Box */
    .kf-quota-highlight {
      display: flex;
      align-items: center;
      gap: 14px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 20px;
    }

    .kf-quota-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: #dcfce7;
      color: #16a34a;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .kf-quota-content h5 {
      font-size: 14px;
      font-weight: 700;
      color: #15803d;
      margin: 0 0 2px 0;
    }

    .kf-quota-content p {
      font-size: 13px;
      color: #166534;
      margin: 0;
    }

    /* Tier Options */
    .kf-tier-options {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .kf-tier-item {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 16px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .kf-tier-item:hover {
      border-color: #cbd5e1;
      background: #f8fafc;
    }

    .kf-tier-item.selected {
      border-color: #4f46e5;
      background: #f5f7ff;
      box-shadow: 0 0 0 1px #4f46e5;
    }

    .kf-tier-top {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 4px;
    }

    .kf-tier-top strong {
      font-size: 14px;
      color: #0f172a;
    }

    .kf-tier-value {
      margin-left: auto;
      font-weight: 700;
      font-size: 13px;
      color: #4f46e5;
      background: #eef2ff;
      padding: 2px 8px;
      border-radius: 6px;
    }

    .kf-tier-sub {
      font-size: 12px;
      color: #64748b;
      margin: 0;
      padding-left: 26px;
    }

    /* SLA Box */
    .kf-sla-box {
      margin-top: 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .kf-sla-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12.5px;
    }

    .kf-check-icon {
      color: #10b981;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .kf-sla-item strong {
      color: #1e293b;
      margin-right: 6px;
    }

    .kf-sla-item span {
      color: #64748b;
    }

    /* Expiry Grid */
    .kf-expiry-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }

    .kf-expiry-btn {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .kf-expiry-btn:hover {
      border-color: #cbd5e1;
      background: #f8fafc;
    }

    .kf-expiry-btn.selected {
      border-color: #4f46e5;
      background: #f5f7ff;
      box-shadow: 0 0 0 1px #4f46e5;
    }

    .kf-expiry-btn strong {
      font-size: 13px;
      color: #0f172a;
    }

    .kf-expiry-btn span {
      font-size: 11px;
      color: #64748b;
    }

    /* Scopes List */
    .kf-scopes-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .kf-scope-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 14px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .kf-scope-row:hover {
      background: #f8fafc;
    }

    .kf-scope-row.checked {
      background: #f8fafc;
      border-color: #cbd5e1;
    }

    .kf-scope-row input[type="checkbox"] {
      margin-top: 3px;
      cursor: pointer;
      accent-color: #4f46e5;
      width: 16px;
      height: 16px;
    }

    .kf-scope-text strong {
      display: block;
      font-size: 13px;
      color: #0f172a;
      font-family: monospace;
      margin-bottom: 2px;
    }

    .kf-scope-text span {
      font-size: 12px;
      color: #64748b;
    }

    /* Step Revealed - Secret Key */
    .kf-step-revealed {
      text-align: center;
      padding: 28px;
    }

    .kf-success-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
      padding: 4px 14px;
      border-radius: 9999px;
      font-size: 11.5px;
      font-weight: 700;
      margin-bottom: 12px;
    }

    .kf-success-badge mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .kf-revealed-title {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 16px 0;
    }

    .kf-warning-box {
      background: #fffbeb;
      border: 1px solid #fef3c7;
      border-left: 4px solid #f59e0b;
      border-radius: 8px;
      padding: 14px 16px;
      text-align: left;
      display: flex;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 22px;
    }

    .kf-warning-box mat-icon {
      color: #d97706;
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .kf-warning-box strong {
      font-size: 13.5px;
      color: #92400e;
      display: block;
      margin-bottom: 2px;
    }

    .kf-warning-box p {
      font-size: 12.5px;
      color: #b45309;
      margin: 0;
      line-height: 1.45;
    }

    /* Secret Display Box */
    .kf-secret-box {
      background: #0f172a;
      border-radius: 10px;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 24px;
      text-align: left;
    }

    .kf-secret-content {
      flex: 1;
      overflow: hidden;
    }

    .kf-secret-label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }

    .kf-secret-code {
      font-family: 'JetBrains Mono', 'Roboto Mono', monospace;
      font-size: 14px;
      color: #38bdf8;
      word-break: break-all;
      display: block;
    }

    .kf-copy-secret-btn {
      background: #4f46e5 !important;
      color: #ffffff !important;
      font-size: 12.5px !important;
      font-weight: 600 !important;
      border-radius: 8px !important;
      padding: 0 16px !important;
      height: 38px !important;
      white-space: nowrap;
    }

    .kf-copy-secret-btn.copied {
      background: #10b981 !important;
    }

    /* Metadata Recap Grid */
    .kf-meta-recap {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 18px;
      text-align: left;
    }

    .kf-meta-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .kf-cell-label {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
    }

    .kf-cell-val {
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
    }

    .kf-badge-env {
      color: #4f46e5;
    }

    .kf-badge-active {
      color: #059669;
    }

    /* Footer */
    .kf-dialog-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 18px 28px;
      border-top: 1px solid #f1f5f9;
      background: #ffffff;
    }

    .kf-footer-left, .kf-footer-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .kf-btn-secondary {
      color: #475569;
      font-weight: 600;
      font-size: 13px;
    }

    .kf-btn-cancel {
      color: #64748b;
      font-size: 13px;
    }

    .kf-btn-next, .kf-btn-provision {
      height: 40px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 600;
      padding: 0 20px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .kf-revealed-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      width: 100%;
    }

    .kf-action-btn {
      font-size: 13px;
      font-weight: 600;
      border-radius: 8px;
      height: 40px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .kf-action-done {
      height: 40px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 600;
      padding: 0 24px;
    }
  `],
})
export class SubscribeDialogComponent {
  protected readonly dialogRef = inject(MatDialogRef<SubscribeDialogComponent>);
  protected readonly data = inject<SubscribeDialogData>(MAT_DIALOG_DATA);
  private readonly marketplaceService = inject(MarketplaceService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  currentStep = signal<number>(1);
  submitting = signal<boolean>(false);
  copied = signal<boolean>(false);
  provisionedKey = signal<ApiKeyCreatedResponse | null>(null);

  // Form State
  applicationName = '';
  environment: 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT' = 'PRODUCTION';
  description = '';
  selectedRateLimit = 60;
  expiryDays = 90;
  allowedIps = '';
  scopes: string[] = ['READ_ANALYTICS', 'READ_PROJECTS'];

  expiryOptions = [
    { label: '30 Days', days: 30, sub: 'Short-lived' },
    { label: '90 Days', days: 90, sub: 'Standard' },
    { label: '1 Year', days: 365, sub: 'Annual' },
    { label: 'Never', days: 0, sub: 'Permanent' },
  ];

  constructor() {
    if (this.data?.service) {
      this.applicationName = `${this.data.service.name} Client`;
      this.selectedRateLimit = this.data.service.rateLimitPerMinute || 60;
    }
  }

  goToStep(step: number): void {
    if (step > 1 && !this.applicationName.trim()) {
      this.snackBar.open('Please specify an Application Name first', undefined, { duration: 2500 });
      return;
    }
    this.currentStep.set(step);
  }

  nextStep(): void {
    if (this.currentStep() === 1 && !this.applicationName.trim()) {
      return;
    }
    this.currentStep.update(s => Math.min(3, s + 1));
  }

  prevStep(): void {
    this.currentStep.update(s => Math.max(1, s - 1));
  }

  hasScope(scope: string): boolean {
    return this.scopes.includes(scope);
  }

  toggleScope(scope: string): void {
    if (this.hasScope(scope)) {
      this.scopes = this.scopes.filter(s => s !== scope);
    } else {
      this.scopes.push(scope);
    }
  }

  submitProvisioning(): void {
    if (!this.applicationName.trim()) {
      return;
    }

    this.submitting.set(true);

    let expiresAt: string | null = null;
    if (this.expiryDays > 0) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + this.expiryDays);
      expiresAt = expDate.toISOString();
    }

    const payload: SubscribeServiceRequest = {
      applicationName: this.applicationName.trim(),
      environment: this.environment,
      description: this.description.trim() || undefined,
      expiresAt,
      rateLimitPerMinute: this.selectedRateLimit,
      scopes: this.scopes,
      allowedIps: this.allowedIps.trim() || undefined,
    };

    this.marketplaceService.subscribe(this.data.service.id, payload).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.provisionedKey.set(res);
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

  goToPlayground(): void {
    const key = this.provisionedKey()?.fullKey;
    this.dialogRef.close();
    this.router.navigate(['/playground'], {
      queryParams: {
        serviceId: this.data.service.id,
        key: key || undefined,
      },
    });
  }

  goToSubscribedKeys(): void {
    this.dialogRef.close();
    this.router.navigate(['/subscribed-keys']);
  }

  closeDialog(): void {
    this.dialogRef.close(this.provisionedKey() != null);
  }

  formatExpiry(isoDate?: string | null): string {
    if (!isoDate) return 'Never (Permanent)';
    return new Date(isoDate).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
