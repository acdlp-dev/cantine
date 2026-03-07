import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'signin',
    loadComponent: () => import('./modules/backoffice-auth/backoffice-auth.component').then(c => c.BackofficeAuthComponent),
    children: [
      { path: '', loadComponent: () => import('./modules/backoffice-auth/pages/sign-in/backoffice-sign-in.component').then(c => c.BackofficeSignInComponent), data: { returnUrl: window.location.pathname } }
    ]
  },
  {
    path: 'signup',
    loadComponent: () => import('./modules/backoffice-auth/backoffice-auth.component').then(c => c.BackofficeAuthComponent),
    children: [
      { path: '', loadComponent: () => import('./modules/backoffice-auth/pages/email-step/email-step.component').then(c => c.EmailStepComponent) }
    ]
  },
  {
    path: 'otp-verification',
    loadComponent: () => import('./modules/backoffice-auth/backoffice-auth.component').then(c => c.BackofficeAuthComponent),
    children: [
      { path: '', loadComponent: () => import('./modules/backoffice-auth/pages/otp-verification/otp-verification.component').then(c => c.OtpVerificationComponent) }
    ]
  },
  {
    path: 'complete-signup',
    loadComponent: () => import('./modules/backoffice-auth/backoffice-auth.component').then(c => c.BackofficeAuthComponent),
    children: [
      { path: '', loadComponent: () => import('./modules/backoffice-auth/pages/sign-up/backoffice-sign-up.component').then(c => c.BackofficeSignUpComponent) }
    ]
  },
  {
    path: '',
    loadChildren: () => import('./modules/layout/layout.module').then((m) => m.LayoutModule),
  },
  {
    path: 'errors',
    loadChildren: () => import('./modules/error/error.module').then((m) => m.ErrorModule),
  },
  { path: '**', redirectTo: 'errors/404' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
