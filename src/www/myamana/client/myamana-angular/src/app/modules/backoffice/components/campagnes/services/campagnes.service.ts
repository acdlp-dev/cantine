import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { catchError, map, throwError } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';


// Interface plus complète pour correspondre à vos données de campagnes
export interface Campaign {
  id: number;
  nom: string;
  type: 'ponctuel' | 'mensuel';
  objectif: number;
  montant: number;
  statut: 'actif' | 'inactif' | 'marketing';
  step1?: 'libre' | 'calcul' | 'selecteurNominatif';
  prix?: number;
}

export interface CampagnesResponse {
  results: Campaign[];
  // Ajoutez d'autres propriétés si votre API retourne plus que juste un tableau
}

@Injectable({
  providedIn: 'root'
})
export class CampagnesService {
  private apiUrl = environment.apiUrl; // Assurez-vous que cette variable est définie dans votre environnement

  constructor(private http: HttpClient) { }

  getCampagnesBackOffice(): Observable<CampagnesResponse> {


    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.get<CampagnesResponse>(`${this.apiUrl}/getcampagnes`, {
      headers,
      withCredentials: true
    }).pipe(
      map(response => {

        return response;
      }),
      catchError((error) => {
        console.error('Erreur lors de la récupération des campagnes:', error);
        return throwError(() => error);
      })
    );
  }


  getDonsByMonth(): Observable<any> {
    const currentMonth = new Date().getMonth() + 1; // +1 car getMonth() retourne 0-11
    const currentYear = new Date().getFullYear();

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<any>(`${this.apiUrl}/getDonsByMonth`, {
      month: currentMonth,
      year: currentYear
    }, {
      headers,
      withCredentials: true
    }).pipe(
      map(response => {
        return response;
      }),
      catchError((error) => {
        console.error('Erreur lors de la récupération des dons par mois:', error);
        return throwError(() => error);
      })
    );
  }

  //   createCampaign(campaignData: any): Observable<any> {
  //     return this.http.post(`${this.apiUrl}/getcampagnes`, campaignData, {
  //       withCredentials: true
  //     });
  //   }

  //   updateCampaign(id: number, campaignData: any): Observable<any> {
  //     return this.http.put(`${this.apiUrl}/getcampagnes/${id}`, campaignData, {
  //       withCredentials: true
  //     });
  //   }

  // Méthode pour mettre à jour le statut d'une campagne (actif/inactif)
  updateCampaignStatus(campaignId: number, status: 'actif' | 'inactif'): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.patch<any>(`${this.apiUrl}/updateCampaignStatus/${campaignId}`, {
      statut: status
    }, {
      headers,
      withCredentials: true
    }).pipe(
      map(response => {
        return response;
      }),
      catchError((error) => {
        console.error('Erreur lors de la mise à jour du statut de la campagne:', error);
        return throwError(() => error);
      })
    );
  }


  // Méthode dans campagnes.service.ts

  getCampaignDonations(campaignName: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.get<any>(`${this.apiUrl}/getCampaignDonations/${campaignName}`, {
      headers,
      withCredentials: true
    }).pipe(
      map(response => {
        return response;
      }),
      catchError((error) => {
        console.error('Erreur lors de la récupération des dons de la campagne:', error);
        return throwError(() => error);
      })
    );
  }

  getCampaignCollectedAmount(campaignName: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    return this.http.get<any>(`${this.apiUrl}/getCampaignCollectedAmount/${encodeURIComponent(campaignName)}`, {
      headers,
      withCredentials: true
    }).pipe(
      map(response => {
        return response;
      }),
      catchError((error) => {
        console.error('Erreur lors de la récupération du montant collecté:', error);
        return throwError(() => error);
      })
    );
  }

  // Méthode pour mettre à jour le nom et l'objectif d'une campagne
  updateCampaign(campaignId: number, nom: string, objectif: number): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.patch<any>(`${this.apiUrl}/updateCampaign/${campaignId}`, {
      nom,
      objectif
    }, {
      headers,
      withCredentials: true
    }).pipe(
      map(response => {
        return response;
      }),
      catchError((error) => {
        console.error('Erreur lors de la mise à jour de la campagne:', error);
        return throwError(() => error);
      })
    );
  }



  createCampaign(campaignData: any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<any>(`${this.apiUrl}/createCampaign`, campaignData, {
      headers,
      withCredentials: true
    }).pipe(
      map(response => {
        return response;
      }),
      catchError((error) => {
        console.error('Erreur lors de la création de la campagne:', error);
        return throwError(() => error);
      })
    );
  }
}