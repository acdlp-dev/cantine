import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { catchError, map, throwError } from 'rxjs';

export interface HistoriqueCommandes {
    id: string;
    asso: string;
    email: string;
    repas_quantite: number;
    colis_quantite: number;
    ajout: string;
    livraison: string;
    statut: string;
}

export interface HistoriqueCommandesResponse {
    results: HistoriqueCommandes[];
    total: number;
}

@Injectable({
    providedIn: 'root'
})
export class HistoriqueCommandesServices {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    // Accept optional params object (plain object or HttpParams)
    getCommandesAssosCantine(params?: any): Observable<HistoriqueCommandesResponse> {
        // Default params
        const defaultParams: any = { limit: 10000 };
        const requestParams = params || defaultParams;

        const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        return this.http.get<HistoriqueCommandesResponse>(`${this.apiUrl}/getCommandesAssosCantine`, {
            params: requestParams,
            headers,
            withCredentials: true
        }).pipe(
            map(response => {
                return response;
            }),
            catchError((error) => {
                console.error('Erreur lors de la récupération des commandes:', error);
                return throwError(() => error);
            })
        );
    }

    /** Annule une commande en BDD (met à jour le statut en 'annulee') */
    annulerCommande(id: string): Observable<any> {
        const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        return this.http.put(`${this.apiUrl}/annulerCommande/${id}`, {}, {
            headers,
            withCredentials: true
        }).pipe(
            map(response => {
                return response;
            }),
            catchError((error) => {
                console.error('Erreur lors de l\'annulation de la commande:', error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Récupère la quantité disponible pour la cantine à une date donnée (format yyyy-MM-dd)
     */
    getQuantiteCantine(date: string): Observable<any> {
        const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        return this.http.get<any>(`${this.apiUrl}/getQuantiteCantine`, {
            params: { date },
            headers,
            withCredentials: true
        }).pipe(
            catchError((error) => {
                console.error('Erreur lors de la récupération des disponibilités:', error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Met à jour la quantité de repas d'une commande (PUT /modifierCommande/:id)
     */
    updateCommandeQuantite(id: string, repas_quantite: number): Observable<any> {
        const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        return this.http.put<any>(`${this.apiUrl}/modifierCommande/${id}`, { repas_quantite }, {
            headers,
            withCredentials: true
        }).pipe(
            catchError((error) => {
                console.error('Erreur lors de la modification de la commande:', error);
                return throwError(() => error);
            })
        );
    }
}
