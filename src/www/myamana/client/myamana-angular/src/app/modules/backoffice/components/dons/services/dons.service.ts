import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

// Complétez l'interface avec tous les champs requis

export interface DonTableauBAckOffice {
  id: string;
  ajout: string;
  datePaiement?: string;
  email: string;
  nom: string;
  prenom: string;
  campagne: string;
  montant: number;
  type: string;
  moyen: string;
  amana?: string;
  reference?: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;
  pays?: string;
  demande_recu?: boolean;
  lien_recu?: string;
  stripe_cus_id?: string;
  stripe_sub_id?: string;
  stripe_ch_id?: string;
  nomArbre?: string;
  tel?: string;
}

export interface DonsResponse {
  results: DonTableauBAckOffice[];
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class DonsServiceBackOffice {
  private apiUrl = environment.apiUrl; // L'URL de votre API backend

  constructor(private http: HttpClient) { }

  // Méthode pour récupérer tous les dons avec filtres
  getDons(year?: string, searchTerm?: string, limit: number = 10000): Observable<DonsResponse> {
    let params = new HttpParams();
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    if (year && year !== 'toutes') {
      params = params.set('year', year);
    }

    if (searchTerm) {
      params = params.set('search', searchTerm);
    }

    params = params.set('limit', limit.toString());

    return this.http.get<DonsResponse>(`${this.apiUrl}/getDonsPonctuelBackoffice`, {
      params,
      headers,
      withCredentials: true
    }).pipe(
      map(response => {

        // Formatter les dates si nécessaire
        if (response && response.results) {
          const formattedResults = response.results.map(don => {
            const date = new Date(don.ajout);
            return {
              ...don,
              datePaiement: `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
            };
          });

          return {
            results: formattedResults,
            total: response.total
          };
        }

        return response;
      }),
      catchError((error) => {
        console.error('Erreur lors de la récupération des dons:', error);
        return throwError(() => error);
      })
    );
  }



  getDonById(id: string): Observable<DonTableauBAckOffice> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    console.log('Récupération du don avec l\'ID:', id);
    return this.http.get<{ result: DonTableauBAckOffice }>(`${this.apiUrl}/getDonsPonctuelBackoffice/detail/${id}`, {
      headers,
      withCredentials: true
    }).pipe(
      map(response => {
        if (response && response.result) {
          const don = response.result;
          const date = new Date(don.ajout);
          return {
            ...don,
            datePaiement: `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
          };
        }
        throw new Error('Don non trouvé');
      }),
      catchError((error) => {
        console.error('Erreur lors de la récupération du don:', error);
        return throwError(() => error);
      })
    );
  }
}