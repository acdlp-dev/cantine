import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgClass, NgIf } from '@angular/common';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { BackofficeAuthService } from '../../services/backoffice-auth.service';
import { OnboardingService } from '../../../backoffice/services/onboarding.service';

@Component({
    selector: 'app-backoffice-sign-in',
    templateUrl: './backoffice-sign-in.component.html',
    styleUrls: ['./backoffice-sign-in.component.scss'],
    standalone: true,
    imports: [FormsModule, ReactiveFormsModule, RouterLink, AngularSvgIconModule, NgClass, NgIf, ButtonComponent],
})


export class BackofficeSignInComponent implements OnInit {
    loginForm!: FormGroup;
    submitted = false;
    passwordTextType!: boolean;
    errorMessage: string = ''; // Ajout de la propriété pour les erreurs
    isLoading: boolean = false; // Indicateur de chargement

    constructor(
        private readonly _formBuilder: FormBuilder,
        private readonly _router: Router,
        private backofficeAuthService: BackofficeAuthService,
        private onboardingService: OnboardingService
    ) { }

    ngOnInit(): void {
        this.loginForm = this._formBuilder.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', Validators.required],
        });
    }

    get f() {
        return this.loginForm.controls;
    }

    togglePasswordTextType() {
        this.passwordTextType = !this.passwordTextType;
    }

    onSubmit() {
        this.submitted = true;
        this.isLoading = true;
        const { email, password } = this.loginForm.value;

        if (this.loginForm.invalid) {
            this.isLoading = false; // Arrêter le chargement si le formulaire est invalide
            return;
        }

        this.backofficeAuthService.signIn(email, password).subscribe({
            next: () => {
                // En cas de succès, vérifier les dons en échec avant la redirection
                console.log('Connexion réussie, récupération des données de l\'association...');
                this.errorMessage = '';
                this.backofficeAuthService.getAssoData().subscribe({
                    next: (response) => {                        
                        // Vérifier si l'utilisateur a complété l'onboarding
                        this.onboardingService.isOnboardingCompleted().subscribe({
                            next: (onboardingResponse) => {
                                this.isLoading = false;
                                // If onboarding info present, check statut to block associations with non-ok statut
                                if (onboardingResponse && onboardingResponse.result) {
                                    const statut = onboardingResponse.result.statut;
                                    if (statut && statut !== 'ok') {
                                        // Block the association: prevent navigation and show message
                                        this.errorMessage = 'Votre compte est bloqué : amende';
                                        return;
                                    }
                                }
                                // Si l'onboarding n'est pas complété, rediriger vers la page d'onboarding
                                if (onboardingResponse && onboardingResponse.result && 
                                    (!onboardingResponse.result.isOnboarded || onboardingResponse.result.isOnboarded === 0)) {
                                    console.log('Onboarding non complété, redirection vers onboarding');
                                    this._router.navigate(['/backoffice/onboarding']);
                                } else {
                                    // Sinon, rediriger vers le tableau de bord
                                    this._router.navigate(['/backoffice']);
                                }
                            },
                            error: (onboardingErr) => {
                                console.error('Erreur lors de la vérification de l\'onboarding:', onboardingErr);
                                this.isLoading = false;
                                // En cas d'erreur, rediriger vers le backoffice
                                this._router.navigate(['/backoffice']);
                            }
                        });
                    },
                    error: (err) => {
                        this.isLoading = false; // Arrêter le chargement en cas d'erreur
                        console.error('Erreur lors de la récupération des données utilisateur:', err);
                        this._router.navigate(['/backoffice']);
                    }
                });
            },
            error: (err) => {
                this.isLoading = false; // Arrêter le chargement en cas d'erreur
                console.error('Erreur lors de la connexion :', err);
                // Si le serveur renvoie 403 avec message (compte bloqué), afficher le message exact
                if (err && err.status === 403 && err.error && err.error.message) {
                    this.errorMessage = err.error.message;
                } else if (err && err.status === 401) {
                    this.errorMessage = 'Email ou Mot de passe incorrect. Veuillez réessayer à nouveau.';
                } else {
                    this.errorMessage = 'Une erreur est survenue. Veuillez réessayer.';
                }
                this.submitted = false; // Réinitialiser le statut de soumission
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
