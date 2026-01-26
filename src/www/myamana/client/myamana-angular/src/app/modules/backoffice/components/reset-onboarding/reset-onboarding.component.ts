import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { OnboardingService } from '../../services/onboarding.service';

@Component({
  selector: 'app-reset-onboarding',
  template: `
    <div class="p-4">
      <h1 class="text-xl font-bold mb-4">Réinitialiser l'onboarding</h1>
      <p class="mb-4">Cliquez sur le bouton ci-dessous pour réinitialiser l'état d'onboarding et voir le composant.</p>
      <button 
        (click)="resetAndRedirect()"
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        Réinitialiser et voir l'onboarding
      </button>
    </div>
  `,
  standalone: true
})
export class ResetOnboardingComponent {
  constructor(
    private router: Router,
    private onboardingService: OnboardingService
  ) {}

  resetAndRedirect(): void {
    this.onboardingService.resetOnboarding();
    this.router.navigate(['/backoffice/onboarding']);
  }
}
