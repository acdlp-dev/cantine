import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { BackofficeAuthService } from '../../services/backoffice-auth.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-otp-verification',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
  ],
  templateUrl: './otp-verification.component.html',
  styleUrls: ['./otp-verification.component.scss']
})
export class OtpVerificationComponent implements OnInit, OnDestroy {
  otpForm: FormGroup;
  email = '';
  submitting = false;
  submitError = false;
  submitErrorMessage = '';
  currentYear = new Date().getFullYear();

  // Timer pour le code OTP (10 minutes = 600 secondes)
  timeRemaining = 600;
  timerInterval: any;

  constructor(
    private router: Router,
    private backofficeAuthService: BackofficeAuthService,
    private fb: FormBuilder
  ) {
    this.otpForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    });
  }

  ngOnInit(): void {
    // Récupérer l'email depuis le state de navigation (history.state persiste après lazy-loading)
    const state = history.state;
    if (state?.email) {
      this.email = state.email;
    }

    if (!this.email) {
      this.router.navigate(['/signup']);
      return;
    }
    this.startTimer();
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  startTimer(): void {
    this.timerInterval = setInterval(() => {
      this.timeRemaining--;
      if (this.timeRemaining <= 0) {
        clearInterval(this.timerInterval);
        this.submitError = true;
        this.submitErrorMessage = 'Le code a expiré. Veuillez demander un nouveau code.';
      }
    }, 1000);
  }

  get timerDisplay(): string {
    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = this.timeRemaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.otpForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.otpForm.get(fieldName);
    if (!field || !field.errors) return '';
    if (field.errors['required']) return 'Le code est obligatoire';
    if (field.errors['pattern']) return 'Le code doit contenir 6 chiffres';
    return 'Code invalide';
  }

  onSubmit(): void {
    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      return;
    }

    this.submitError = false;
    this.submitErrorMessage = '';
    this.submitting = true;

    const { code } = this.otpForm.value;

    this.backofficeAuthService.verifyOTP(this.email, code)
      .pipe(finalize(() => { this.submitting = false; }))
      .subscribe({
        next: (response) => {
          if (this.timerInterval) {
            clearInterval(this.timerInterval);
          }
          this.router.navigate(['/complete-signup'], {
            state: {
              token: response.token,
              email: response.email
            }
          });
        },
        error: (error) => {
          this.submitError = true;
          this.submitErrorMessage = error.error?.message || 'Code invalide ou expiré.';
        }
      });
  }

  resendCode(): void {
    this.submitError = false;
    this.submitting = true;

    this.backofficeAuthService.requestOTP(this.email, this.email)
      .pipe(finalize(() => { this.submitting = false; }))
      .subscribe({
        next: () => {
          this.timeRemaining = 600;
          if (this.timerInterval) {
            clearInterval(this.timerInterval);
          }
          this.startTimer();
        },
        error: (error) => {
          this.submitError = true;
          this.submitErrorMessage = error.error?.message || 'Impossible de renvoyer le code.';
        }
      });
  }
}
