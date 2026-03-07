import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BackofficeAuthService } from '../../services/backoffice-auth.service';

@Component({
    selector: 'app-backoffice-sign-in',
    templateUrl: './backoffice-sign-in.component.html',
    styleUrls: ['./backoffice-sign-in.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
})

export class BackofficeSignInComponent implements OnInit {
    loginForm!: FormGroup;
    submitted = false;
    passwordTextType = false;
    errorMessage = '';
    isLoading = false;
    currentYear: number = new Date().getFullYear();

    constructor(
        private readonly _formBuilder: FormBuilder,
        private readonly _router: Router,
        private backofficeAuthService: BackofficeAuthService,
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
            this.isLoading = false;
            return;
        }

        this.backofficeAuthService.signIn(email, password).subscribe({
            next: () => {
                this.errorMessage = '';
                this._router.navigate(['/backoffice']);
            },
            error: (err) => {
                this.isLoading = false;
                if (err && err.status === 403 && err.error && err.error.message) {
                    this.errorMessage = err.error.message;
                } else if (err && err.status === 401) {
                    this.errorMessage = 'Email ou Mot de passe incorrect. Veuillez réessayer à nouveau.';
                } else {
                    this.errorMessage = 'Une erreur est survenue. Veuillez réessayer.';
                }
                this.submitted = false;
            },
        });
    }

    onKeyDown(event: Event): void {
        const keyboardEvent = event as KeyboardEvent;
        if (keyboardEvent.key === 'Enter') {
            keyboardEvent.preventDefault();
            this.onSubmit();
        }
    }
}
