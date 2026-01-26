import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface MenuItem { day: string; content: string }
export interface WeeklyMenu { id: number; week_start: string; items: MenuItem[]; _saving?: boolean; _saved?: boolean }

@Injectable({ providedIn: 'root' })
export class MenusService {
  private base = environment.apiUrl;
  constructor(private http: HttpClient) {}

  getWeeklyMenus(): Observable<WeeklyMenu[]> {
    return this.http.get<WeeklyMenu[]>(`${this.base}/backoffice/menus-week`, { withCredentials: true });
  }

  createWeeklyMenu(payload: Partial<WeeklyMenu>): Observable<WeeklyMenu> {
    return this.http.post<WeeklyMenu>(`${this.base}/backoffice/menus-week`, payload, { withCredentials: true });
  }

  updateWeeklyMenu(id: number, payload: Partial<WeeklyMenu>): Observable<WeeklyMenu> {
    return this.http.put<WeeklyMenu>(`${this.base}/backoffice/menus-week/${id}`, payload, { withCredentials: true });
  }
}
