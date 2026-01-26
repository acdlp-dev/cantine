import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TourService } from '../../../../shared/services/tour.service';
import { AutoTourService } from '../../services/auto-tour.service';
import { OnboardingService } from '../../services/onboarding.service';
import { LucideIconsModule } from '../../../../shared/modules/lucide-icons.module';

@Component({
  selector: 'app-parametres',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideIconsModule],
  templateUrl: './parametres.component.html',
  styles: []
})
export class ParametresComponent implements OnInit {
  resetSuccess = false;
  
  // Préférences d'onboarding
  userPreferences: {
    donations: boolean;
    cantine: boolean;
    suiviVehicule: boolean;
  } = {
    donations: true,
    cantine: true,
    suiviVehicule: true
  };
  
  constructor(
    private tourService: TourService,
    private autoTourService: AutoTourService,
    private onboardingService: OnboardingService
  ) {}

  ngOnInit(): void {
    
  }

  savePreferences(): void {
    const services: string[] = [];
    if (this.userPreferences.donations) services.push('donations');
    if (this.userPreferences.cantine) services.push('cantine');
    if (this.userPreferences.suiviVehicule) services.push('vehicle');

    this.onboardingService.completeOnboarding(services, false, this.userPreferences.donations || this.userPreferences.cantine || this.userPreferences.suiviVehicule)
      .subscribe({
        next: (ok) => {
          this.resetSuccess = true;
          setTimeout(() => this.resetSuccess = false, 3000);
        },
        error: (err) => {
          console.error('Erreur lors de la sauvegarde des préférences d\'onboarding', err);
        }
      });
  }

}
