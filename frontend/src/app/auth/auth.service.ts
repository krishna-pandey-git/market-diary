import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthResponse } from './auth.models';

const tokenStorageKey = 'market-diary-session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly session = signal<AuthResponse | null>(this.readSession());

  readonly currentUser = computed(() => this.session()?.userName ?? null);
  readonly isAuthenticated = computed(() => {
    const session = this.session();
    if (!session || new Date(session.expiresAtUtc).getTime() <= Date.now()) {
      return false;
    }
    return true;
  });

  login(userName: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/api/auth/login', { userName, password })
      .pipe(tap((session) => this.saveSession(session)));
  }

  register(userName: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/api/auth/register', { userName, password })
      .pipe(tap((session) => this.saveSession(session)));
  }

  getAccessToken(): string | null {
    if (!this.isAuthenticated()) {
      this.logout();
      return null;
    }
    return this.session()?.accessToken ?? null;
  }

  logout(): void {
    this.session.set(null);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(tokenStorageKey);
    }
  }

  private saveSession(session: AuthResponse): void {
    this.session.set(session);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(tokenStorageKey, JSON.stringify(session));
    }
  }

  private readSession(): AuthResponse | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }
    const saved = sessionStorage.getItem(tokenStorageKey);
    if (!saved) {
      return null;
    }
    try {
      const session = JSON.parse(saved) as AuthResponse;
      return session.accessToken && session.expiresAtUtc && session.userName ? session : null;
    } catch {
      sessionStorage.removeItem(tokenStorageKey);
      return null;
    }
  }
}
