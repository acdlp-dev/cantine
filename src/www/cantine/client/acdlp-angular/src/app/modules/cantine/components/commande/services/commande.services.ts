import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { catchError, map, throwError } from 'rxjs';

export interface Commande {
    id: string;
    asso: string;
    email: string;
    repas_quantite: number;
    colis_quantite: number;
    ajout: string;
    livraison: string;
    statut: string;
}

export interface CommandesResponse {
    results: Commande[];
    total: number;
}

@Injectable({
    providedIn: 'root'
})
export class CommandeServices {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    getQuantiteCantine(date: string): Observable<CommandesResponse> {
        // Vérifier que la date n'est pas vide
        if (!date || date.trim() === '') {
            console.error('Date vide ou invalide:', date);
            return throwError(() => new Error('Date requise'));
        }

        // Construire les paramètres de requête avec la date
        const params = new HttpParams().set('date', date);

        const headers = new HttpHeaders({
            'Content-Type': 'application/json'
        });



        return this.http.get<CommandesResponse>(`${this.apiUrl}/getQuantiteCantine`, {
            params,  // ← Ajout des paramètres
            headers,
            withCredentials: true
        }).pipe(
            map(response => {
                return response;
            }),
            catchError((error) => {
                console.error('Erreur lors de la récupération des quantités:', error);
                return throwError(() => error);
            })
        );
    }



    // address peut être null si zoneId est fourni (cas zone enregistrée)
    addCommandeCantine(
        dateCommande: string,
        quantitePlats: number,
        address: { adresse: string, code_postal?: string, ville?: string, pays?: string } | string | null,
        zoneId?: number | null
    ): Observable<CommandesResponse> {
        if (!dateCommande || dateCommande.trim() === '') {
            console.error('Date vide ou invalide:', dateCommande);
            return throwError(() => new Error('Date requise'));
        }
        if (!quantitePlats || quantitePlats <= 0) {
            console.error('Quantité invalide:', quantitePlats);
            return throwError(() => new Error('Quantité requise'));
        }
        if (!zoneId && (!address || (typeof address === 'string' && address.trim() === '') || (typeof address === 'object' && !(address as any).adresse))) {
            console.error('Aucune zone sélectionnée et aucune adresse fournie:', address);
            return throwError(() => new Error('Zone ou adresse requise'));
        }

        const body: any = {
            dateCommande: dateCommande,
            quantitePlats: quantitePlats
        };

        if (zoneId) {
            body.zoneId = zoneId;
        } else if (typeof address === 'string') {
            body.zoneDistribution = address;
        } else if (typeof address === 'object' && address) {
            body.adresse = address.adresse;
            body.code_postal = address.code_postal || '';
            body.ville = address.ville || '';
            body.pays = address.pays || 'France';
            body.zoneDistribution = address.adresse;
        }

        const headers = new HttpHeaders({
            'Content-Type': 'application/json'
        });

        return this.http.post<CommandesResponse>(`${this.apiUrl}/addCommandeCantine`, body, {
            headers,
            withCredentials: true
        }).pipe(
            map(response => {
                return response;
            }),
            catchError((error) => {
                console.error('Erreur lors de l\'ajout de la commande:', error);
                return throwError(() => error);
            })
        );
    }

}