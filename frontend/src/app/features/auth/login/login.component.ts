import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorResponse } from '../../../core/models/api-error.model';

@Component({
  selector: 'kf-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="kf-auth-page">
      <mat-card class="kf-auth-card">
        <div class="kf-auth-card__brand">KeyForge</div>
        <h1>Welcome back</h1>
        <p class="kf-auth-card__subtitle">Sign in to manage your API keys</p>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline" class="kf-full-width">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email" />
            @if (form.controls.email.hasError('required') && form.controls.email.touched) {
              <mat-error>Email is required</mat-error>
            }
            @if (form.controls.email.hasError('email') && form.controls.email.touched) {
              <mat-error>Enter a valid email</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="kf-full-width">
            <mat-label>Password</mat-label>
            <input matInput type="password" formControlName="password" autocomplete="current-password" />
            @if (form.controls.password.hasError('required') && form.controls.password.touched) {
              <mat-error>Password is required</mat-error>
            }
          </mat-form-field>

          @if (errorMessage()) {
            <div class="kf-auth-card__error">{{ errorMessage() }}</div>
          }

          <button
            mat-flat-button
            color="primary"
            type="submit"
            class="kf-full-width kf-auth-card__submit"
            [disabled]="form.invalid || loading()"
          >
            @if (loading()) {
              <mat-spinner diameter="20"></mat-spinner>
            } @else {
              <span>Sign in</span>
            }
          </button>
        </form>

        <p class="kf-auth-card__footer">
          Don't have an account? <a routerLink="/register">Create one</a>
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
      padding: 24px;
    }

    .kf-auth-card {
      width: 100%;
      max-width: 420px;
      padding: 36px 32px;
      background: #ffffff !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 16px !important;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04) !important;
      color: #0f172a !important;
    }

    .kf-auth-card__brand {
      font-weight: 800;
      font-size: 22px;
      color: #4f46e5;
      margin-bottom: 20px;
      letter-spacing: -0.02em;
    }

    h1 {
      font-size: 24px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 6px 0;
      letter-spacing: -0.02em;
    }

    .kf-auth-card__subtitle {
      color: #64748b;
      margin: 0 0 24px 0;
      font-size: 14px;
    }

    .kf-auth-card__submit {
      margin-top: 12px;
      height: 46px;
      background: #4f46e5 !important;
      color: #ffffff !important;
      font-weight: 700;
      font-size: 14.5px;
      border-radius: 8px;
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
      font-weight: 600;
      text-decoration: none;
    }

    .kf-auth-card__footer a:hover {
      text-decoration: underline;
    }
  `],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  loading = signal(false);
  errorMessage = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.form.getRawValue()).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.role === 'PROVIDER') {
          this.router.navigate(['/provider/services']);
        } else if (res.role === 'ADMIN') {
          this.router.navigate(['/admin-console']);
        } else {
          this.router.navigate(['/marketplace']);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const body = err.error as ApiErrorResponse | undefined;
        this.errorMessage.set(body?.message ?? 'Unable to sign in. Please try again.');
      },
    });
  }
}
