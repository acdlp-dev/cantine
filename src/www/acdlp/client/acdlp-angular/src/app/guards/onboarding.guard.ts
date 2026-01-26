import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { OnboardingService } from '../modules/backoffice/services/onboarding.service';
import { Observable, of, map, catchError } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class OnboardingGuard implements CanActivate {
    constructor(
        private router: Router,
        private onboardingService: OnboardingService
    ) { }

    canActivate(): Observable<boolean | UrlTree> {
        // Vérification asynchrone de l'état d'onboarding
        return this.onboardingService.isOnboardingCompleted().pipe(
            map(response => {
                // Si l'onboarding n'est pas complété, rediriger vers la page d'onboarding
                if (response && response.result && 
                    (!response.result.isOnboarded || response.result.isOnboarded === 0)) {
                    return this.router.parseUrl('/backoffice/onboarding');
                }
                // Sinon, permettre l'accès au backoffice
                return true;
            }),
            catchError(() => {
                // En cas d'erreur, permettre l'accès
                return of(true);
            })
        );
    }
}
