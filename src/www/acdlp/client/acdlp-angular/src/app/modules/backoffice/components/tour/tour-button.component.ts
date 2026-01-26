import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TourService } from '../../../../shared/services/tour.service';
import { LucideIconsModule } from '../../../../shared/modules/lucide-icons.module';
import { AutoTourService } from '../../services/auto-tour.service';

@Component({
  selector: 'app-tour-button',
  standalone: true,
  imports: [CommonModule, LucideIconsModule],
  template: `
    <button 
      (click)="startTour()"
      class="flex items-center gap-2 p-2 rounded-lg text-white bg-[#ff8a66] hover:bg-[#ff6a3c] transition-all">
      <i-lucide name="help-circle" class="w-5 h-5"></i-lucide>
      <span>Visite guidée</span>
    </button>
  `,
  styles: []
})
export class TourButtonComponent {
  constructor(
    private tourService: TourService,
    private autoTourService: AutoTourService
  ) {}

  /**
   * Démarre la visite guidée
   * Utilise les mêmes étapes que la visite guidée automatique
   */
  startTour(): void {
    // Récupère les étapes adaptées à la page courante
    this.autoTourService.getCurrentPageSteps().then(steps => {
      // Force le démarrage même si l'utilisateur a déjà vu la visite guidée
      this.tourService.startTour(steps, true);
    });
  }
}
