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
      // { path: 'forgot-password', component: ForgotPasswordComponent },
      // { path: 'forgot-password/token/:token', component: ForgotPasswordComponent },
      // { path: 'new-password/token/:token', component: NewPasswordComponent },
      // //{ path: 'two-steps', component: TwoStepsComponent },
      // { path: 'verify-email/token/:token', component: VerifyEmailComponent },
      // { path: 'confirmation', component: ConfirmationComponent },
      // //{ path: '**', redirectTo: 'sign-titi', pathMatch: 'full' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BackofficeAuthRoutingModule { }
