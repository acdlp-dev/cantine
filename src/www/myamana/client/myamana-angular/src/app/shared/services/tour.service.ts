import { Injectable } from '@angular/core';
import { driver, Config } from 'driver.js';
import 'driver.js/dist/driver.css';
import { BehaviorSubject } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';

export interface TourStep {
  element: string;
  popover: {
    title: string;
    description: string;
    position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  };
}

@Injectable({
  providedIn: 'root'
})
export class TourService {
  private driverObj: any;
  private hasCompletedTour = new BehaviorSubject<boolean>(false);
  hasCompletedTour$ = this.hasCompletedTour.asObservable();
  private apiUrl = environment.apiUrl;
  
  constructor(private http: HttpClient) {
    // Vérifier si l'utilisateur a déjà terminé la visite guidée
    const tourCompleted = localStorage.getItem('myamana_tour_completed');
    if (tourCompleted === 'true') {
      this.hasCompletedTour.next(true);
    }
    
    // Ne pas initialiser driver.js à ce stade
    // Il sera initialisé à chaque appel de startTour avec les étapes spécifiques
  }

  /**
   * Définit les étapes de la visite guidée et la démarre
   * @param steps Les étapes de la visite guidée
   * @param forceStart Forcer le démarrage même si la visite a déjà été terminée
   */
  startTour(steps: TourStep[], forceStart: boolean = false): void {
    if (!forceStart && this.hasCompletedTour.value) {
      return;
    }

    // Recréer le driver avec les options et les étapes
    const config: Partial<Config> = {
      animate: true,
      overlayColor: 'rgba(0, 0, 0, 0.7)',
      smoothScroll: true,
      showButtons: ['next', 'previous', 'close'],
      showProgress: true,
      steps: steps,
      stagePadding: 5,
      popoverClass: 'myamana-tour-popover',
      onHighlightStarted: (element) => {
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      },
      onDestroyed: () => {
        this.completeTour();
      }
    };

    this.driverObj = driver(config);
    
    // Démarrer la visite
    this.driverObj.drive();
  }

  /**
   * Arrête la visite guidée en cours
   */
  stopTour(): void {
    if (this.driverObj) {
      this.driverObj.destroy();
    }
  }

  /**
   * Marque la visite guidée comme terminée
   * Met à jour l'état hasSeenTour en base de données
   */
  completeTour(): void {
    // Marquer comme terminé localement
    localStorage.setItem('myamana_tour_completed', 'true');
    this.hasCompletedTour.next(true);
    
    // Mettre à jour l'état en base de données
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    // Appel direct à l'API au lieu de passer par le service d'onboarding
    this.http.post(`${this.apiUrl}/markGuidedTourAsSeen`, {}, {
      headers,
      withCredentials: true
    }).subscribe({
      next: (response: any) => {
        console.log('Visite guidée marquée comme vue en BDD:', response);
      },
      error: (error: any) => {
        console.error('Erreur lors de la mise à jour de l\'état de la visite guidée:', error);
      }
    });
  }

  /**
   * Réinitialise l'état de la visite guidée
   */
  resetTour(): void {
    // Réinitialiser localement
    localStorage.removeItem('myamana_tour_completed');
    this.hasCompletedTour.next(false);
    
    // Réinitialiser en base de données
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    // Utiliser hasSeenTour: false pour réinitialiser la visite guidée
    this.http.post(`${this.apiUrl}/resetGuidedTour`, {}, {
      headers,
      withCredentials: true
    }).subscribe({
      next: (response: any) => {
        console.log('État d\'onboarding réinitialisé en BDD:', response);
      },
      error: (error) => {
        console.error('Erreur lors de la réinitialisation de l\'état d\'onboarding:', error);
      }
    });
  }
}
