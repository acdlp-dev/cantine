import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BackofficeAuthService } from '../../services/backoffice-auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="my-10 space-y-6 text-center">
      <!-- Chargement -->
      @if (loading) {
        <div class="flex flex-col items-center gap-4">
          <svg class="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
            </path>
          </svg>
          <p class="text-muted-foreground">Vérification en cours...</p>
        </div>
      }

      <!-- Succès -->
      @if (!loading && success) {
        <div class="space-y-4">
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 class="text-2xl font-semibold text-foreground">Email vérifié !</h2>
          <p class="text-muted-foreground">{{ message }}</p>
          <a routerLink="/backoffice-auth/sign-in"
            class="inline-block rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Se connecter
          </a>
        </div>
      }

      <!-- Erreur -->
      @if (!loading && !success) {
        <div class="space-y-4">
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 class="text-2xl font-semibold text-foreground">Erreur de vérification</h2>
          <p class="text-muted-foreground">{{ errorMessage }}</p>
          <a routerLink="/backoffice-auth/sign-up"
            class="inline-block rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Réessayer l'inscription
          </a>
        </div>
      }
    </div>
  `
})
export class VerifyEmailComponent implements OnInit {
  loading = true;
  success = false;
  message = '';
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private backofficeAuthService: BackofficeAuthService
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.loading = false;
      this.errorMessage = 'Lien de vérification invalide.';
      return;
    }

    this.backofficeAuthService.verifyEmail(token).subscribe({
      next: (res) => {
        this.loading = false;
        this.success = true;
        this.message = res.message || 'Votre email a été vérifié avec succès. Vous pouvez maintenant vous connecter.';
      },
      error: (err) => {
        this.loading = false;
        this.success = false;
        this.errorMessage = err.error?.message || 'Le lien de vérification est invalide ou a expiré.';
      }
    });
  }
}
