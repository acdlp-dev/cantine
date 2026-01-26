import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Benevole {
  type: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  ville: string;
  code_postal: string;
  pays: string;
  age: number;
  genre: string;
  metiers_competences: string;
  statut?: string; // Statut du bénévole (actif, inactif, etc.)
  created_at?: string; // Date d'inscription
  date_derniere_action_presente?: string; // Date de dernière action présente
}

export interface BenevolesResponse {
  success: boolean;
  results: Benevole[];
  total: number;
}

export interface ActionData {
  rue?: string;
  ville?: string;
  pays?: string;
  nom: string;
  description?: string;
  date_action: string;
  heure_debut: string;
  heure_fin: string;
  recurrence?: string;
  responsable_email: string;
  nb_participants?: number;
  genre?: string;
  age?: string;
}

export interface ActionResponse {
  success: boolean;
  message: string;
  id?: number;
}

@Injectable({
  providedIn: 'root'
})
export class BenevolatAdminService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Récupère la liste des bénévoles
   * @param search terme de recherche optionnel
   */
  getBenevoles(search?: string): Observable<BenevolesResponse> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let url = `${this.apiUrl}/backoffice/benevoles`;
    
    if (search) {
      url += `?search=${encodeURIComponent(search)}`;
    }
    
    return this.http.get<BenevolesResponse>(url, {
      headers,
      withCredentials: true
    });
  }

  /**
   * Exporte la liste des bénévoles en CSV
   * @param benevoles liste des bénévoles à exporter
   */
  exportBenevolesCSV(benevoles: Benevole[]): void {
    const headers = ['Type', 'Nom', 'Prénom', 'Email', 'Téléphone', 'Adresse', 
                     'Ville', 'Code Postal', 'Pays', 'Âge', 'Genre', 'Statut', 'Métiers/Compétences',
                     'Date d\'inscription', 'Dernière présence'];
    
    const csvContent = [
      headers.join(','),
      ...benevoles.map(b => [
        b.type || '',
        b.nom || '',
        b.prenom || '',
        b.email || '',
        b.telephone || '',
        b.adresse || '',
        b.ville || '',
        b.code_postal || '',
        b.pays || '',
        b.age || '',
        b.genre || '',
        b.statut || '',
        b.metiers_competences || '',
        b.created_at ? new Date(b.created_at).toLocaleDateString('fr-FR') : '',
        b.date_derniere_action_presente ? new Date(b.date_derniere_action_presente).toLocaleDateString('fr-FR') : ''
      ].map(v => `"${v}"`).join(','))
    ].join('\n');
    
    // Ajouter BOM pour UTF-8
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `benevoles_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  /**
   * Crée une nouvelle action
   * @param actionData données de l'action
   */
  createAction(actionData: ActionData): Observable<ActionResponse> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<ActionResponse>(`${this.apiUrl}/backoffice/actions`, actionData, {
      headers,
      withCredentials: true
    });
  }

  /**
   * Met à jour le type d'un bénévole
   * @param email email du bénévole
   * @param type nouveau type (bénévole ou responsable)
   */
  updateBenevoleType(email: string, type: string): Observable<ActionResponse> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.patch<ActionResponse>(
      `${this.apiUrl}/backoffice/benevoles/${encodeURIComponent(email)}/type`,
      { type },
      { headers, withCredentials: true }
    );
  }

  /**
   * Met à jour toutes les informations d'un bénévole
   * @param email email du bénévole (identifiant)
   * @param benevoleData données du bénévole à mettre à jour
   */
  updateBenevole(email: string, benevoleData: Partial<Benevole>): Observable<ActionResponse> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.patch<ActionResponse>(
      `${this.apiUrl}/backoffice/benevoles/${encodeURIComponent(email)}`,
      benevoleData,
      { headers, withCredentials: true }
    );
  }

  /**
   * Récupère la liste des responsables
   */
  getResponsables(): Observable<BenevolesResponse> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.get<BenevolesResponse>(`${this.apiUrl}/backoffice/benevoles/responsables`, {
      headers,
      withCredentials: true
    });
  }

  /**
   * Récupère les actions d'un bénévole
   * @param email email du bénévole
   */
  getBenevoleActions(email: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.get(`${this.apiUrl}/backoffice/benevoles/${encodeURIComponent(email)}/actions`, {
      headers,
      withCredentials: true
    });
  }

  /**
   * Récupère la liste de toutes les actions de l'association
   */
  getActionsList(): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.get(`${this.apiUrl}/backoffice/actions/list`, {
      headers,
      withCredentials: true
    });
  }

  /**
   * Met à jour une action
   * @param id ID de l'action
   * @param actionData données de l'action à mettre à jour
   */
  updateAction(id: number, actionData: ActionData): Observable<ActionResponse> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put<ActionResponse>(`${this.apiUrl}/backoffice/actions/${id}`, actionData, {
      headers,
      withCredentials: true
    });
  }

  /**
   * Récupère la liste des participants d'une action (backoffice admin)
   * @param actionId ID de l'action
   * @param dateAction Date spécifique pour les actions récurrentes
   */
  getActionParticipants(actionId: number, dateAction: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.get(`${this.apiUrl}/backoffice/actions/${actionId}/participants?date_action=${dateAction}`, {
      headers,
      withCredentials: true
    });
  }

  /**
   * Masque une occurrence d'action pour qu'elle ne soit plus visible dans l'espace bénévole
   * @param actionId ID de l'action
   * @param dateAction Date de l'occurrence à masquer (YYYY-MM-DD)
   */
  maskAction(actionId: number, dateAction: string): Observable<ActionResponse> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<ActionResponse>(
      `${this.apiUrl}/backoffice/actions/${actionId}/mask`,
      { date_action: dateAction },
      { headers, withCredentials: true }
    );
  }

  /**
   * Démasque une occurrence d'action pour qu'elle redevienne visible dans l'espace bénévole
   * @param actionId ID de l'action
   * @param dateAction Date de l'occurrence à démasquer (YYYY-MM-DD)
   */
  unmaskAction(actionId: number, dateAction: string): Observable<ActionResponse> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.delete<ActionResponse>(
      `${this.apiUrl}/backoffice/actions/${actionId}/mask?date_action=${dateAction}`,
      { headers, withCredentials: true }
    );
  }

  /**
   * Inscrit un bénévole à une action (par l'admin)
   * @param actionId ID de l'action
   * @param dateAction Date de l'action (YYYY-MM-DD)
   * @param benevoleId ID du bénévole à inscrire
   */
  inscribeBenevoleToAction(actionId: number, dateAction: string, benevoleId: number): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<any>(
      `${this.apiUrl}/benevolat/inscription`,
      { 
        action_id: actionId, 
        date_action: dateAction, 
        benevole_id: benevoleId 
      },
      { headers, withCredentials: true }
    );
  }

  /**
   * Désinscrit un bénévole d'une action (par l'admin)
   * @param inscriptionId ID de l'inscription à supprimer
   */
  uninscribeBenevoleFromAction(inscriptionId: number): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.delete<any>(
      `${this.apiUrl}/benevolat/desinscription/${inscriptionId}`,
      { headers, withCredentials: true }
    );
  }

  /**
   * Désinscrit un bénévole de toutes les occurrences futures d'une action récurrente (par l'admin)
   * @param inscriptionId ID de l'inscription de référence
   */
  uninscribeBenevoleFromAllFutureOccurrences(inscriptionId: number): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.delete<any>(
      `${this.apiUrl}/benevolat/desinscription/${inscriptionId}/future-occurrences`,
      { headers, withCredentials: true }
    );
  }
}
