import { Routes } from '@angular/router';
// AUTH-DISABLED: import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  // AUTH-DISABLED: login and register routes
  // {
  //   path: 'login',
  //   loadComponent: () => import('./auth/auth-page.component').then((module) => module.AuthPageComponent),
  //   data: { mode: 'login' },
  // },
  // {
  //   path: 'register',
  //   loadComponent: () => import('./auth/auth-page.component').then((module) => module.AuthPageComponent),
  //   data: { mode: 'register' },
  // },
  {
    path: 'workspace',
    // AUTH-DISABLED: canActivate: [authGuard],
    loadComponent: () =>
      import('./workspace/workspace.component').then((module) => module.WorkspaceComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'workspace' },
  { path: '**', redirectTo: 'workspace' },
];
