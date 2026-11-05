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
import { DeclaredEndpointPermission, ServiceInvocationResponse, ServiceListing } from '../../../core/models/marketplace.model';

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
        <h1 class="kf-playground-title">API Testing Console</h1>
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

          @if (availableEndpoints.length > 0) {
            <div class="kf-quick-routes">
              <span class="kf-quick-routes-label">Available Endpoints:</span>
              <div class="kf-routes-pills">
                @for (ep of availableEndpoints; track ep.endpoint) {
                  <button
                    type="button"
                    class="kf-route-pill-btn"
                    [class.kf-route-pill-btn--active]="selectedEndpoint === ep.endpoint"
                    (click)="selectRoute(ep)"
                  >
                    <span class="kf-route-method-tag">{{ ep.methods[0] || 'POST' }}</span>
                    <span class="kf-route-path-text">{{ ep.endpoint }}</span>
                  </button>
                }
              </div>
            </div>
          }

          <div class="kf-endpoint-selector-row">
            <mat-form-field appearance="outline" class="kf-method-field">
              <mat-label>Method</mat-label>
              <mat-select [(ngModel)]="selectedMethod">
                <mat-option value="POST">POST</mat-option>
                <mat-option value="GET">GET</mat-option>
                <mat-option value="PUT">PUT</mat-option>
                <mat-option value="DELETE">DELETE</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="kf-path-field">
              <mat-label>Endpoint Route</mat-label>
              <input
                matInput
                [(ngModel)]="selectedEndpoint"
                placeholder="/v1/chat/completions"
              />
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="kf-full-width">
            <mat-label>API Key (Header: X-API-Key)</mat-label>
            <input
              matInput
              [(ngModel)]="apiKey"
              type="password"
              placeholder="kf_live_..."
              autocomplete="off"
            />
            <mat-hint>Paste your key or subscribe from the marketplace to get one.</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="kf-full-width kf-payload-field">
            <mat-label>Request Payload (JSON)</mat-label>
            <textarea
              matInput
              rows="8"
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
              <span class="kf-meta-chip" [class.kf-meta-chip--status]="isSuccessStatus(response()?.statusCode)" [class.kf-meta-chip--error]="isErrorStatus(response()?.statusCode)">
                <mat-icon>{{ getStatusIcon(response()?.statusCode) }}</mat-icon>
                <span>{{ getStatusLabel(response()?.statusCode) }}</span>
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
              @if (response()?.metrics?.['rateLimitLimit']) {
                <span class="kf-meta-chip">
                  <mat-icon>speed</mat-icon>
                  <span>Quota: {{ response()?.metrics?.['rateLimitRemaining'] ?? 0 }} / {{ response()?.metrics?.['rateLimitLimit'] }} left</span>
                </span>
              }
              @if (response()?.metrics?.['error']) {
                <span class="kf-meta-chip kf-meta-chip--error">
                  <mat-icon>gpp_bad</mat-icon>
                  <span>{{ response()?.metrics?.['error'] }}</span>
                </span>
              }
            </div>

            <!-- Formatted Response Code Block -->
            <div class="kf-code-viewer">
              <div class="kf-code-viewer__header">
                <span>Response Body</span>
                <button mat-icon-button (click)="copyResponse()" aria-label="Copy response">
                  <mat-icon>content_copy</mat-icon>
                </button>
              </div>
              <pre class="kf-code-block"><code>{{ formattedResponse() }}</code></pre>
            </div>
          } @else if (loading()) {
            <div class="kf-response-placeholder">
              <mat-spinner diameter="36"></mat-spinner>
              <p>Routing through KeyForge AI Gateway & running inference...</p>
            </div>
          } @else {
            <div class="kf-response-placeholder">
              <mat-icon class="kf-placeholder-icon">terminal</mat-icon>
              <h3>Ready to test</h3>
              <p>Configure your service, enter your provisioned API key, and click <strong>Send Request</strong> to see live output.</p>
            </div>
          }
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .kf-playground-page {
      padding: 24px 32px;
      max-width: 1300px;
      margin: 0 auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    .kf-playground-header {
      margin-bottom: 24px;
    }

    .kf-back-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #4f46e5;
      text-decoration: none;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 12px;
    }

    .kf-back-link:hover {
      text-decoration: underline;
    }

    .kf-back-link mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .kf-playground-title {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
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

    @media (max-width: 900px) {
      .kf-playground-grid {
        grid-template-columns: 1fr;
      }
    }

    .kf-panel {
      padding: 24px;
      border-radius: 12px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .kf-panel-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
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
      margin-bottom: 12px;
    }

    .kf-endpoint-selector-row {
      display: flex;
      gap: 12px;
    }

    .kf-method-field {
      width: 120px;
    }

    .kf-path-field {
      flex: 1;
    }

    .kf-service-pill {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 8px 12px;
      border-radius: 8px;
      margin-bottom: 12px;
    }

    .kf-quick-routes {
      margin-bottom: 16px;
    }

    .kf-quick-routes-label {
      display: block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 6px;
    }

    .kf-routes-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .kf-route-pill-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s ease;
      color: #334155;
    }

    .kf-route-pill-btn:hover {
      background: #e2e8f0;
      border-color: #94a3b8;
    }

    .kf-route-pill-btn--active {
      background: #eef2ff !important;
      border-color: #6366f1 !important;
      color: #4f46e5 !important;
      font-weight: 600;
    }

    .kf-route-method-tag {
      font-size: 10px;
      font-weight: 800;
      background: #ffffff;
      padding: 1px 5px;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
    }

    .kf-route-pill-btn--active .kf-route-method-tag {
      background: #4f46e5;
      color: #ffffff;
      border-color: #4f46e5;
    }

    .kf-route-path-text {
      font-family: monospace;
    }

    .kf-pill-badge {
      font-size: 11px;
      font-weight: 700;
      color: #4f46e5;
      background: #eef2ff;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .kf-service-pill code {
      font-size: 12px;
      color: #475569;
      font-family: monospace;
    }

    .kf-code-font {
      font-family: 'Roboto Mono', monospace;
      font-size: 12.5px;
      line-height: 1.5;
    }

    .kf-request-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 8px;
    }

    .kf-execute-btn {
      height: 42px;
      padding: 0 20px;
      font-size: 13.5px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
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
      gap: 6px;
      background: #f1f5f9;
      color: #334155;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 6px;
    }

    .kf-meta-chip mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #64748b;
    }

    .kf-meta-chip--status {
      background: #ecfdf5;
      color: #065f46;
    }

    .kf-meta-chip--status mat-icon {
      color: #10b981;
    }

    .kf-meta-chip--error {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    .kf-meta-chip--error mat-icon {
      color: #ef4444;
    }

    .kf-meta-chip--warning {
      background: #fffbeb;
      color: #92400e;
      border: 1px solid #fde68a;
    }

    .kf-meta-chip--warning mat-icon {
      color: #f59e0b;
    }

    .kf-code-viewer {
      border: 1px solid #1e293b;
      border-radius: 8px;
      overflow: hidden;
      background: #0f172a;
    }

    .kf-code-viewer__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      background: #1e293b;
      color: #94a3b8;
      font-size: 12px;
      font-weight: 600;
    }

    .kf-code-viewer__header button {
      color: #94a3b8;
      width: 28px;
      height: 28px;
    }

    .kf-code-block {
      margin: 0;
      padding: 16px;
      color: #38bdf8;
      font-family: 'Roboto Mono', monospace;
      font-size: 12.5px;
      line-height: 1.5;
      max-height: 400px;
      overflow-y: auto;
    }

    .kf-response-placeholder {
      padding: 60px 20px;
      text-align: center;
      color: #64748b;
    }

    .kf-placeholder-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #cbd5e1;
      margin-bottom: 12px;
    }

    .kf-response-placeholder h3 {
      font-size: 16px;
      font-weight: 700;
      color: #334155;
      margin: 0 0 6px 0;
    }

    .kf-response-placeholder p {
      font-size: 13px;
      max-width: 320px;
      margin: 0 auto;
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
  selectedEndpoint = '/v1/chat/completions';
  selectedMethod = 'POST';
  apiKey = '';
  payloadText = '{}';

  ngOnInit(): void {
    const queryKey = this.route.snapshot.queryParamMap.get('key') || this.route.snapshot.queryParamMap.get('apiKey');
    if (queryKey) {
      this.apiKey = queryKey;
    }

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

  get availableEndpoints(): DeclaredEndpointPermission[] {
    const svc = this.currentService();
    if (svc && svc.declaredEndpoints && svc.declaredEndpoints.length > 0) {
      return svc.declaredEndpoints;
    }
    return [
      { endpoint: '/v1/chat/completions', methods: ['POST', 'GET'] },
      { endpoint: '/v1/embeddings', methods: ['POST', 'GET'] },
      { endpoint: '/v1/models', methods: ['GET'] },
    ];
  }

  selectRoute(ep: DeclaredEndpointPermission): void {
    this.selectedEndpoint = ep.endpoint;
    if (ep.methods && ep.methods.length > 0) {
      this.selectedMethod = ep.methods.includes('POST') ? 'POST' : ep.methods[0];
    } else {
      this.selectedMethod = 'POST';
    }

    if (ep.endpoint.includes('embeddings')) {
      this.payloadText = JSON.stringify({ input: 'Sample text to generate vector embeddings' }, null, 2);
    } else if (ep.endpoint.includes('models')) {
      this.payloadText = '';
      this.selectedMethod = 'GET';
    } else if (ep.endpoint.includes('chat') || ep.endpoint.includes('completions')) {
      this.payloadText = JSON.stringify({
        model: this.currentService()?.name || 'mistral-7b',
        messages: [{ role: 'user', content: 'Hello world' }]
      }, null, 2);
    }
  }

  onServiceChange(): void {
    const svc = this.services().find((s) => s.id === this.selectedServiceId) ?? null;
    this.currentService.set(svc);
    if (svc) {
      if (svc.declaredEndpoints && svc.declaredEndpoints.length > 0) {
        this.selectRoute(svc.declaredEndpoints[0]);
      } else if (svc.endpointUrl) {
        this.selectedEndpoint = svc.endpointUrl;
        this.selectedMethod = 'POST';
        this.payloadText = svc.samplePayload || '{\n  "prompt": "Hello world"\n}';
      }
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
    const startTime = performance.now();

    this.marketplaceService
      .invokeService(
        this.selectedServiceId,
        this.apiKey.trim(),
        this.payloadText,
        this.selectedEndpoint.trim(),
        this.selectedMethod
      )
      .subscribe({
        next: (res) => {
          this.response.set(res);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          const latencyMs = Math.round(performance.now() - startTime);
          const statusCode = err.status || 500;
          const errorData = (err.error && typeof err.error === 'object')
            ? err.error
            : {
                timestamp: new Date().toISOString(),
                status: statusCode,
                error: 'INVOCATION_FAILED',
                message: err.message || 'API invocation failed.',
                path: this.selectedEndpoint.trim(),
              };

          const simulatedErrorResponse: ServiceInvocationResponse = {
            statusCode: statusCode,
            latencyMs: latencyMs,
            serviceName: this.currentService()?.name || 'Gateway',
            category: this.currentService()?.category || 'SERVICE',
            timestamp: errorData.timestamp || new Date().toISOString(),
            responseData: errorData,
            metrics: {
              tokensUsed: 0,
              rateLimitRemaining: 0,
              rateLimitLimit: this.currentService()?.rateLimitPerMinute ?? 60,
              serviceTier: this.currentService()?.pricingTier || 'Standard',
              error: errorData.error || 'GATEWAY_POLICY_VIOLATION',
            },
          };
          this.response.set(simulatedErrorResponse);

          const msg = errorData.message ?? 'API invocation failed. Ensure your API key is valid.';
          this.snackBar.open(msg, 'Dismiss', { duration: 4000 });
        },
      });
  }

  isSuccessStatus(code?: number): boolean {
    return !!code && code >= 200 && code < 300;
  }

  isErrorStatus(code?: number): boolean {
    return !code || code >= 400;
  }

  getStatusIcon(code?: number): string {
    if (!code) return 'help_outline';
    if (code >= 200 && code < 300) return 'check_circle';
    if (code === 403) return 'shield';
    if (code === 404) return 'search_off';
    if (code === 405) return 'do_not_disturb';
    if (code === 429) return 'speed';
    return 'cancel';
  }

  getStatusLabel(code?: number): string {
    if (!code) return 'UNKNOWN';
    switch (code) {
      case 200: return '200 OK';
      case 201: return '201 Created';
      case 400: return '400 Bad Request';
      case 401: return '401 Unauthorized';
      case 403: return '403 Forbidden';
      case 404: return '404 Not Found';
      case 405: return '405 Method Not Offered';
      case 409: return '409 Conflict';
      case 429: return '429 Rate Limit Exceeded';
      case 500: return '500 Gateway Error';
      default: return `${code} Error`;
    }
  }

  copyResponse(): void {
    const res = this.response();
    if (!res) return;
    navigator.clipboard.writeText(JSON.stringify(res.responseData, null, 2)).then(() => {
      this.snackBar.open('Response copied to clipboard', undefined, { duration: 2000 });
    });
  }

  formattedResponse(): string {
    const res = this.response();
    if (!res) return '';
    return JSON.stringify(res.responseData, null, 2);
  }
}
