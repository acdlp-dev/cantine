import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthComponent } from './auth.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { NewPasswordComponent } from './pages/new-password/new-password.component';
import { SignInComponent } from './pages/sign-in/sign-in.component';
import { SignUpComponent } from './pages/sign-up/sign-up.component';
import { TwoStepsComponent } from './pages/two-steps/two-steps.component';
import { VerifyEmailComponent } from './pages/verify-email/verify-email.component';
import { ConfirmationComponent } from '../../shared/components/confirmation/confirmation.component';
import { SetPasswordComponent } from './pages/set-password/set-password.component';

const routes: Routes = [
  {
    path: '',
    component: AuthComponent,
    children: [
      { path: '', redirectTo: 'sign-in', pathMatch: 'full' },
      { path: 'sign-in', component: SignInComponent, data: { returnUrl: window.location.pathname } },
      { path: 'sign-up', component: SignUpComponent },
      { path: 'forgot-password', component: ForgotPasswordComponent },
      { path: 'forgot-password/token/:token', component: ForgotPasswordComponent },
      { path: 'new-password/token/:token', component: NewPasswordComponent },
      { path: 'set-password', component: SetPasswordComponent },
      //{ path: 'two-steps', component: TwoStepsComponent },
      { path: 'verify-email/token/:token', component: VerifyEmailComponent },
      { path: 'confirmation', component: ConfirmationComponent },
      //{ path: '**', redirectTo: 'sign-titi', pathMatch: 'full' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AuthRoutingModule {}
