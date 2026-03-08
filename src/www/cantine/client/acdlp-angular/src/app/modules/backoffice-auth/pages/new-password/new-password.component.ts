import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackofficeAuthService } from '../../services/backoffice-auth.service';

@Component({
  selector: 'app-new-password',
  templateUrl: './new-password.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class NewPasswordComponent implements OnInit {
  token: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  isSubmitting: boolean = false;
  showNewPassword = false;
  showConfirmPassword = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: BackofficeAuthService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (!this.token) {
      this.errorMessage = 'Token de réinitialisation invalide.';
    }
  }

  isPasswordValid(): boolean {
    return this.newPassword.length >= 6;
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.isPasswordValid()) {
      this.errorMessage = 'Le mot de passe doit contenir au moins 6 caractères.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas.';
      return;
    }

    this.isSubmitting = true;

    this.authService.resetPasswordWithToken(this.token, this.newPassword, this.confirmPassword).subscribe({
      next: (response) => {
        this.successMessage = 'Votre mot de passe a été réinitialisé avec succès ! Vous allez être redirigé vers la page de connexion...';

        setTimeout(() => {
          this.router.navigate(['/signin']);
        }, 3000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Une erreur est survenue lors de la réinitialisation du mot de passe.';
        this.isSubmitting = false;
      },
    });
  }

  toggleNewPasswordVisibility(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }
}
