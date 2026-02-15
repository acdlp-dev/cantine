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
      { path: 'sign-up', component: BackofficeSignUpComponent },
      {
        path: 'verify-email/token/:token',
        loadComponent: () => import('./pages/verify-email/verify-email.component').then(c => c.VerifyEmailComponent)
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BackofficeAuthRoutingModule { }
