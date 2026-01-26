import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ZoneCommande { id: number; date_ajout: string; menu_date?: string | null; auteur_id?: number | null; titre?: string | null; allergenes?: any | null; _saving?: boolean; _saved?: boolean; _editing?: boolean }

@Injectable({ providedIn: 'root' })
export class ZoneCommandeService {
  private base = environment.apiUrl;
  constructor(private http: HttpClient) {}

  // Return commandes for admin (all associations) between dateFrom and dateTo (yyyy-mm-dd)
  getCommandesForRange(dateFrom?: string, dateTo?: string, limit = 1000): Observable<{ results: any[]; total: number }> {
    const params: any = { limit: String(limit) };
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    return this.http.get<{ results: any[]; total: number }>(`${this.base}/admin/getCommandesAssosCantine`, { params, withCredentials: true });
  }

  // Helper: compute current week's Monday..Sunday in yyyy-mm-dd
  currentWeekRange(): { from: string; to: string } {
    const today = new Date();
    const day = today.getDay();
    const daysSinceMonday = (day + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysSinceMonday);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    };
    return { from: fmt(monday), to: fmt(sunday) };
  }
}
