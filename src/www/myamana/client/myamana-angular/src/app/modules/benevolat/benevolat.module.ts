import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { BenevolatRoutingModule } from './benevolat-routing.module';
import { BenevolatComponent } from './benevolat.component';
import { VolunteerFormComponent } from './pages/volunteer-form/volunteer-form.component';
import { VolunteerVerifyComponent } from './pages/volunteer-verify/volunteer-verify.component';
import { VolunteerProfileComponent } from './pages/volunteer-profile/volunteer-profile.component';
import { VolunteerSigninComponent } from './pages/volunteer-signin/volunteer-signin.component';
import { VolunteerDashboardComponent } from './pages/volunteer-dashboard/volunteer-dashboard.component';
import { VolunteerActionsComponent } from './pages/volunteer-actions/volunteer-actions.component';
import { VolunteerForgotPasswordComponent } from './pages/volunteer-forgot-password/volunteer-forgot-password.component';
import { VolunteerNewPasswordComponent } from './pages/volunteer-new-password/volunteer-new-password.component';
import { VolunteerEmailStepComponent } from './pages/volunteer-email-step/volunteer-email-step.component';
import { VolunteerOtpVerificationComponent } from './pages/volunteer-otp-verification/volunteer-otp-verification.component';
import { VolunteerCompleteSignupComponent } from './pages/volunteer-complete-signup/volunteer-complete-signup.component';


@NgModule({
  declarations: [
    VolunteerProfileComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    BenevolatRoutingModule,
    BenevolatComponent,
    VolunteerFormComponent,
    VolunteerVerifyComponent,
    VolunteerSigninComponent,
    VolunteerDashboardComponent,
    VolunteerActionsComponent,
    VolunteerForgotPasswordComponent,
    VolunteerNewPasswordComponent,
    VolunteerEmailStepComponent,
    VolunteerOtpVerificationComponent,
    VolunteerCompleteSignupComponent
  ],
})
export class BenevolatModule {}
