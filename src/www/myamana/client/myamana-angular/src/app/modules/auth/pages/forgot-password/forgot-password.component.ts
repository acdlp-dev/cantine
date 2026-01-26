import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { AuthService } from '../../services/auth.service';
import { ConfirmationComponent } from 'src/app/shared/components/confirmation/confirmation.component';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent,ConfirmationComponent],
})
export class ForgotPasswordComponent {
  isMailSent = false;
  email: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit(): void {
    if (!this.email) {
      alert('Veuillez saisir une adresse email.');
      return;
    }

    this.authService.requestPasswordReset(this.email).subscribe({
      next: () => {
        this.isMailSent = true;
      },
      error: (err: any) => {
        console.error('Erreur lors de la demande de réinitialisation :', err);
        // Message générique pour éviter l'énumération d'utilisateurs
        alert('Si cette adresse email est valide, un email a été envoyé.');
      },
    });
  }
}
