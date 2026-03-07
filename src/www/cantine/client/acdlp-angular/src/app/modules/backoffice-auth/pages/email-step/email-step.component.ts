import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { BackofficeAuthService } from '../../services/backoffice-auth.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-email-step',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
  ],
  templateUrl: './email-step.component.html',
  styleUrls: ['./email-step.component.scss']
})
export class EmailStepComponent {
  emailForm: FormGroup;
  submitting = false;
  submitError = false;
  submitErrorMessage = '';
  currentYear = new Date().getFullYear();

  constructor(
    private router: Router,
    private backofficeAuthService: BackofficeAuthService,
    private fb: FormBuilder
  ) {
    this.emailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      confirmEmail: ['', [Validators.required]]
    }, {
      validators: this.emailMatchValidator
    });
  }

  private emailMatchValidator(form: FormGroup): { [key: string]: boolean } | null {
    const email = form.get('email');
    const confirmEmail = form.get('confirmEmail');
    if (!email || !confirmEmail) return null;
    return email.value === confirmEmail.value ? null : { emailMismatch: true };
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.emailForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.emailForm.get(fieldName);
    if (!field || !field.errors) return '';
    if (field.errors['required']) return 'Ce champ est obligatoire';
    if (field.errors['email']) return 'Format d\'email invalide';
    return 'Champ invalide';
  }

  onSubmit(): void {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    this.submitError = false;
    this.submitErrorMessage = '';
    this.submitting = true;

    const { email, confirmEmail } = this.emailForm.value;

    this.backofficeAuthService.requestOTP(email, confirmEmail)
      .pipe(finalize(() => { this.submitting = false; }))
      .subscribe({
        next: () => {
          this.router.navigate(['/otp-verification'], {
            state: { email }
          });
        },
        error: (error) => {
          this.submitError = true;
          this.submitErrorMessage = error.error?.message || 'Une erreur est survenue. Veuillez réessayer.';
        }
      });
  }
}
