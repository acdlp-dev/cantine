import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { RecuFiscal, RecuFiscalFilters } from '../../../models/recu.model';
import { catchError, map, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RecusService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
   * Récupère les statistiques des reçus fiscaux
   */
  getRecusStats(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/getRecusStats`, {}, { withCredentials: true });
  }

  /**
   * Récupère la liste des reçus fiscaux
   */
  getRecusList(filters: any = {}, page: number = 1, pageSize: number = 1): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    const requestBody = {
      ...filters,
      page,
      pageSize
    };
    return this.http.post<any>(`${this.apiUrl}/getRecusList`, requestBody, {
      headers,
      withCredentials: true
    }).pipe(
      map(response => {
        return response;
      }),
      catchError((error) => {
        console.error('Erreur lors de la récupération des reçus:', error);
        return throwError(() => error);
      })
    );
    ;
  }


  /**
   * Génère un reçu fiscal pour un don spécifique
   */
  generateRecu(donId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/generateRecu`, {
      donId
    });
  }

  /**
   * Génère des reçus fiscaux en masse pour une période spécifiée
   */
  generateBulkRecus(year: string, type: string = 'all'): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/generateBulkRecus`, {
      year,
      type
    });
  }
}