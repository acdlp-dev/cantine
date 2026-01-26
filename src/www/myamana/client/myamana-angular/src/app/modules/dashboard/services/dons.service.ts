import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AdminViewerService } from './admin-viewer.service';

interface ModifySubscriptionParams {
  subscriptionId: string;
  asso: string;
  amount?: number;
  billingDay?: string;
  paymentMethod?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  occurrence?: 'mensuel' | 'quotidien';
}

@Injectable({
  providedIn: 'root',
})
export class DonsService {

  // L'URL de base de votre API (par exemple : http://localhost:4242/api)
  private apiUrl = environment.apiUrl;

  // Flag qu'on peut utiliser pour stocker temporairement l'état «auth»
  private _isLoggedIn = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private adminViewer: AdminViewerService
  ) { }

  /**
 * getDonsByEmail
 * Récupère la liste des dons associés à un email
 *
 */
  getDonsByEmail(email: string): Observable<any> {
    console.log("Je recherche les dons");
    const viewAsEmail = this.adminViewer.getViewedEmail();
    const body: any = { email };
    
    // Si un admin visualise un autre donateur, ajouter viewAsEmail
    if (viewAsEmail) {
      body.viewAsEmail = viewAsEmail;
      console.log(`[DonsService] Admin mode: viewing donations of ${viewAsEmail}`);
    }
    
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    // withCredentials: true => inclure les cookies cross-site
    return this.http.post<any>(`${this.apiUrl}/dons`, body, {
      headers,
      withCredentials: true
    }).pipe(
      catchError((error) => {
        console.error('Error during getDonsByEmail:', error);
        return throwError(() => error);
      })
    );
  }

  /**
 * getSubscriptionsByEmail
 * Récupère la liste des dons mensuels associés à un email
 *
 */
  getSubscriptionsByEmail(email: string): Observable<any> {
    console.log("On fait appe à /getSubscriptionsByEmail + " + email);
    const viewAsEmail = this.adminViewer.getViewedEmail();
    const body: any = { email };
    
    // Si un admin visualise un autre donateur, ajouter viewAsEmail
    if (viewAsEmail) {
      body.viewAsEmail = viewAsEmail;
      console.log(`[DonsService] Admin mode: viewing subscriptions of ${viewAsEmail}`);
    }
    
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    // withCredentials: true => inclure les cookies cross-site
    return this.http.post<any>(`${this.apiUrl}/getSubscriptionsByEmail`, body, {
      headers,
      withCredentials: true
    }).pipe(
      catchError((error) => {
        console.error('Error during getSubscriptionsByEmail:', error);
        return throwError(() => error);
      })
    );
  }

  /**
* getRecusMensuelsByEmail
* Récupère la liste des dons mensuels associés à un email
*
*/
  getRecusMensuelsByEmail(email: string): Observable<any> {
    console.log("On fait appe à /recusMensuels + " + email);
    const body = { email };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    // withCredentials: true => inclure les cookies cross-site
    return this.http.post<any>(`${this.apiUrl}/recusMensuels`, body, {
      headers,
      withCredentials: true
    }).pipe(
      catchError((error) => {
        console.error('Error during getRecusMensuelsByEmail:', error);
        return throwError(() => error);
      })
    );
  }

  /**
* getRecusPonctuelsByEmail
* Récupère la liste des dons mensuels associés à un email
*
*/
  getRecusPonctuelsByEmail(email: string): Observable<any> {
    console.log("On fait appe à /recusPonctuels + " + email);
    const body = { email };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    // withCredentials: true => inclure les cookies cross-site
    return this.http.post<any>(`${this.apiUrl}/recusPonctuels`, body, {
      headers,
      withCredentials: true
    }).pipe(
      catchError((error) => {
        console.error('Error during getRecusPonctuelsByEmail:', error);
        return throwError(() => error);
      })
    );
  }

  cancelSubscription(subscriptionId: string, asso: string): Observable<any> {
    const body = { subscriptionId, asso }; // Ajoutez d'autres paramètres si nécessaire
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    console.log("Demande de cancel de la subsciption " + subscriptionId);

    return this.http.post<any>(`${this.apiUrl}/cancel-subscription`, body, {
      headers,
      withCredentials: true
    }).pipe(
      catchError((error) => {
        console.error('Error during cancelSubscription:', error);
        return throwError(() => error);
      })
    );
  }

  pauseSubscription(subscriptionId: string, asso: string, resumeDate: string): Observable<any> {
    const body = { subscriptionId, asso, resumeDate };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    console.log("Demande de suspension de la subscription " + subscriptionId + " jusqu'au " + resumeDate);

    return this.http.post<any>(`${this.apiUrl}/pause-subscription`, body, {
      headers,
      withCredentials: true
    }).pipe(
      catchError((error) => {
        console.error('Error during pauseSubscription:', error);
        return throwError(() => error);
      })
    );
  }

  modifyResumeDate(subscriptionId: string, asso: string, resumeDate: string): Observable<any> {
    const body = { subscriptionId, asso, resumeDate };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    console.log("Demande de modification de la date de reprise de la subscription " + subscriptionId + " à la date " + resumeDate);

    return this.http.post<any>(`${this.apiUrl}/modify-resume-date`, body, {
      headers,
      withCredentials: true
    }).pipe(
      catchError((error) => {
        console.error('Error during modifyResumeDate:', error);
        return throwError(() => error);
      })
    );
  }

  getStripePublicKey(asso: string): Observable<string> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<{ publicKey: string }>(`${this.apiUrl}/get-stripe-public-key`, { asso }, {
      headers,
      withCredentials: true
    }).pipe(
      map(response => response.publicKey),
      catchError((error) => {
        console.error('Error getting Stripe public key:', error);
        return throwError(() => error);
      })
    );
  }

  modifySubscription(params: ModifySubscriptionParams): Observable<any> {
    // Ne garder que les champs qui ont une valeur définie
    const body = Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);

    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    console.log("Demande de modification de la subscription " + params.subscriptionId);

    return this.http.post<any>(`${this.apiUrl}/modify-subscription`, body, {
      headers,
      withCredentials: true
    }).pipe(
      catchError((error) => {
        console.error('Error during modifySubscription:', error);
        return throwError(() => error);
      })
    );
  }
}
