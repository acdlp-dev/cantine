import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OnboardingService } from '../../services/onboarding.service';

interface ServiceOption {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
}

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './onboarding.component.html'
})
export class OnboardingComponent implements OnInit {
  isFirstLogin: boolean = true;
  isLoading: boolean = false;
  hasCantine: boolean = false; // Flag pour déterminer si cantine = 1
  services: ServiceOption[] = [
    {
      id: 'donations',
      title: 'Collecter des dons',
      description: 'Gérer des campagnes de dons et suivre vos donateurs',
      enabled: false
    },
    {
      id: 'vehicle',
      title: 'Suivi du véhicule',
      description: 'Suivre l\'utilisation et la maintenance de vos véhicules',
      enabled: false
    }
  ];

  constructor(
    private router: Router,
    private onboardingService: OnboardingService
  ) { }

  ngOnInit(): void {
    // Récupérer les données d'onboarding pour vérifier le statut et le flag cantine
    this.onboardingService.isOnboardingCompleted().subscribe({
      next: (response) => {
        if (response && response.result) {
          const result = response.result;

          // Si déjà complété, rediriger
          if (result.isOnboarded === 1 || result.isOnboarded === true) {
            this.router.navigate(['/backoffice']);
            return;
          }

          // Récupérer le flag cantine
          this.hasCantine = result.cantine === 1 || result.cantine === true;

          // Pré-cocher les services déjà activés
          if (result.donations === 1 || result.donations === true) {
            const donService = this.services.find(s => s.id === 'donations');
            if (donService) donService.enabled = true;
          }
          if (result.suiviVehicule === 1 || result.suiviVehicule === true) {
            const vehicleService = this.services.find(s => s.id === 'vehicle');
            if (vehicleService) vehicleService.enabled = true;
          }
        }
      },
      error: (error) => {
        console.error('Erreur lors de la vérification du statut d\'onboarding:', error);
      }
    });
  }

  toggleService(serviceId: string): void {
    const service = this.services.find(s => s.id === serviceId);
    if (service) {
      service.enabled = !service.enabled;
    }
  }

  confirmChoice(): void {
    // Sauvegarder les choix et rediriger vers le dashboard
    const enabledServices = this.services.filter(s => s.enabled).map(s => s.id);
    
    this.isLoading = true;
    // On complète l'onboarding sans marquer le tutoriel comme terminé
    this.onboardingService.completeOnboarding(enabledServices, false).subscribe({
      next: (success) => {
        if (success) {
          // Si cantine = 1 et aucun service supplémentaire choisi, aller directement à la cantine
          if (this.hasCantine && enabledServices.length === 0) {
            this.router.navigate(['/cantine/accueil']);
          } else {
            // Sinon rediriger vers l'accueil backoffice
            this.router.navigate(['/backoffice/accueil']);
          }
        }
      },
      error: (error) => {
        console.error('Erreur lors de la sauvegarde des préférences:', error);
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }
  
  atLeastOneServiceEnabled(): boolean {
    return this.services.some(s => s.enabled);
  }
}
