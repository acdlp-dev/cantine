import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface CommandeCantine {
  id?: number;
  ajout?: string; // Date de commande
  livraison: string; // Date de livraison
  repas_quantite: number;
  colis_quantite?: number;
  statut?: string;
  asso?: string;
  email?: string;
  // Anciens champs pour compatibilité
  nom_association?: string;
  nom_contact?: string;
  email_contact?: string;
  telephone_contact?: string;
  type_menu?: string;
  nombre_repas?: number;
  date_livraison?: string;
  heure_livraison?: string;
  adresse_livraison?: string;
  instructions?: string;
  prix_total?: number;
}

export interface ResponseCantine {
  success?: boolean;
  message?: string;
  data?: any;
  error?: string;
  results?: CommandeCantine[];
  total?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CantineService {
  private baseUrl = '/api'; // URL de l'API Node.js
  private apiUrl = environment.apiUrl; // URL de l'API Cantine

  constructor(private http: HttpClient) { }

  /**
   * Récupérer toutes les commandes de cantine
   */
  getCommandes(filters?: { year?: string; statut?: string; search?: string; limit?: number }): Observable<ResponseCantine> {
    let url = `${this.baseUrl}/getCommandesAssoCantine`;
    
    if (filters) {
      const params = new URLSearchParams();
      if (filters.year) params.append('year', filters.year);
      if (filters.statut) params.append('statut', filters.statut);
      if (filters.search) params.append('search', filters.search);
      if (filters.limit) params.append('limit', filters.limit.toString());
      
      if (params.toString()) {
        url += '?' + params.toString();
      }
    }
    
    return this.http.get<ResponseCantine>(url);
  }

  /**
   * Créer une nouvelle commande
   */
  creerCommande(commande: CommandeCantine): Observable<ResponseCantine> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    // Pour l'instant, on garde l'ancienne API PHP pour la création
    return this.http.post<ResponseCantine>('/server/php/services/cantine.php', {
      action: 'create_commande',
      ...commande
    }, { headers });
  }

  /**
   * Mettre à jour le statut d'une commande
   */
  updateStatutCommande(id: number, statut: string): Observable<ResponseCantine> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    const body = {
      action: 'update_statut',
      id: id,
      statut: statut
    };

    return this.http.post<ResponseCantine>(this.baseUrl, body, { headers });
  }

  /**
   * Supprimer une commande
   */
  supprimerCommande(id: number): Observable<ResponseCantine> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    const body = {
      action: 'delete_commande',
      id: id
    };

    return this.http.post<ResponseCantine>(this.baseUrl, body, { headers });
  }

  /**
   * Calculer le prix total d'une commande
   */
  calculerPrixTotal(nombreRepas: number, prixUnitaire: number = 7.00): number {
    return nombreRepas * prixUnitaire;
  }

  /**
   * Valider une date de livraison (doit être dans le futur et pas un dimanche)
   */
  validerDateLivraison(date: string): { valid: boolean; message?: string } {
    const dateLivraison = new Date(date);
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);

    if (dateLivraison < aujourdhui) {
      return { valid: false, message: 'La date de livraison doit être dans le futur' };
    }

    // Vérifier que ce n'est pas un dimanche (0 = dimanche)
    if (dateLivraison.getDay() === 0) {
      return { valid: false, message: 'Les livraisons ne sont pas possibles le dimanche' };
    }

    return { valid: true };
  }

  /**
   * Vérifie si les informations minimales de l'association sont complètes
   */
  checkCanteInfosCompleted(): Observable<any> {
    const headers = new HttpHeaders({ 'Accept': 'application/json, text/plain, */*' });
    return this.http.get(`${this.apiUrl}/canteInfosCompleted`, {
      headers,
      withCredentials: true,
      responseType: 'text'
    }).pipe(
      map((resp: string): any => {
        try {
          return JSON.parse(resp);
        } catch {
          return { isComplete: false, missingFields: ['Réponse invalide'], message: 'Réponse invalide' };
        }
      }),
      catchError((err) => throwError(() => err))
    );
  }
}
