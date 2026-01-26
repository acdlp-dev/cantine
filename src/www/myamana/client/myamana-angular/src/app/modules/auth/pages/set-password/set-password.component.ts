import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { AngularSvgIconModule } from 'angular-svg-icon';

@Component({
  selector: 'app-set-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    AngularSvgIconModule
  ],
  templateUrl: './set-password.component.html',
  styleUrls: ['./set-password.component.scss']
})
export class SetPasswordComponent implements OnInit {
  setPasswordForm: FormGroup;
  submitted = false;
  loading = false;
  success = false;
  errorMessage = '';
  token: string = '';
  email: string = '';

  // Password strength indicators
  passwordStrength: number = 0;
  passwordTextType: boolean = false;
  hasMinLength = false;
  hasLetter = false;
  hasNumber = false;
  hasSpecialChar = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router
  ) {
    this.setPasswordForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      password: ['', [Validators.required]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    // Récupérer le token et l'email depuis les query parameters
    this.route.queryParams.subscribe(params => {
      this.token = params['token'];
      this.email = params['email'];
    });
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
    const password = this.setPasswordForm.get('password')?.value;
    const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d\s])[A-Za-z\d\S]{8,}$/;
    return regex.test(password);
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';

    if (this.setPasswordForm.invalid) {
      return;
    }

    if (!this.isPasswordValid()) {
      this.errorMessage = 'Le mot de passe doit contenir au moins 8 caractères, une lettre, un chiffre et un caractère spécial.';
      return;
    }

    const { firstName, lastName, password, confirmPassword } = this.setPasswordForm.value;

    if (password !== confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas.';
      return;
    }

    this.loading = true;

    this.authService.setPassword(this.token, this.email, password, confirmPassword, firstName, lastName)
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.success = true;
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage = error.error?.message || 'Une erreur est survenue lors de la création de votre compte.';
          console.error('Error setting password:', error);
        }
      });
  }

  getPasswordStrengthColor(): string {
    switch (this.passwordStrength) {
      case 0: return 'bg-red-500';
      case 1: return 'bg-orange-500';
      case 2: return 'bg-yellow-500';
      case 3: return 'bg-green-500';
      case 4: return 'bg-green-600';
      default: return 'bg-gray-300';
    }
  }

  getPasswordStrengthText(): string {
    switch (this.passwordStrength) {
      case 0: return 'Très faible';
      case 1: return 'Faible';
      case 2: return 'Moyen';
      case 3: return 'Fort';
      case 4: return 'Très fort';
      default: return '';
    }
  }
}
