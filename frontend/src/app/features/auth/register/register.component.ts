import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/models/user.model';
import { ApiErrorResponse } from '../../../core/models/api-error.model';

@Component({
  selector: 'kf-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="kf-auth-page">
      <mat-card class="kf-auth-card">
        <div class="kf-auth-card__brand">KeyForge Hub</div>
        <h1>Create your account</h1>
        <p class="kf-auth-card__subtitle">Select your account type to configure your specialized workspace</p>

        <!-- Role Selector Switch -->
        <div class="kf-role-selector">
          <button
            type="button"
            class="kf-role-tab"
            [class.kf-role-tab--active]="selectedRole === 'DEVELOPER'"
            (click)="selectRole('DEVELOPER')"
          >
            <mat-icon>terminal</mat-icon>
            <div>
              <strong>Developer</strong>
              <span>Consume & Integrate APIs</span>
            </div>
          </button>

          <button
            type="button"
            class="kf-role-tab"
            [class.kf-role-tab--active]="selectedRole === 'PROVIDER'"
            (click)="selectRole('PROVIDER')"
          >
            <mat-icon>storefront</mat-icon>
            <div>
              <strong>Provider</strong>
              <span>Publish & Monetize Models</span>
            </div>
          </button>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()">
          @if (selectedRole === 'DEVELOPER') {
            <!-- DEVELOPER SPECIFIC FIELDS -->
            <div class="kf-role-section-title">
              <mat-icon class="kf-section-icon">code</mat-icon> Developer Profile
            </div>

            <mat-form-field appearance="outline" class="kf-full-width">
              <mat-label>Developer Full Name</mat-label>
              <input matInput formControlName="fullName" placeholder="e.g. Alex Rivera" autocomplete="name" />
              @if (form.controls.fullName.hasError('required') && form.controls.fullName.touched) {
                <mat-error>Full name is required</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="kf-full-width">
              <mat-label>Developer Email</mat-label>
              <input matInput type="email" formControlName="email" placeholder="alex@developer.dev" autocomplete="email" />
              @if (form.controls.email.hasError('required') && form.controls.email.touched) {
                <mat-error>Email is required</mat-error>
              }
              @if (form.controls.email.hasError('email') && form.controls.email.touched) {
                <mat-error>Enter a valid email</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="kf-full-width">
              <mat-label>Password</mat-label>
              <input matInput type="password" formControlName="password" autocomplete="new-password" />
              @if (form.controls.password.hasError('required') && form.controls.password.touched) {
                <mat-error>Password is required</mat-error>
              }
              @if (form.controls.password.hasError('minlength') && form.controls.password.touched) {
                <mat-error>Password must be at least 8 characters</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="kf-full-width">
              <mat-label>Tech Stack(s)</mat-label>
              <mat-select formControlName="techStacks" multiple>
                <mat-option value="Python / AI & ML (LangChain, PyTorch)">Python / AI & ML (LangChain, PyTorch)</mat-option>
                <mat-option value="TypeScript / Node.js (Next.js, NestJS)">TypeScript / Node.js (Next.js, NestJS)</mat-option>
                <mat-option value="Java / Spring Boot">Java / Spring Boot</mat-option>
                <mat-option value="Go / Cloud Native">Go / Cloud Native</mat-option>
                <mat-option value="Rust / Systems">Rust / Systems</mat-option>
                <mat-option value="React / Angular / Vue">React / Angular / Vue</mat-option>
                <mat-option value="C# / .NET Enterprise">C# / .NET Enterprise</mat-option>
                <mat-option value="Mobile (Flutter, React Native, Swift, Kotlin)">Mobile (Flutter, React Native, Swift, Kotlin)</mat-option>
                <mat-option value="PHP / Laravel">PHP / Laravel</mat-option>
                <mat-option value="Ruby on Rails">Ruby on Rails</mat-option>
              </mat-select>
              <mat-hint>Select one or more technologies you build with</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline" class="kf-full-width">
              <mat-label>GitHub / Portfolio URL (Optional)</mat-label>
              <input matInput formControlName="githubUrl" placeholder="https://github.com/your-username" />
            </mat-form-field>
          } @else {
            <!-- PROVIDER SPECIFIC FIELDS -->
            <div class="kf-role-section-title kf-role-section-title--prov">
              <mat-icon class="kf-section-icon">domain</mat-icon> 1. Organization & Contact Identity
            </div>

            <mat-form-field appearance="outline" class="kf-full-width">
              <mat-label>Organization / Provider Brand Name</mat-label>
              <input matInput formControlName="organizationName" placeholder="e.g. Nexus AI Labs" />
              @if (form.controls.organizationName.hasError('required') && form.controls.organizationName.touched) {
                <mat-error>Organization name is required</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="kf-full-width">
              <mat-label>Representative / Contact Name</mat-label>
              <input matInput formControlName="fullName" placeholder="e.g. Dr. Jordan Vance" autocomplete="name" />
              @if (form.controls.fullName.hasError('required') && form.controls.fullName.touched) {
                <mat-error>Contact name is required</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="kf-full-width">
              <mat-label>Corporate / Work Email</mat-label>
              <input matInput type="email" formControlName="email" placeholder="contact@nexus-ai.com" autocomplete="email" />
              @if (form.controls.email.hasError('required') && form.controls.email.touched) {
                <mat-error>Email is required</mat-error>
              }
              @if (form.controls.email.hasError('email') && form.controls.email.touched) {
                <mat-error>Enter a valid email</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="kf-full-width">
              <mat-label>Password</mat-label>
              <input matInput type="password" formControlName="password" autocomplete="new-password" />
              @if (form.controls.password.hasError('required') && form.controls.password.touched) {
                <mat-error>Password is required</mat-error>
              }
              @if (form.controls.password.hasError('minlength') && form.controls.password.touched) {
                <mat-error>Password must be at least 8 characters</mat-error>
              }
            </mat-form-field>

            <!-- GATEWAY ROUTING -->
            <div class="kf-role-section-title kf-role-section-title--prov" style="margin-top: 20px;">
              <mat-icon class="kf-section-icon">router</mat-icon> 2. API Gateway & Upstream Routing
            </div>

            <mat-form-field appearance="outline" class="kf-full-width">
              <mat-label>Base Production API Gateway URL</mat-label>
              <input matInput formControlName="baseApiUrl" placeholder="https://api.nexus-ai.com/v1" />
              <mat-hint>Where KeyForge Gateway routes developers' requests</mat-hint>
              @if (form.controls.baseApiUrl.hasError('required') && form.controls.baseApiUrl.touched) {
                <mat-error>Base API URL is required</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="kf-full-width">
              <mat-label>Upstream Authentication Scheme</mat-label>
              <mat-select formControlName="authScheme">
                <mat-option value="Bearer Token (Authorization: Bearer <key>)">Bearer Token (Authorization: Bearer &lt;key&gt;)</mat-option>
                <mat-option value="Custom Header (X-API-Key: <key>)">Custom Header (X-API-Key: &lt;key&gt;)</mat-option>
                <mat-option value="None / Public Gateway">None / Public Gateway</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="kf-full-width">
              <mat-label>Hosting Cloud & Region</mat-label>
              <mat-select formControlName="hostingRegion">
                <mat-option value="AWS (us-east-1)">AWS (us-east-1, US East)</mat-option>
                <mat-option value="AWS (ap-south-1)">AWS (ap-south-1, Mumbai)</mat-option>
                <mat-option value="Google Cloud (us-central1)">Google Cloud (us-central1)</mat-option>
                <mat-option value="Microsoft Azure (East US)">Microsoft Azure (East US)</mat-option>
                <mat-option value="Cloudflare Workers / Edge">Cloudflare Workers / Edge</mat-option>
                <mat-option value="Self-Hosted GPU Cluster">Self-Hosted Dedicated GPU Cluster</mat-option>
              </mat-select>
            </mat-form-field>

            <!-- CAPACITY & SLA -->
            <div class="kf-role-section-title kf-role-section-title--prov" style="margin-top: 20px;">
              <mat-icon class="kf-section-icon">tune</mat-icon> 3. Capacity Quotas & Service SLA
            </div>

            <mat-form-field appearance="outline" class="kf-full-width">
              <mat-label>Default Rate Limit Per Key</mat-label>
              <mat-select formControlName="defaultRateLimit">
                <mat-option [value]="60">60 requests / minute (Standard Tier)</mat-option>
                <mat-option [value]="120">120 requests / minute (High-Performance Tier)</mat-option>
                <mat-option [value]="300">300 requests / minute (Enterprise High Throughput)</mat-option>
                <mat-option [value]="600">600 requests / minute (Ultra-Fast AI Burst)</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="kf-full-width">
              <mat-label>SLA & Availability Guarantee</mat-label>
              <mat-select formControlName="slaTier">
                <mat-option value="99.9% Production SLA (Enterprise Tier)">99.9% Production SLA (Enterprise Tier)</mat-option>
                <mat-option value="99.5% Standard SLA">99.5% Standard SLA</mat-option>
                <mat-option value="Beta / Experimental Best-Effort">Beta / Experimental Best-Effort</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="kf-full-width">
              <mat-label>Provider Category / Model Domain</mat-label>
              <mat-select formControlName="providerType">
                <mat-option value="AI_LLM">Frontier AI & Large Language Models</mat-option>
                <mat-option value="SPEECH">Speech Recognition & Voice Synthesis</mat-option>
                <mat-option value="COMPUTER_VISION">Computer Vision & Multimodal</mat-option>
                <mat-option value="NLP">Financial, NLP & Sentiment Analysis</mat-option>
                <mat-option value="REST_API">Cloud Microservices & REST Gateways</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="kf-full-width">
              <mat-label>Developer Technical Support Email</mat-label>
              <input matInput type="email" formControlName="supportEmail" placeholder="support@nexus-ai.com" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="kf-full-width">
              <mat-label>Website / Documentation URL (Optional)</mat-label>
              <input matInput formControlName="websiteUrl" placeholder="https://nexus-ai.com/docs" />
            </mat-form-field>
          }

          @if (errorMessage()) {
            <div class="kf-auth-card__error">{{ errorMessage() }}</div>
          }

          <button
            mat-flat-button
            color="primary"
            type="submit"
            class="kf-full-width kf-auth-card__submit"
            [class.kf-auth-card__submit--prov]="selectedRole === 'PROVIDER'"
            [disabled]="form.invalid || loading()"
          >
            @if (loading()) {
              <mat-spinner diameter="20"></mat-spinner>
            } @else {
              <span>{{ selectedRole === 'DEVELOPER' ? 'Register Developer Account' : 'Register Provider Account' }}</span>
            }
          </button>
        </form>

        <p class="kf-auth-card__footer">
          Already have an account? <a routerLink="/login">Sign in</a>
        </p>
      </mat-card>
    </div>
  `,
  styles: [`
    .kf-auth-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8fafc;
      padding: 36px 16px;
    }

    .kf-auth-card {
      width: 100%;
      max-width: 520px;
      padding: 36px 32px;
      background: #ffffff !important;
      color: #0f172a !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 16px !important;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04) !important;
    }

    .kf-auth-card__brand {
      font-weight: 800;
      font-size: 22px;
      color: #4f46e5;
      margin-bottom: 18px;
      letter-spacing: -0.02em;
    }

    h1 {
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 6px 0;
      color: #0f172a;
      letter-spacing: -0.02em;
    }

    .kf-auth-card__subtitle {
      color: #64748b;
      margin: 0 0 24px 0;
      font-size: 14px;
      line-height: 1.4;
    }

    /* Role Selector Tabs */
    .kf-role-selector {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 24px;
    }

    .kf-role-tab {
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      color: #64748b;
      text-align: left;
      transition: all 0.2s ease;
    }

    .kf-role-tab mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .kf-role-tab strong {
      display: block;
      font-size: 14px;
      color: #1e293b;
    }

    .kf-role-tab span {
      display: block;
      font-size: 11px;
      opacity: 0.85;
      margin-top: 2px;
    }

    .kf-role-tab:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }

    .kf-role-tab--active {
      border-color: #4f46e5;
      background: #eef2ff;
      color: #4f46e5;
    }

    .kf-role-tab--active strong {
      color: #4f46e5;
    }

    .kf-role-section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #4f46e5;
      margin: 18px 0 14px 0;
      padding-bottom: 6px;
      border-bottom: 1px solid #e0e7ff;
    }

    .kf-role-section-title--prov {
      color: #059669;
      border-bottom-color: #d1fae5;
    }

    .kf-section-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .kf-full-width {
      width: 100%;
      margin-bottom: 8px;
    }

    .kf-auth-card__submit {
      margin-top: 14px;
      height: 46px;
      background: #4f46e5 !important;
      color: #ffffff !important;
      font-weight: 700;
      font-size: 14.5px;
      letter-spacing: -0.01em;
      border-radius: 8px;
    }

    .kf-auth-card__submit--prov {
      background: #059669 !important;
    }

    .kf-auth-card__error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      margin-bottom: 16px;
    }

    .kf-auth-card__footer {
      text-align: center;
      margin-top: 24px;
      font-size: 13.5px;
      color: #64748b;
    }

    .kf-auth-card__footer a {
      color: #4f46e5;
      text-decoration: none;
      font-weight: 600;
    }

    .kf-auth-card__footer a:hover {
      text-decoration: underline;
    }
  `],
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  selectedRole: UserRole = 'DEVELOPER';
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    // Developer fields
    techStacks: this.fb.nonNullable.control<string[]>(['Python / AI & ML (LangChain, PyTorch)']),
    githubUrl: [''],
    // Provider fields
    organizationName: [''],
    websiteUrl: [''],
    providerType: ['AI_LLM'],
    supportEmail: [''],
    baseApiUrl: [''],
    authScheme: ['Bearer Token (Authorization: Bearer <key>)'],
    hostingRegion: ['AWS (us-east-1)'],
    defaultRateLimit: [120],
    slaTier: ['99.9% Production SLA (Enterprise Tier)'],
  });

  selectRole(role: UserRole): void {
    this.selectedRole = role;
    this.errorMessage.set(null);

    // Update validation dynamically
    if (role === 'PROVIDER') {
      this.form.controls.organizationName.setValidators([Validators.required]);
      this.form.controls.baseApiUrl.setValidators([Validators.required]);
    } else {
      this.form.controls.organizationName.clearValidators();
      this.form.controls.baseApiUrl.clearValidators();
    }
    this.form.controls.organizationName.updateValueAndValidity();
    this.form.controls.baseApiUrl.updateValueAndValidity();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const values = this.form.getRawValue();

    this.authService
      .register({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        role: this.selectedRole,
        primaryStack: this.selectedRole === 'DEVELOPER' && values.techStacks?.length ? values.techStacks.join(', ') : undefined,
        githubUrl: this.selectedRole === 'DEVELOPER' ? values.githubUrl : undefined,
        organizationName: this.selectedRole === 'PROVIDER' ? values.organizationName : undefined,
        websiteUrl: this.selectedRole === 'PROVIDER' ? values.websiteUrl : undefined,
        providerType: this.selectedRole === 'PROVIDER' ? values.providerType : undefined,
        supportEmail: this.selectedRole === 'PROVIDER' ? values.supportEmail : undefined,
        baseApiUrl: this.selectedRole === 'PROVIDER' ? values.baseApiUrl : undefined,
        authScheme: this.selectedRole === 'PROVIDER' ? values.authScheme : undefined,
        hostingRegion: this.selectedRole === 'PROVIDER' ? values.hostingRegion : undefined,
        defaultRateLimit: this.selectedRole === 'PROVIDER' ? values.defaultRateLimit : undefined,
        slaTier: this.selectedRole === 'PROVIDER' ? values.slaTier : undefined,
      })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.role === 'PROVIDER') {
            this.router.navigate(['/provider/services']);
          } else {
            this.router.navigate(['/marketplace']);
          }
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          const body = err.error as ApiErrorResponse | undefined;
          this.errorMessage.set(body?.message ?? 'Unable to create account. Please try again.');
        },
      });
  }
}
