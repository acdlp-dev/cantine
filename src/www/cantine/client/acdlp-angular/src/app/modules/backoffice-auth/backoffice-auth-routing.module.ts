import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BackofficeAuthComponent } from './backoffice-auth.component';
import { BackofficeSignInComponent } from './pages/sign-in/backoffice-sign-in.component';
import { BackofficeSignUpComponent } from './pages/sign-up/backoffice-sign-up.component';

const routes: Routes = [
  {
    path: '',
    component: BackofficeAuthComponent,
    children: [
      { path: '', redirectTo: 'sign-in', pathMatch: 'full' },
      { path: 'sign-in', component: BackofficeSignInComponent, data: { returnUrl: window.location.pathname } },
      {
        path: 'sign-up',
        loadComponent: () => import('./pages/email-step/email-step.component').then(m => m.EmailStepComponent),
      },
      {
        path: 'otp-verification',
        loadComponent: () => import('./pages/otp-verification/otp-verification.component').then(m => m.OtpVerificationComponent),
      },
      {
        path: 'complete-signup',
        component: BackofficeSignUpComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BackofficeAuthRoutingModule { }
