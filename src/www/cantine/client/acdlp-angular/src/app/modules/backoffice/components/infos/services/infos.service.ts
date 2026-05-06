import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { catchError, map, throwError } from 'rxjs';


export interface InfosResponse {
    data: {
        rna: string;
        nom: string | null;
        adresse: string | null;
        code_postal: string | null;
        ville: string | null;
        tel: string | null;
        email: string | null;
    };
}

@Injectable({
    providedIn: 'root'
})
export class InfosService {
    // Alias pour compatibilité avec configuration.component
    getInfos(): Observable<InfosResponse> {
        return this.getInfosAsso();
    }

    updateInfos(formData: any): Observable<InfosResponse> {
        return this.saveInfosAsso(formData);
    }
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    getInfosAsso(): Observable<InfosResponse> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json'
        });

        return this.http.get<InfosResponse>(`${this.apiUrl}/getInfosAsso`, {
            headers,
            withCredentials: true
        }).pipe(
            map(response => {
                return response;
            }),
            catchError((error) => {
                console.error('Erreur lors de la récupération des infos de l\'asso:', error);
                return throwError(() => error);
            })
        );
    }


    saveInfosAsso(formData: any): Observable<InfosResponse> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json'
        });
        console.log('Envoi des données:', formData);
        return this.http.post<InfosResponse>(`${this.apiUrl}/updateInfosAsso`, formData, {
            headers,
            withCredentials: true
        }).pipe(
            tap(() => {
            }),
            catchError(error => {
                console.error('Erreur lors de l\'enregistrement des informations:', error);
                return throwError(() => error);
            })
        );
    }



}