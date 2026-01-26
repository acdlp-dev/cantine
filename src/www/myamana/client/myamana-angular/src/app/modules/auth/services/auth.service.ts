import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of, BehaviorSubject } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  // L'URL de base de votre API (par exemple : http://localhost:4242/api)
  private apiUrl = environment.apiUrl;  

  // Flag qu'on peut utiliser pour stocker temporairement l'état «auth»
  private _isLoggedIn = false;
  
  // Stocker le rôle de l'utilisateur
  private userRole$ = new BehaviorSubject<string | null>(null);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  /**
   * SIGN IN
   * Envoie l'email et le password au backend.
   * Celui-ci renvoie un cookie HttpOnly (auth_token).
   */
  signIn(email: string, password: string): Observable<any> {
    const body = { email, password };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    // withCredentials: true => inclure les cookies cross-site
    return this.http.post<any>(`${this.apiUrl}/signin`, body, { 
      headers,
      withCredentials: true
    }).pipe(
      tap(() => {
        // Si on arrive ici, c’est que le backend n’a pas renvoyé d’erreur
        this._isLoggedIn = true;
        // Redirection vers le dashboard
        this.router.navigate(['/dashboard']);
      }),
      catchError((error) => {
        console.error('Error during sign in:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * SIGN UP - Nouveau flux simplifié
   * Maintenant uniquement avec l'email, le prénom/nom et mot de passe sont demandés plus tard
   */
  signUp(email: string): Observable<{ message: string }> {
    console.log("signup " + email);
    const body = { email };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post<{ message: string }>(
      `${this.apiUrl}/signup`,
      body,
      { headers, withCredentials: true }
    ).pipe(
      catchError((error) => {
        console.error('Error during sign up:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * SET PASSWORD - Nouvelle méthode pour définir le mot de passe après vérification d'email
   */
  setPassword(token: string, email: string, password: string, confirmPassword: string, firstName: string, lastName: string)
    : Observable<{ message: string }> {
    const body = { token, email, password, confirmPassword, firstName, lastName };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post<{ message: string }>(
      `${this.apiUrl}/set-password`,
      body,
      { headers, withCredentials: true }
    ).pipe(
      catchError((error) => {
        console.error('Error during set password:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * DEMANDE DE RÉINITIALISATION DE MOT DE PASSE
   */
  requestPasswordReset(email: string): Observable<{ message: string }> {
    const body = { email };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post<{ message: string }>(
      `${this.apiUrl}/request-password-reset`,
      body,
      { headers, withCredentials: true }
    ).pipe(
      catchError((error) => {
        console.error('Error during password reset request:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * RÉINITIALISER LE MOT DE PASSE AVEC UN TOKEN
   */
  resetPasswordWithToken(token: string, newPassword: string, confirmPassword: string)
    : Observable<{ message: string }> {
    const body = { token, newPassword, confirmPassword };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post<{ message: string }>(
      `${this.apiUrl}/reset-password`,
      body,
      { headers, withCredentials: true }
    ).pipe(
      catchError((error) => {
        console.error('Error during password reset:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * LOGOUT
   * Appelle l'endpoint /logout côté serveur, qui supprime le cookie.
   */
  logout(): void {
    this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true })
      .subscribe({
        next: () => {
          this._isLoggedIn = false;
          this.router.navigate(['/auth/sign-in']);
        },
        error: (error) => {
          console.error('Error during logout:', error);
          this.router.navigate(['/auth/sign-in']);
        }
      });
  }

  /**
   * Vérifie si l'utilisateur est authentifié
   * -> Appel à une route protégée côté backend (par ex. /protected-route).
   * -> Si 200 => on est authentifié, sinon 401 => pas authentifié.
   */
  isAuthenticated(): Observable<boolean> {
    return this.http.get(`${this.apiUrl}/protected-route`, { withCredentials: true })
      .pipe(
        map(() => {
          this._isLoggedIn = true;
          return true;
        }),
        catchError(() => {
          this._isLoggedIn = false;
          return of(false);
        })
      );
  }

  /**
   * Une fonction de confort pour accéder à l’état local sans ping le serveur
   */
  isLoggedInLocally(): boolean {
    return this._isLoggedIn;
  }

  getUserData(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/me`, { withCredentials: true }).pipe(
      tap((data: any) => {
        // Stocker le rôle de l'utilisateur
        if (data && data.role) {
          this.userRole$.next(data.role);
          console.log(`[AuthService] Rôle utilisateur: ${data.role}`);
        }
      })
    );
  }
  
  /**
   * Vérifie si l'utilisateur connecté est un admin
   */
  isAdmin(): Observable<boolean> {
    return this.userRole$.pipe(
      map(role => role === 'admin')
    );
  }
  
  /**
   * Récupère le rôle actuel de l'utilisateur
   */
  getUserRole(): string | null {
    return this.userRole$.value;
  }
}
