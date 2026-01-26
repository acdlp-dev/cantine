import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface MenuAdmin { id: number; date_ajout: string; menu_date?: string | null; auteur_id?: number | null; titre?: string | null; allergenes?: any | null; _saving?: boolean; _saved?: boolean; _editing?: boolean }

@Injectable({ providedIn: 'root' })
export class MenusAdminService {
  private base = environment.apiUrl;
  constructor(private http: HttpClient) {}

  getMenus(dateFrom?: string, dateTo?: string): Observable<MenuAdmin[]> {
    const params: any = {};
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    return this.http.get<MenuAdmin[]>(`${this.base}/menusAdmin`, { withCredentials: true, params });
  }

  createMenu(payload: Partial<MenuAdmin>): Observable<MenuAdmin> {
    return this.http.post<MenuAdmin>(`${this.base}/createMenus`, payload, { withCredentials: true });
  }

  updateMenu(id: number, payload: Partial<MenuAdmin>): Observable<MenuAdmin> {
    return this.http.put<MenuAdmin>(`${this.base}/updateMenus/${id}`, payload, { withCredentials: true });
  }
}
