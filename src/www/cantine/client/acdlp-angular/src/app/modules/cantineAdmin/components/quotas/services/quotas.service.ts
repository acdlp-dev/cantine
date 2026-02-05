import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Quota {
  id: number;
  date_jour?: string;
  jour: string;
  day_of_week: string;
  repas_quantite: number;
  colis_quantite: number;
  creneau_debut: string;
  creneau_fin: string;
  // UI flags
  _saving?: boolean;
  _saved?: boolean;
}

@Injectable({ providedIn: 'root' })
export class QuotasService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getQuotas(dateFrom?: string, dateTo?: string): Observable<Quota[]> {
    const params: any = {};
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    return this.http.get<Quota[]>(`${this.base}/quotas`, {
      withCredentials: true,
      params
    });
  }

  updateQuota(id: number, data: Partial<Quota>): Observable<any> {
    return this.http.put(`${this.base}/quotas/${id}`, data, { withCredentials: true });
  }
}
