import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { OnboardingService } from '../../services/onboarding.service';

@Component({
  selector: 'app-accueil-redirect',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center justify-center h-screen">
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#ff8a66] mx-auto mb-4"></div>
        <p class="text-gray-500">Chargement de votre tableau de bord...</p>
      </div>
    </div>
  `,
  styles: []
})
export class AccueilRedirectComponent implements OnInit {
  constructor(
    private router: Router,
    private onboardingService: OnboardingService
  ) { }

  ngOnInit(): void {
    // Récupérer les préférences d'onboarding pour déterminer où rediriger l'utilisateur
    this.onboardingService.isOnboardingCompleted().subscribe({
      next: (response) => {
        if (response && response.result) {
          const userPreferences = {
            donations: !!response.result.donations,
            cantine: !!response.result.cantine,
            suiviVehicule: !!response.result.suiviVehicule
          };
          
          // Logique de redirection basée sur les préférences
          if (userPreferences.donations) {
            // Si donations est activé, afficher le tableau de bord des dons
            this.router.navigate(['/backoffice/accueil']);
          } else if (userPreferences.cantine) {
            // Si donations n'est pas activé mais cantine oui, rediriger vers cantine
            this.router.navigate(['/backoffice/cantine']);
          } else if (userPreferences.suiviVehicule) {
            // Si ni donations ni cantine ne sont activés mais suiviVehicule oui
            this.router.navigate(['/backoffice/vehicule']);
          } else {
            // Si aucune fonctionnalité n'est activée, rediriger vers la page d'infos
            this.router.navigate(['/backoffice/infos']);
          }
        } else {
          // En cas de réponse invalide, rediriger vers les infos
          this.router.navigate(['/backoffice/infos']);
        }
      },
      error: (error) => {
        console.error('Erreur lors de la récupération des préférences:', error);
        // En cas d'erreur, rediriger vers les infos
        this.router.navigate(['/backoffice/infos']);
      }
    });
  }
}
