import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../modules/auth/services/auth.service';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.authService.isAuthenticated().pipe(
      map((isAuthenticated) => {
        if (isAuthenticated) {
          console.log("✅ Accès autorisé : utilisateur connecté");
          return true;
        } else {
          console.warn("❌ Accès refusé : redirection vers la page de connexion");
          return this.router.createUrlTree(['/auth/sign-in']);
        }
      }),
      catchError((err) => {
        console.error("Erreur lors de la vérification de l'authentification", err);
        // Renvoie un observable contenant le UrlTree
        return of(this.router.createUrlTree(['/auth/sign-in']));
      })
    );
  }
}
