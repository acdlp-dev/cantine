import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Association } from '../models/association.model';

@Injectable({
  providedIn: 'root'
})
export class AssociationService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get association configuration by URI
   */
  getAssociationConfig(uri: string): Observable<Association> {
    return this.http.get<Association>(`${this.apiUrl}/assos/${uri}`);
  }

  /**
   * Get all associations
   */
  getAllAssociations(): Observable<Association[]> {
    return this.http.get<Association[]>(`${this.apiUrl}/assos`);
  }
}
