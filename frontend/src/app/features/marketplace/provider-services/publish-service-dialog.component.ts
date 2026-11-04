import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MarketplaceService } from '../../../core/services/marketplace.service';
import { DeclaredEndpointPermission, ServiceCategory } from '../../../core/models/marketplace.model';

@Component({
  selector: 'kf-publish-service-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title class="kf-dialog-title">
      <span class="material-icons-outlined">cloud_upload</span>
      Publish New Service / AI Model
    </h2>

    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content class="kf-dialog-content">
        <mat-form-field appearance="outline" class="kf-full-width">
          <mat-label>Service / Model Name</mat-label>
          <input matInput formControlName="name" placeholder="e.g. Mistral 7B Instruct, Audio Transcriber" />
          @if (form.controls.name.hasError('required') && form.controls.name.touched) {
            <mat-error>Name is required</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="kf-full-width">
          <mat-label>Category</mat-label>
          <mat-select formControlName="category" (selectionChange)="onCategoryChange($event.value)">
            <mat-option value="AI_LLM">AI & Large Language Model (LLM)</mat-option>
            <mat-option value="SPEECH">Speech & Audio Processing</mat-option>
            <mat-option value="COMPUTER_VISION">Computer Vision & OCR</mat-option>
            <mat-option value="NLP">Natural Language Processing (NLP)</mat-option>
            <mat-option value="REST_API">REST API / Microservice</mat-option>
            <mat-option value="UTILITY">Utility & Data Tool</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="kf-full-width">
          <mat-label>Base Endpoint URL</mat-label>
          <input matInput formControlName="endpointUrl" placeholder="https://api.yourdomain.com/v1" />
          @if (form.controls.endpointUrl.hasError('required') && form.controls.endpointUrl.touched) {
            <mat-error>Endpoint URL is required</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="kf-full-width">
          <mat-label>Description & Capabilities</mat-label>
          <textarea
            matInput
            rows="3"
            formControlName="description"
            placeholder="Describe what your AI model or API does, its inputs, and expected outcomes..."
          ></textarea>
        </mat-form-field>

        <!-- Provider Declared Endpoints / Capabilities -->
        <div class="kf-policy-section">
          <div class="kf-section-header">
            <span class="material-icons-outlined">alt_route</span>
            <strong>Declared Service Endpoints & Routes</strong>
          </div>
          <p class="kf-section-sub">
            Declare the exact endpoints your service provides. Developers will be able to select from this list when issuing their API keys.
          </p>

          <div class="kf-endpoints-list">
            @for (ep of declaredEndpoints; track ep.endpoint; let i = $index) {
              <div class="kf-endpoint-row">
                <span class="kf-ep-method-badge">{{ ep.methods.join(', ') }}</span>
                <code class="kf-ep-path">{{ ep.endpoint }}</code>
                <button mat-icon-button type="button" color="warn" (click)="removeEndpoint(i)" aria-label="Remove endpoint">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            }
          </div>

          <div class="kf-add-ep-row">
            <input
              type="text"
              class="kf-small-input"
              [(ngModel)]="newEndpointPath"
              [ngModelOptions]="{standalone: true}"
              placeholder="/v1/new-endpoint"
            />
            <select class="kf-small-select" [(ngModel)]="newEndpointMethod" [ngModelOptions]="{standalone: true}">
              <option value="POST">POST</option>
              <option value="GET">GET</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
            <button mat-stroked-button type="button" (click)="addEndpoint()">
              <mat-icon>add</mat-icon>
              <span>Add Endpoint</span>
            </button>
          </div>
        </div>

        <div class="kf-form-row">
          <mat-form-field appearance="outline" class="kf-half-width">
            <mat-label>Default Rate Limit (req/min)</mat-label>
            <input matInput type="number" formControlName="rateLimitPerMinute" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="kf-half-width">
            <mat-label>Pricing Tier / Badge</mat-label>
            <input matInput formControlName="pricingTier" placeholder="e.g. Free Tier, $0.002 / 1k tokens" />
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="kf-full-width">
          <mat-label>Sample Request Payload (JSON)</mat-label>
          <textarea
            matInput
            rows="3"
            formControlName="samplePayload"
            placeholder='{"prompt": "Generate summary..."}'
            class="kf-code-font"
          ></textarea>
        </mat-form-field>

        <div class="kf-policy-section">
          <div class="kf-section-header">
            <span class="material-icons-outlined">gavel</span>
            <strong>Provider Security Policy Ceiling</strong>
          </div>
          <p class="kf-section-sub">Defines the maximum limits developers can request for this service.</p>

          <div class="kf-form-row">
            <mat-form-field appearance="outline" class="kf-half-width">
              <mat-label>Max Rate Limit Ceiling (req/min)</mat-label>
              <input matInput type="number" formControlName="maxRateLimit" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="kf-half-width">
              <mat-label>Maximum Expiry Window (Days)</mat-label>
              <input matInput type="number" formControlName="maxExpiryDays" />
            </mat-form-field>
          </div>

          <div class="kf-checkboxes-row">
            <label class="kf-check-label">
              <input type="checkbox" formControlName="allowNeverExpires" />
              <span>Allow Non-Expiring Keys ("Never")</span>
            </label>

            <label class="kf-check-label">
              <input type="checkbox" formControlName="requireIpAllowlistForProduction" />
              <span>Mandate Specific IP Allowlist for Production</span>
            </label>
          </div>
        </div>

        <mat-form-field appearance="outline" class="kf-full-width">
          <mat-label>Documentation / Markdown Notes</mat-label>
          <textarea
            matInput
            rows="2"
            formControlName="documentation"
            placeholder="Additional usage details or headers requirements..."
          ></textarea>
        </mat-form-field>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="kf-dialog-actions">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button
          mat-flat-button
          color="primary"
          type="submit"
          [disabled]="form.invalid || loading()"
        >
          @if (loading()) {
            <mat-spinner diameter="18"></mat-spinner>
          } @else {
            Publish Service
          }
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .kf-dialog-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 20px;
      margin: 0;
      color: #1e293b;
    }

    .kf-dialog-title span {
      color: #6366f1;
    }

    .kf-dialog-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 520px;
      max-width: 600px;
      padding-top: 12px !important;
    }

    .kf-full-width {
      width: 100%;
    }

    .kf-form-row {
      display: flex;
      gap: 12px;
    }

    .kf-half-width {
      flex: 1;
    }

    .kf-code-font {
      font-family: monospace;
      font-size: 13px;
    }

    .kf-policy-section {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
      margin-bottom: 8px;
    }

    .kf-section-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13.5px;
      color: #1e293b;
      margin-bottom: 4px;
    }

    .kf-section-header span {
      font-size: 18px;
      color: #4f46e5;
    }

    .kf-section-sub {
      font-size: 12px;
      color: #64748b;
      margin: 0 0 10px 0;
    }

    .kf-endpoints-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 10px;
    }

    .kf-endpoint-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 4px 10px;
      border-radius: 6px;
    }

    .kf-ep-method-badge {
      font-size: 11px;
      font-weight: 700;
      color: #4f46e5;
      background: #eef2ff;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .kf-ep-path {
      font-size: 12.5px;
      color: #0f172a;
      flex: 1;
      margin-left: 10px;
    }

    .kf-add-ep-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .kf-small-input {
      flex: 1;
      height: 34px;
      padding: 0 8px;
      font-size: 12.5px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
    }

    .kf-small-select {
      height: 34px;
      padding: 0 8px;
      font-size: 12.5px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #fff;
    }

    .kf-checkboxes-row {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 6px;
    }

    .kf-check-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #334155;
      cursor: pointer;
    }

    .kf-dialog-actions {
      padding: 12px 24px;
    }
  `],
})
export class PublishServiceDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<PublishServiceDialogComponent>);
  private readonly marketplaceService = inject(MarketplaceService);
  private readonly snackBar = inject(MatSnackBar);

  loading = signal(false);

  newEndpointPath = '';
  newEndpointMethod = 'POST';

  declaredEndpoints: DeclaredEndpointPermission[] = [
    { endpoint: '/v1/chat/completions', methods: ['POST'] },
    { endpoint: '/v1/embeddings', methods: ['POST'] },
    { endpoint: '/v1/models', methods: ['GET'] },
  ];

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    category: ['AI_LLM' as ServiceCategory, [Validators.required]],
    endpointUrl: ['', [Validators.required]],
    description: ['', [Validators.required]],
    rateLimitPerMinute: [60],
    pricingTier: ['Free Tier'],
    defaultRateLimit: [60],
    maxRateLimit: [500],
    maxExpiryDays: [365],
    allowNeverExpires: [false],
    requireIpAllowlistForProduction: [false],
    allowedScopes: ['READ_ANALYTICS,READ_PROJECTS,WRITE_PROJECTS'],
    samplePayload: ['{\n  "prompt": "Hello world"\n}'],
    documentation: [''],
  });

  onCategoryChange(cat: ServiceCategory): void {
    switch (cat) {
      case 'AI_LLM':
        this.declaredEndpoints = [
          { endpoint: '/v1/chat/completions', methods: ['POST'] },
          { endpoint: '/v1/embeddings', methods: ['POST'] },
          { endpoint: '/v1/models', methods: ['GET'] },
        ];
        break;
      case 'SPEECH':
        this.declaredEndpoints = [
          { endpoint: '/v1/audio/transcriptions', methods: ['POST'] },
          { endpoint: '/v1/audio/speech', methods: ['POST'] },
        ];
        break;
      case 'COMPUTER_VISION':
        this.declaredEndpoints = [
          { endpoint: '/v1/vision/detect', methods: ['POST'] },
          { endpoint: '/v1/vision/ocr', methods: ['POST'] },
        ];
        break;
      case 'NLP':
        this.declaredEndpoints = [
          { endpoint: '/v1/nlp/sentiment', methods: ['POST'] },
          { endpoint: '/v1/nlp/entities', methods: ['POST'] },
        ];
        break;
      default:
        this.declaredEndpoints = [
          { endpoint: '/v1/data', methods: ['GET', 'POST'] },
          { endpoint: '/v1/health', methods: ['GET'] },
        ];
        break;
    }
  }

  addEndpoint(): void {
    if (!this.newEndpointPath.trim()) return;
    let path = this.newEndpointPath.trim();
    if (!path.startsWith('/')) path = '/' + path;
    this.declaredEndpoints.push({
      endpoint: path,
      methods: [this.newEndpointMethod],
    });
    this.newEndpointPath = '';
  }

  removeEndpoint(index: number): void {
    this.declaredEndpoints.splice(index, 1);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const val = {
      ...this.form.getRawValue(),
      declaredEndpoints: this.declaredEndpoints,
    };

    this.marketplaceService.createService(val).subscribe({
      next: (created) => {
        this.loading.set(false);
        this.snackBar.open(`Published '${created.name}' successfully!`, 'Dismiss', { duration: 3000 });
        this.dialogRef.close(created);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Failed to publish service. Please try again.', 'Dismiss', { duration: 3000 });
      },
    });
  }
}
