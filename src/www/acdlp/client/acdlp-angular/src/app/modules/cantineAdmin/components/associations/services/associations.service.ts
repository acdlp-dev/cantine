import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';

export interface AssociationRow {
  id: number;
  email: string;
  firstname: string;
  organisation?: string;
  role?: string;
  statut?: string; // added statut from backend
}

export interface AssociationsResponse {
  results: AssociationRow[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class AssociationsService {
  constructor(private http: HttpClient) {}

  getAssociations(page = 1, limit = 20): Observable<AssociationsResponse> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('limit', String(limit));
    const url = `${environment.apiUrl}/associations`;
    return this.http.get<AssociationsResponse>(url, { params, withCredentials: true });
  }

  /**
   * Met à jour le statut d'une association (ex: 'blocked' | 'ok').
   * Utilise une route PATCH similaire aux autres services du projet.
   */
  updateAssociationStatus(id: number, statut: 'blocked' | 'ok', amende?: number): Observable<any> {
    const url = `${environment.apiUrl}/updateAssociationStatus/${id}`;
    // send statut and optional amende
    const body: any = { statut };
    if (amende !== undefined) body.amende = amende;
    return this.http.patch<any>(url, body, { withCredentials: true });
  }
}
