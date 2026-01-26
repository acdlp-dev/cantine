import { Component } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { AuthService } from '../../services/auth.service';
import { ConfirmationComponent } from 'src/app/shared/components/confirmation/confirmation.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-new-password',
  templateUrl: './new-password.component.html',
  styleUrls: ['./new-password.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AngularSvgIconModule, ButtonComponent, ConfirmationComponent],
})

export class NewPasswordComponent {
  token: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  isPwdChanged: boolean = false;
  submitted: boolean = false;
  passwordStrength: number = 0;
  passwordTextType: boolean = false;
  hasMinLength = false;
  hasLetter = false;
  hasNumber = false;
  hasSpecialChar = false;
  userRole: string | null = null;

  constructor(private route: ActivatedRoute, private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.params['token'];
    console.log("Le token est : " + this.token);
  }

  updatePasswordStrength(password: string): void {
    let strength = 0;

    // Critère 1: Au moins 8 caractères
    this.hasMinLength = password.length >= 8;
    if (this.hasMinLength) {
      strength++;
    }

    // Critère 2: Au moins une lettre
    this.hasLetter = /[A-Za-z]/.test(password);
    if (this.hasLetter) {
      strength++;
    }

    // Critère 3: Au moins un chiffre
    this.hasNumber = /\d/.test(password);
    if (this.hasNumber) {
      strength++;
    }

    // Critère 4: Au moins un caractère spécial
    this.hasSpecialChar = /[^A-Za-z\d\s]/.test(password);
    if (this.hasSpecialChar) {
      strength++;
    }

    this.passwordStrength = strength;
  }

  togglePasswordTextType(): void {
    this.passwordTextType = !this.passwordTextType;
  }

  isPasswordValid(): boolean {
    const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d\s])[A-Za-z\d\S]{8,}$/;
    return regex.test(this.newPassword);
  }

  onSubmit(): void {
    this.submitted = true;

    if (!this.newPassword || !this.confirmPassword) {
      alert('Tous les champs sont obligatoires.');
      return;
    }

    if (!this.isPasswordValid()) {
      console.error('Le mot de passe ne respecte pas les règles de sécurité.');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      console.error('Les mots de passe ne correspondent pas.');
      return;
    }

    this.authService.resetPasswordWithToken(this.token, this.newPassword, this.confirmPassword).subscribe({
      next: (res: any) => {
        this.isPwdChanged = true;
        this.userRole = res.user.role || null;
      },
      error: (err) => {
        console.error('Erreur lors de la réinitialisation du mot de passe :', err);
        alert('Une erreur est survenue.');
      },
    });
  }

  getRedirectLink(): string {
    switch (this.userRole) {
      case 'association':
        return '/backoffice-auth/sign-in';
      case 'donatorr':
        return '/auth/sign-in';
      default:
        return '/dashboard';
    }
  }
}
