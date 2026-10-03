import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-auth-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="auth-page">
      <section class="auth-card card bg-base-100 shadow-xl">
        <div class="card-body">
          <a class="brand" routerLink="/login"><span class="brand-mark">M</span> Market Diary</a>
          <p class="eyebrow">{{ isRegister() ? 'YOUR PRIVATE INVESTING JOURNAL' : 'WELCOME BACK' }}</p>
          <h1>{{ isRegister() ? 'Create your account' : 'Sign in to your diary' }}</h1>
          <p class="muted">
            {{
              isRegister()
                ? 'Save your shares and keep a dated record of your research.'
                : 'Your notes and watchlist are ready when you are.'
            }}
          </p>

          @if (error()) {
            <div class="alert alert-error" role="alert">{{ error() }}</div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">
            <label class="form-control">
              <span class="label-text">Username</span>
              <input
                class="input input-bordered w-full"
                autocomplete="username"
                formControlName="userName"
                placeholder="Your username"
              />
              @if (form.controls.userName.touched && form.controls.userName.invalid) {
                <span class="field-error">Use 3–32 letters, numbers, dots, dashes or underscores.</span>
              }
            </label>
            <label class="form-control">
              <span class="label-text">Password</span>
              <input
                class="input input-bordered w-full"
                [type]="showPassword() ? 'text' : 'password'"
                autocomplete="{{ isRegister() ? 'new-password' : 'current-password' }}"
                formControlName="password"
                placeholder="Enter your password"
              />
              @if (isRegister()) {
                <span class="label-text-alt muted">At least 12 characters with upper- and lowercase, a number, and a symbol.</span>
              }
              @if (form.controls.password.touched && form.controls.password.invalid) {
                <span class="field-error">Password must be at least 12 characters.</span>
              }
            </label>
            <label class="show-password">
              <input class="checkbox checkbox-sm" type="checkbox" (change)="togglePassword($event)" />
              <span>Show password</span>
            </label>
            <button class="btn btn-primary w-full" type="submit" [disabled]="form.invalid || submitting()">
              @if (submitting()) {
                <span class="loading loading-spinner loading-sm"></span>
              }
              {{ isRegister() ? 'Create account' : 'Sign in' }}
            </button>
          </form>

          <p class="auth-switch">
            {{ isRegister() ? 'Already have an account?' : 'New to Market Diary?' }}
            <a [routerLink]="isRegister() ? '/login' : '/register'">
              {{ isRegister() ? 'Sign in' : 'Create an account' }}
            </a>
          </p>
        </div>
      </section>
    </main>
  `,
})
export class AuthPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly isRegister = signal(this.route.snapshot.data['mode'] === 'register');
  readonly showPassword = signal(false);
  readonly submitting = signal(false);
  readonly error = signal('');
  readonly form = this.formBuilder.nonNullable.group({
    userName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(32), Validators.pattern(/^[a-zA-Z0-9._-]+$/)]],
    password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(128)]],
  });

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set('');
    const { userName, password } = this.form.getRawValue();
    const request = this.isRegister()
      ? this.auth.register(userName, password)
      : this.auth.login(userName, password);

    request.subscribe({
      next: () => void this.router.navigateByUrl('/workspace'),
      error: (error: unknown) => {
        this.error.set(this.getErrorMessage(error));
        this.submitting.set(false);
      },
    });
  }

  togglePassword(event: Event): void {
    this.showPassword.set((event.target as HTMLInputElement).checked);
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return 'Unable to reach the server. Check your connection and try again.';
    }
    if (error instanceof HttpErrorResponse && error.status === 429) {
      return 'Too many attempts. Please wait a few minutes and try again.';
    }
    if (error instanceof HttpErrorResponse && error.status === 401) {
      return 'The username or password is incorrect.';
    }
    if (error instanceof HttpErrorResponse && error.status === 400) {
      const validationErrors = error.error?.errors as Record<string, string[]> | undefined;
      if (validationErrors) {
        return Object.values(validationErrors).flat().join(' ');
      }
      return error.error?.title ?? 'That username may already be in use.';
    }
    return 'Something went wrong. Please try again.';
  }
}
