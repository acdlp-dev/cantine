import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgClass, NgIf } from '@angular/common';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { AuthService } from '../../services/auth.service';
import { FailedDonationsService } from '../../../../core/services/failed-donations.service';

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.scss'],
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, RouterLink, AngularSvgIconModule, NgClass, NgIf, ButtonComponent],
})
export class SignInComponent implements OnInit {
  form!: FormGroup;
  submitted = false;
  passwordTextType!: boolean;
  errorMessage: string = ''; // Ajout de la propriété pour les erreurs

  constructor(
    private readonly _formBuilder: FormBuilder,
    private readonly _router: Router,
    private authService: AuthService,
    private failedDonationsService: FailedDonationsService
  ) { }

  ngOnInit(): void {
    this.form = this._formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  get f() {
    return this.form.controls;
  }

  togglePasswordTextType() {
    this.passwordTextType = !this.passwordTextType;
  }

  onSubmit() {
    this.submitted = true;
    const { email, password } = this.form.value;

    if (this.form.invalid) {
      return;
    }

    this.authService.signIn(email, password).subscribe({
      next: () => {
        // En cas de succès, vérifier les dons en échec avant la redirection
        this.errorMessage = '';
        this.authService.getUserData().subscribe({
          next: (response) => {
            if (response && response.email) {
              // Forcer la réinitialisation du service pour vérifier les dons en échec
              this.failedDonationsService['checkFailedDonations'](response.email);
            }
            this._router.navigate(['/dashboard']);
          },
          error: (err) => {
            console.error('Erreur lors de la récupération des données utilisateur:', err);
            this._router.navigate(['/dashboard']);
          }
        });
      },
      error: (err) => {
        console.error('Erreur lors de la connexion :', err);
        // Si l'erreur vient d'un mot de passe incorrect
        if (err.status === 401) {
          this.errorMessage = 'Email ou Mot de passe incorrect. Veuillez réessayer à nouveau.';
        } else {
          this.errorMessage = 'Une erreur est survenue. Veuillez réessayer.';
        }
      },
    });
  }

  onKeyDown(event: Event): void {
    const keyboardEvent = event as KeyboardEvent; // Force le typage
    if (keyboardEvent.key === 'Enter') {
      keyboardEvent.preventDefault(); // Empêche le comportement par défaut
      this.onSubmit(); // Déclenche la soumission
    }
  }
}
