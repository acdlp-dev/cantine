import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, map, catchError, of } from 'rxjs';
import { OnboardingService } from '../modules/backoffice/services/onboarding.service';

@Injectable({
  providedIn: 'root'
})
export class FeatureAccessGuard implements CanActivate {
  constructor(
    private router: Router,
    private onboardingService: OnboardingService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    // Extraire le type de fonctionnalité à vérifier depuis les données de la route
    const requiredFeature = route.data['requiredFeature'] as 'donations' | 'cantine' | 'suiviVehicule' | 'benevolat';
    
    if (!requiredFeature) {
      console.error('FeatureAccessGuard: No requiredFeature specified in route data');
      return of(false);
    }

    return this.onboardingService.isOnboardingCompleted().pipe(
      map(response => {
        if (response && response.result) {
          // Vérifier si la fonctionnalité spécifiée est activée
          const isFeatureEnabled = !!response.result[requiredFeature];
                    
          if (!isFeatureEnabled) {
            // Si la fonctionnalité n'est pas activée, rediriger vers le tableau de bord
            return this.router.parseUrl('/backoffice');
          }
          
          // Autoriser l'accès si la fonctionnalité est activée
          return true;
        }
        
        // En cas de réponse invalide, rediriger vers le tableau de bord
        return this.router.parseUrl('/backoffice');
      }),
      catchError(error => {
        console.error('Erreur lors de la vérification des préférences d\'onboarding:', error);
        // En cas d'erreur, rediriger vers le tableau de bord
        return of(this.router.parseUrl('/backoffice'));
      })
    );
  }
}
