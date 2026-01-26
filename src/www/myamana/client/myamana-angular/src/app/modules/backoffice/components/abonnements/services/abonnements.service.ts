import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { catchError, map, throwError } from 'rxjs';

export interface Abonnement {
  dernierPaiement: string;
  email: string;
  stripe_sub_id: string;
  nom: string;
  prenom: string;
  montant: number;
  occurence: string;
  moyen: string;
  statut: string;
  recu: string;
  recu_2023: string;
  recu_2024: string;
}

export interface AbonnementsResponse {
  results: Abonnement[];
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class AbonnementsService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
   * Récupère la liste des abonnements avec filtrage optionnel
   * @param year - L'année de filtrage (optionnel)
   * @param statut - Le statut de filtrage (optionnel)
   * @param search - Termes de recherche (optionnel)
   * @param limit - Nombre maximum de résultats à retourner
   * @returns Un observable contenant les résultats des abonnements
   */
  getAbonnementsBackOffice(year: string = 'toutes', statut: string = 'tous', search: string = '', limit: number = 10000): Observable<AbonnementsResponse> {
    // Construire les paramètres de requête
    const params: any = { limit };
    
    if (year && year !== 'toutes') {
      params.year = year;
    }
    
    if (statut && statut !== 'tous') {
      params.statut = statut;
    }
    
    if (search) {
      params.search = search;
    }
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    return this.http.get<AbonnementsResponse>(`${this.apiUrl}/getAbonnementsBackoffice`, { 
      params, 
      headers,
      withCredentials: true 
    }).pipe(
      map(response => {        
        // Formatter les dates si nécessaires
        if (response && response.results) {
          const formattedResults = response.results.map(abonnement => {
            if (abonnement.dernierPaiement) {
              const date = new Date(abonnement.dernierPaiement);
              return {
                ...abonnement,
                datePaiement: `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
              };
            }
            return abonnement;
          });

          return {
            results: formattedResults,
            total: response.total
          };
        }
        return response;
      }),
      catchError((error) => {
        console.error('Erreur lors de la récupération des abonnements:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Récupère les détails d'un abonnement spécifique
   * @param id - L'identifiant Stripe de l'abonnement
   * @returns Un observable contenant les détails de l'abonnement
   */
  getAbonnementDetail(id: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    return this.http.get<any>(`${this.apiUrl}/getAbonnementsBackoffice/detail/${id}`, {
      headers,
      withCredentials: true
    }).pipe(
      map(response => {
        console.log('Détails abonnement:', response);
        return response;
      }),
      catchError((error) => {
        console.error('Erreur lors de la récupération des détails de l\'abonnement:', error);
        return throwError(() => error);
      })
    );
  }
}