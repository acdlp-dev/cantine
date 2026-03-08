import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackofficeAuthService } from '../../services/backoffice-auth.service';
import { AuthLayoutComponent } from '../../../../shared/components/auth-layout/auth-layout.component';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AuthLayoutComponent],
})
export class ForgotPasswordComponent {
  isMailSent = false;
  email: string = '';
  errorMessage: string = '';

  constructor(
    private authService: BackofficeAuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    if (!this.email) {
      this.errorMessage = 'Veuillez saisir une adresse email.';
      return;
    }

    this.errorMessage = '';
    this.authService.requestPasswordReset(this.email).subscribe({
      next: () => {
        this.isMailSent = true;
      },
      error: (err: any) => {
        console.error('Erreur lors de la demande de réinitialisation :', err);
        this.errorMessage = 'Si cette adresse email est valide, un email a été envoyé.';
      },
    });
  }
}
