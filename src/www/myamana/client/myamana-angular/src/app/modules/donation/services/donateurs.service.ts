import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { DonationFormData } from '../models/donation.model';

interface LegalNameResponse {
  legalName: string;
}

interface SaveDonationResponse {
  success: boolean;
  donationId?: string;
  tracking?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class DonateursService {
  // L'URL de base de votre API (par exemple : http://localhost:4242/api)
  private apiUrl = environment.apiUrl; 
  
  constructor(private http: HttpClient) {}

  getLegalName(siren: string): Observable<string> {
    return this.http.get<LegalNameResponse>(`${this.apiUrl}/legalName/${siren}`).pipe(
      map(response => response.legalName)
    );
  }

  /**
   * Enregistre les données du donateur et du don en base de données
   * @param donationData Les données du formulaire de don
   * @returns Un observable contenant la réponse du serveur
   */
  saveDonationData(donationData: DonationFormData): Observable<SaveDonationResponse> {
    return this.http.post<SaveDonationResponse>(`${this.apiUrl}/donations/save`, donationData);
  }
}
