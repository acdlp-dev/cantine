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



    // désormais la zone est un objet d'adresse similaire à don-hors-ligne
    addCommandeCantine(dateCommande: string, quantitePlats: number, address: { adresse: string, code_postal?: string, ville?: string, pays?: string } | string): Observable<CommandesResponse> {
        // Vérifier que la date n'est pas vide
        if (!dateCommande || dateCommande.trim() === '') {
            console.error('Date vide ou invalide:', dateCommande);
            return throwError(() => new Error('Date requise'));
        }

        // Vérifier que la quantité est valide
        if (!quantitePlats || quantitePlats <= 0) {
            console.error('Quantité invalide:', quantitePlats);
            return throwError(() => new Error('Quantité requise'));
        }

        // Vérifier que la zone/ligne d'adresse est valide
        if (!address || (typeof address === 'string' && address.trim() === '') || (typeof address === 'object' && !(address as any).adresse)) {
            console.error('Adresse invalide:', address);
            return throwError(() => new Error('Adresse requise'));
        }

        // Construire le corps de la requête
        const body: any = {
            dateCommande: dateCommande,
            quantitePlats: quantitePlats
        };

        // Si un string est fourni, conserver l'ancien champ zoneDistribution pour compatibilité
        if (typeof address === 'string') {
            body.zoneDistribution = address;
        } else if (typeof address === 'object') {
            body.adresse = address.adresse;
            body.code_postal = address.code_postal || '';
            body.ville = address.ville || '';
            body.pays = address.pays || 'France';
            // Compat: ajouter zoneDistribution attendu côté serveur
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