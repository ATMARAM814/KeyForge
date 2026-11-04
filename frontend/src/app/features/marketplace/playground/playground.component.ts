import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MarketplaceService } from '../../../core/services/marketplace.service';
import { ServiceInvocationResponse, ServiceListing } from '../../../core/models/marketplace.model';

@Component({
  selector: 'kf-playground',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="kf-playground-page">
      <!-- Top Sub-Header -->
      <div class="kf-playground-header">
        <a routerLink="/marketplace" class="kf-back-link">
          <mat-icon>arrow_back</mat-icon>
          <span>Back to Marketplace</span>
        </a>
        <h1 class="kf-playground-title">API & Model Testing Playground</h1>
        <p class="kf-playground-desc">
          Execute real-time requests against published AI models and APIs using your provisioned API credentials.
        </p>
      </div>

      <div class="kf-playground-grid">
        <!-- Request Panel -->
        <mat-card class="kf-panel kf-panel--request">
          <div class="kf-panel-title">
            <mat-icon>tune</mat-icon>
            <span>Request Configuration</span>
          </div>

          <mat-form-field appearance="outline" class="kf-full-width">
            <mat-label>Select Target Service / AI Model</mat-label>
            <mat-select [(ngModel)]="selectedServiceId" (selectionChange)="onServiceChange()">
              @for (svc of services(); track svc.id) {
                <mat-option [value]="svc.id">
                  {{ svc.name }} ({{ svc.category }})
                </mat-option>
              }
            </mat-select>
          </mat-form-field>

          @if (currentService()) {
            <div class="kf-service-pill">
              <span class="kf-pill-badge">{{ currentService()?.category }}</span>
              <code>{{ currentService()?.endpointUrl }}</code>
            </div>
          }

          <mat-form-field appearance="outline" class="kf-full-width">
            <mat-label>API Key (Header: X-API-Key)</mat-label>
            <input
              matInput
              type="password"
              [(ngModel)]="apiKey"
              placeholder="kf_live_... or kf_test_..."
            />
            <mat-hint>Paste your key or subscribe from the marketplace to get one.</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="kf-full-width kf-payload-field">
            <mat-label>Request Payload (JSON)</mat-label>
            <textarea
              matInput
              rows="9"
              [(ngModel)]="payloadText"
              placeholder="{ 'prompt': '...' }"
              class="kf-code-font"
            ></textarea>
          </mat-form-field>

          <div class="kf-request-actions">
            <button
              mat-flat-button
              color="primary"
              class="kf-execute-btn"
              [disabled]="loading() || !selectedServiceId || !apiKey"
              (click)="executeCall()"
            >
              @if (loading()) {
                <mat-spinner diameter="18"></mat-spinner>
                <span>Calling API...</span>
              } @else {
                <ng-container>
                  <mat-icon>send</mat-icon>
                  <span>Send Request</span>
                </ng-container>
              }
            </button>
          </div>
        </mat-card>

        <!-- Response Panel -->
        <mat-card class="kf-panel kf-panel--response">
          <div class="kf-panel-title">
            <mat-icon>terminal</mat-icon>
            <span>Live Gateway Response</span>
          </div>

          @if (response()) {
            <!-- Metrics Row -->
            <div class="kf-response-meta">
              <span class="kf-meta-chip kf-meta-chip--status">
                <mat-icon>check_circle</mat-icon>
                <span>{{ response()?.statusCode }} OK</span>
              </span>
              <span class="kf-meta-chip">
                <mat-icon>timer</mat-icon>
                <span>{{ response()?.latencyMs }} ms</span>
              </span>
              @if (response()?.metrics?.['tokensUsed']) {
                <span class="kf-meta-chip">
                  <mat-icon>token</mat-icon>
                  <span>{{ response()?.metrics?.['tokensUsed'] }} tokens</span>
                </span>
              }
              <span class="kf-meta-chip">
                <mat-icon>speed</mat-icon>
                <span>Limit: {{ response()?.metrics?.['rateLimitRemaining'] }} / {{ response()?.metrics?.['rateLimitLimit'] }} left</span>
              </span>
            </div>

            <!-- JSON Output View -->
            <div class="kf-code-container">
              <pre><code>{{ formattedResponse() }}</code></pre>
            </div>
          } @else if (loading()) {
            <div class="kf-response-empty">
              <mat-spinner diameter="36"></mat-spinner>
              <h4>Sending request through Gateway...</h4>
              <p>Routing to provider upstream target...</p>
            </div>
          } @else {
            <div class="kf-response-empty">
              <mat-icon class="kf-empty-icon">code</mat-icon>
              <h4>No Response Generated Yet</h4>
              <p>Choose an AI model, enter your API key, and click "Send Request" to test live execution.</p>
            </div>
          }
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .kf-playground-page {
      padding: 32px 36px;
      max-width: 1400px;
      margin: 0 auto;
      background: #f8fafc;
      min-height: calc(100vh - 86px);
      color: #0f172a;
    }

    .kf-playground-header {
      margin-bottom: 28px;
    }

    .kf-back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13.5px;
      font-weight: 600;
      color: #4f46e5;
      text-decoration: none;
      margin-bottom: 12px;
    }

    .kf-back-link:hover {
      text-decoration: underline;
    }

    .kf-back-link mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .kf-playground-title {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin: 0 0 6px 0;
    }

    .kf-playground-desc {
      font-size: 14px;
      color: #64748b;
      margin: 0;
    }

    .kf-playground-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      align-items: start;
    }

    @media (max-width: 992px) {
      .kf-playground-grid {
        grid-template-columns: 1fr;
      }
    }

    .kf-panel {
      background: #ffffff !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 14px !important;
      padding: 24px !important;
      color: #0f172a !important;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05), 0 1px 2px rgba(15, 23, 42, 0.03) !important;
    }

    .kf-panel-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid #f1f5f9;
    }

    .kf-panel-title mat-icon {
      color: #4f46e5;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .kf-full-width {
      width: 100%;
      margin-bottom: 14px;
    }

    .kf-service-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f1f5f9;
      padding: 8px 12px;
      border-radius: 8px;
      margin-bottom: 18px;
      border: 1px solid #e2e8f0;
    }

    .kf-pill-badge {
      background: #eef2ff;
      color: #4f46e5;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #c7d2fe;
    }

    .kf-service-pill code {
      font-size: 12px;
      color: #0f172a;
      font-family: monospace;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 600;
    }

    .kf-code-font {
      font-family: 'JetBrains Mono', 'Roboto Mono', monospace !important;
      font-size: 12.5px !important;
    }

    .kf-execute-btn {
      width: 100%;
      height: 46px;
      font-weight: 700;
      font-size: 14px;
      background: #4f46e5 !important;
      color: #ffffff !important;
      border-radius: 8px;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 8px !important;
      letter-spacing: -0.01em;
    }

    .kf-response-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }

    .kf-meta-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
    }

    .kf-meta-chip mat-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
      color: #6366f1;
    }

    .kf-meta-chip--status {
      background: #ecfdf5;
      border-color: #a7f3d0;
      color: #059669;
    }

    .kf-meta-chip--status mat-icon {
      color: #059669;
    }

    .kf-code-container {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 10px;
      padding: 16px;
      max-height: 460px;
      overflow: auto;
    }

    .kf-code-container pre {
      margin: 0;
    }

    .kf-code-container code {
      font-family: 'JetBrains Mono', 'Roboto Mono', monospace;
      font-size: 12.5px;
      color: #38bdf8;
      line-height: 1.5;
    }

    .kf-response-empty {
      text-align: center;
      padding: 64px 20px;
      color: #64748b;
    }

    .kf-response-empty mat-spinner {
      margin: 0 auto 16px auto;
    }

    .kf-empty-icon {
      font-size: 44px;
      width: 44px;
      height: 44px;
      color: #cbd5e1;
      margin-bottom: 12px;
    }

    .kf-response-empty h4 {
      font-size: 16px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 6px 0;
    }

    .kf-response-empty p {
      font-size: 13.5px;
      color: #64748b;
      margin: 0;
    }
  `],
})
export class PlaygroundComponent implements OnInit {
  private readonly marketplaceService = inject(MarketplaceService);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);

  services = signal<ServiceListing[]>([]);
  currentService = signal<ServiceListing | null>(null);
  response = signal<ServiceInvocationResponse | null>(null);
  loading = signal(false);

  selectedServiceId: string | null = null;
  apiKey = '';
  payloadText = '{}';

  ngOnInit(): void {
    this.marketplaceService.listServices().subscribe({
      next: (data) => {
        this.services.set(data);
        const queryId = this.route.snapshot.queryParamMap.get('serviceId');
        if (queryId) {
          this.selectedServiceId = queryId;
        } else if (data.length > 0) {
          this.selectedServiceId = data[0].id;
        }
        this.onServiceChange();
      },
    });
  }

  onServiceChange(): void {
    const svc = this.services().find((s) => s.id === this.selectedServiceId) ?? null;
    this.currentService.set(svc);
    if (svc && svc.samplePayload) {
      this.payloadText = svc.samplePayload;
    } else {
      this.payloadText = '{\n  "prompt": "Hello world"\n}';
    }
    this.response.set(null);
  }

  executeCall(): void {
    if (!this.selectedServiceId || !this.apiKey) {
      this.snackBar.open('Please select a service and provide an API key.', 'Dismiss', { duration: 3000 });
      return;
    }

    this.loading.set(true);
    this.response.set(null);

    this.marketplaceService
      .invokeService(this.selectedServiceId, this.apiKey.trim(), this.payloadText)
      .subscribe({
        next: (res) => {
          this.response.set(res);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          const msg = err.error?.message ?? 'API invocation failed. Ensure your API key is valid.';
          this.snackBar.open(msg, 'Dismiss', { duration: 4000 });
        },
      });
  }

  formattedResponse(): string {
    const res = this.response();
    if (!res) return '';
    return JSON.stringify(res.responseData, null, 2);
  }
}
