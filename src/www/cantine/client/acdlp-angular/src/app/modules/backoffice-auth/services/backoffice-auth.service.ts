import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class BackofficeAuthService {

  // L'URL de base de votre API (par exemple : http://localhost:4242/api)
  private apiUrl = environment.apiUrl;

  // Flag qu'on peut utiliser pour stocker temporairement l'état «auth»
  private _isLoggedIn = false;

  constructor(
    private http: HttpClient,
    private router: Router,
  ) { }

  /**
   * SIGN IN
   * Envoie l'email et le password au backend.
   * Celui-ci renvoie un cookie HttpOnly (auth_token).
   */
  signIn(email: string, password: string): Observable<any> {
    const body = { email, password };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    // withCredentials: true => inclure les cookies cross-site
    return this.http.post<any>(`${this.apiUrl}/backoffice/signin`, body, {
      headers,
      withCredentials: true
    }).pipe(
      tap(() => {
        // Si on arrive ici, c'est que le backend n'a pas renvoyé d'erreur
        this._isLoggedIn = true;
      }),
      catchError((error) => {
        console.error('Error during sign in backoffice:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * SIGN UP
   * Envoie les champs + le document en multipart/form-data
   */
  signUp(email: string, password: string, firstName: string, lastName: string, siren: string, documentFile: File)
    : Observable<{ message: string }> {
    console.log("backoffice signup " + email + " " + siren);
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    formData.append('firstName', firstName);
    formData.append('lastName', lastName);
    formData.append('siren', siren);
    formData.append('document', documentFile);

    return this.http.post<{ message: string }>(
      `${this.apiUrl}/backoffice/signup`,
      formData,
      { withCredentials: true }
    ).pipe(
      catchError((error) => {
        console.error('Error during backoffice sign up:', error);
        return throwError(() => error);
      })
    );
  }

  // Le document est désormais envoyé au moment du signup (pas d'endpoint séparé)

  /**
   * DEMANDE DE RÉINITIALISATION DE MOT DE PASSE
   */
  requestPasswordReset(email: string): Observable<{ message: string }> {
    const body = { email };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post<{ message: string }>(
      `${this.apiUrl}/backoffice/request-password-reset`,
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
      `${this.apiUrl}/backoffice/reset-password`,
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
    this._isLoggedIn = false;

    this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true })
      .subscribe({
        next: () => {
          this.router.navigate(['/backoffice-auth/sign-in']);
        },
        error: (error) => {
          console.error('Error during logout:', error);
          this.router.navigate(['/backoffice-auth/sign-in']);
        }
      });
  }

  /**
   * Vérifie si l'utilisateur est authentifié
   * -> Appel à une route protégée côté backend (par ex. /protected-route).
   * -> Si 200 => on est authentifié, sinon 401 => pas authentifié.
   */
  isAuthenticated(): Observable<boolean> {
    return this.http.get(`${this.apiUrl}/backoffice/protected-route`, { withCredentials: true })
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

  verifyEmail(token: string): Observable<{ message: string; nextStep: string }> {
    return this.http.get<{ message: string; nextStep: string }>(
      `${this.apiUrl}/verify-email/${token}`,
      { withCredentials: true }
    ).pipe(
      catchError((error) => {
        console.error('Error during email verification:', error);
        return throwError(() => error);
      })
    );
  }

  getAssoData(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/backoffice/me`, { withCredentials: true });
  }

  /**
   * Récupère la raison sociale d'une entreprise via son SIREN
   * Appelle l'API INSEE pour obtenir la dénomination légale
   */
  getRaisonSocialeBySiren(siren: string): Observable<{ success: boolean; denomination?: string; error?: string }> {
    return this.http.get<{ success: boolean; denomination?: string; error?: string }>(
      `${this.apiUrl}/sirene/${siren}`,
      { withCredentials: true }
    ).pipe(
      catchError((error) => {
        console.error('Error fetching raison sociale:', error);
        return throwError(() => error);
      })
    );
  }
}
