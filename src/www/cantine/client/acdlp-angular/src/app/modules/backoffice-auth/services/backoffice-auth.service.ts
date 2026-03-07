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

  private apiUrl = environment.apiUrl;

  private _isLoggedIn = false;

  constructor(
    private http: HttpClient,
    private router: Router,
  ) { }

  signIn(email: string, password: string): Observable<any> {
    const body = { email, password };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post<any>(`${this.apiUrl}/backoffice/signin`, body, {
      headers,
      withCredentials: true
    }).pipe(
      tap(() => {
        this._isLoggedIn = true;
      }),
      catchError((error) => {
        console.error('Error during sign in backoffice:', error);
        return throwError(() => error);
      })
    );
  }

  requestOTP(email: string, confirmEmail: string): Observable<any> {
    const body = { email, confirmEmail };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post<any>(
      `${this.apiUrl}/backoffice/request-otp`,
      body,
      { headers, withCredentials: true }
    ).pipe(
      catchError((error) => {
        console.error('Error during OTP request:', error);
        return throwError(() => error);
      })
    );
  }

  verifyOTP(email: string, code: string): Observable<{ message: string; token: string; email: string }> {
    const body = { email, code };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post<{ message: string; token: string; email: string }>(
      `${this.apiUrl}/backoffice/verify-otp`,
      body,
      { headers, withCredentials: true }
    ).pipe(
      catchError((error) => {
        console.error('Error during OTP verification:', error);
        return throwError(() => error);
      })
    );
  }

  completeSignup(token: string, email: string, password: string, confirmPassword: string,
    firstName: string, lastName: string, rna: string, documentFile: File): Observable<{ message: string }> {
    const formData = new FormData();
    formData.append('token', token);
    formData.append('email', email);
    formData.append('password', password);
    formData.append('confirmPassword', confirmPassword);
    formData.append('firstName', firstName);
    formData.append('lastName', lastName);
    formData.append('rna', rna);
    formData.append('document', documentFile);

    return this.http.post<{ message: string }>(
      `${this.apiUrl}/backoffice/complete-signup`,
      formData,
      { withCredentials: true }
    ).pipe(
      catchError((error) => {
        console.error('Error during complete signup:', error);
        return throwError(() => error);
      })
    );
  }

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

  logout(): void {
    this._isLoggedIn = false;

    this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true })
      .subscribe({
        next: () => {
          this.router.navigate(['/signin']);
        },
        error: (error) => {
          console.error('Error during logout:', error);
          this.router.navigate(['/signin']);
        }
      });
  }

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

  isLoggedInLocally(): boolean {
    return this._isLoggedIn;
  }

  getAssoData(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/backoffice/me`, { withCredentials: true });
  }

  getRaisonSocialeByRna(rna: string): Observable<{ success: boolean; denomination?: string; position?: string; error?: string }> {
    return this.http.get<{ success: boolean; denomination?: string; position?: string; error?: string }>(
      `${this.apiUrl}/rna/${rna}`,
      { withCredentials: true }
    ).pipe(
      catchError((error) => {
        console.error('Error fetching association name:', error);
        return throwError(() => error);
      })
    );
  }
}
