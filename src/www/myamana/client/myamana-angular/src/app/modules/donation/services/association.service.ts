import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, shareReplay } from 'rxjs';
import { Association } from '../models/association.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AssociationService {
  private apiUrl = environment.apiUrl;

  // Cache pour éviter les appels redondants
  private associationCache: { [key: string]: Observable<Association> } = {};

  constructor(private http: HttpClient) {}

  getAssociationConfig(assoId: string): Observable<Association> {
    // Vérifier si la requête est déjà en cache
    if (this.associationCache[assoId]) {
      return this.associationCache[assoId];
    }

    // Créer et mettre en cache la requête
    this.associationCache[assoId] = this.http.get<any>(`${this.apiUrl}/assos/config/${assoId}`).pipe(
      map(response => {
        // Verifier que la réponse reçu a des campagnes (sinon créer une liste vide pour éviter les erreurs)
        if (!response.campagnes || !Array.isArray(response.campagnes)) {
          response.campagnes = [];
        }

        const enhancedCampaigns = response.campagnes.map((campaign: any) => {
          return {
            ...campaign,
            // Utiliser step1 et prix du backend s'ils existent, sinon utiliser des valeurs par défaut
            step1: campaign.step1 || 'libre',
            prix: campaign.prix !== undefined ? Number(campaign.prix) : undefined,
            id_product: campaign.id_product || undefined,
          };
        });

        // Diviser les campagnes en ponctuel et mensuel en utilisant le champ 'type'
        const ponctuelCampaigns = enhancedCampaigns.filter((campaign: any) => {
          if (!campaign.type) {
            return true; // Par défaut, les campagnes sans type sont considérées comme ponctuelles
          }
          return campaign.type === 'ponctuel';
        });

        const mensuelCampaigns = enhancedCampaigns.filter((campaign: any) => {
          if (!campaign.type) {
            return false;
          }
          return campaign.type === 'mensuel';
        });

        const association: Association = {
          ...response,
          campagnes_ponctuel: ponctuelCampaigns,
          campagnes_mensuel: mensuelCampaigns
        };

        return association;
      }),
      catchError((error: any) => {
        // Supprimer du cache en cas d'erreur pour permettre un nouvel essai
        delete this.associationCache[assoId];
        throw error;
      }),
      shareReplay(1) // Partager le résultat avec tous les abonnés
    );

    return this.associationCache[assoId];
  }

  // Méthode pour vider le cache si nécessaire
  clearCache(): void {
    this.associationCache = {};
  }

  // Méthode pour supprimer une association spécifique du cache
  clearAssociationFromCache(assoId: string): void {
    if (this.associationCache[assoId]) {
      delete this.associationCache[assoId];
    }
  }


}
