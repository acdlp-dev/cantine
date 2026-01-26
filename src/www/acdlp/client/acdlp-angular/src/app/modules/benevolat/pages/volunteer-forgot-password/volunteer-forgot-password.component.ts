import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VolunteerService } from '../../services/volunteer.service';
import { AuthLayoutComponent } from '../../../../shared/components/auth-layout/auth-layout.component';

@Component({
  selector: 'app-volunteer-forgot-password',
  templateUrl: './volunteer-forgot-password.component.html',
  styleUrls: ['./volunteer-forgot-password.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AuthLayoutComponent],
})
export class VolunteerForgotPasswordComponent {
  isMailSent = false;
  email: string = '';
  errorMessage: string = '';

  constructor(
    private volunteerService: VolunteerService,
    private router: Router
  ) {}

  onSubmit(): void {
    if (!this.email) {
      this.errorMessage = 'Veuillez saisir une adresse email.';
      return;
    }

    this.errorMessage = '';
    this.volunteerService.requestPasswordReset(this.email).subscribe({
      next: () => {
        this.isMailSent = true;
      },
      error: (err: any) => {
        console.error('Erreur lors de la demande de réinitialisation :', err);
        // Message générique pour éviter l'énumération d'utilisateurs
        this.errorMessage = 'Si cette adresse email est valide, un email a été envoyé.';
      },
    });
  }
}
