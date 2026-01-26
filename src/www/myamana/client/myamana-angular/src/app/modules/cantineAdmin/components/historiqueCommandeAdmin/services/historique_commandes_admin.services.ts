import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { catchError, map, throwError } from 'rxjs';

export interface HistoriqueCommandesAdmin {
    id: string;
    asso: string;
    email: string;
    repas_quantite: number;
    colis_quantite: number;
    ajout: string;
    livraison: string;
    statut: string;
}

export interface HistoriqueCommandesAdminResponse {
    results: HistoriqueCommandesAdmin[];
    total: number;
}

@Injectable({
    providedIn: 'root'
})
export class HistoriqueCommandesAdminServices {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    // Accept optional params object (plain object or HttpParams)
    getCommandesAdmin(params?: any): Observable<HistoriqueCommandesAdminResponse> {
        // Default params
        const defaultParams: any = { limit: 10000 };
        const requestParams = params || defaultParams;

        const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        console.log("URL admin:", `${this.apiUrl}/admin/getCommandesAssosCantine`, 'params:', requestParams);
        return this.http.get<HistoriqueCommandesAdminResponse>(`${this.apiUrl}/admin/getCommandesAssosCantine`, {
            params: requestParams,
            headers,
            withCredentials: true
        }).pipe(
            map(response => {
                return response;
            }),
            catchError((error) => {
                console.error('Erreur lors de la récupération des commandes (admin):', error);
                return throwError(() => error);
            })
        );
    }

    /** Annule une commande en BDD (met à jour le statut en 'annulee') */
    annulerCommande(id: string): Observable<any> {
        const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        console.log(`Annulation commande ${id} (admin)`);
        return this.http.put(`${this.apiUrl}/annulerCommande/${id}`, {}, {
            headers,
            withCredentials: true
        }).pipe(
            map(response => {
                console.log('Réponse annulation (admin):', response);
                return response;
            }),
            catchError((error) => {
                console.error('Erreur lors de l\'annulation de la commande (admin):', error);
                return throwError(() => error);
            })
        );
    }
}
