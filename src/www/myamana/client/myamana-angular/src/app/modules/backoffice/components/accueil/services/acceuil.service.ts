import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { catchError, map, throwError } from 'rxjs';

export interface Accueil {
    id: string;
    montant?: number;

}

export interface AccueilResponse {
    results: Accueil[];
    totalDons: number;
    totalNombreDonateurs: number;
    nouveauxDonateursMonthly: number;
}

@Injectable({
    providedIn: 'root'
})
export class AccueilService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }


    getTotalDonsAsso(): Observable<AccueilResponse> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json'
        });

        return this.http.get<any>(`${this.apiUrl}/getTotalDonAsso`, {
            headers,
            withCredentials: true
        }).pipe(
            map(response => {
                return response;
            }),
            catchError((error) => {
                console.error('Erreur lors de la récupération des statistiques:', error);
                return throwError(() => error);
            })
        );
    }

    getNombreDonateurs(): Observable<AccueilResponse> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json'
        });

        return this.http.get<any>(`${this.apiUrl}/getNombreDonateurs`, {
            headers,
            withCredentials: true
        }).pipe(
            map(response => {
                return response;
            }),
            catchError((error) => {
                console.error('Erreur lors de la récupération du nombre de donateurs:', error);
                return throwError(() => error);
            })
        );
    }

    getAbonnementMonthly(): Observable<AccueilResponse> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json'
        });

        return this.http.get<any>(`${this.apiUrl}/getNouveauxAbonnements`, {
            headers,
            withCredentials: true
        }).pipe(
            map(response => {
                return response;
            }),
            catchError((error) => {
                console.error('Erreur lors de la récupération des nouveaux abonnements du mois:', error);
                return throwError(() => error);
            })
        );
    }


    getDerniersAbonnements(): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json'
        });

        return this.http.get<any>(`${this.apiUrl}/getDerniersAbonnements`, {
            headers,
            withCredentials: true
        }).pipe(
            map(response => {
                return response;
            }),
            catchError((error) => {
                console.error('Erreur lors de la récupération des derniers abonnements:', error);
                return throwError(() => error);
            })
        );
    }


    getEvolutionDons(periode: string = '30j'): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json'
        });

        return this.http.get<any>(`${this.apiUrl}/getEvolutionDons?periode=${periode}`, {
            headers,
            withCredentials: true
        }).pipe(
            map(response => {
                return response;
            }),
            catchError((error) => {
                console.error('Erreur lors de la récupération de l\'évolution des dons:', error);
                return throwError(() => error);
            })
        );
    }

}