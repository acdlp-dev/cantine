import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AdminViewerService {
  private readonly STORAGE_KEY = 'admin_viewed_donator';
  private viewedDonatorEmail$: BehaviorSubject<string | null>;
  
  currentViewedDonator$: Observable<string | null>;
  
  constructor() {
    // Récupérer l'email depuis le sessionStorage au démarrage
    const storedEmail = sessionStorage.getItem(this.STORAGE_KEY);
    this.viewedDonatorEmail$ = new BehaviorSubject<string | null>(storedEmail);
    this.currentViewedDonator$ = this.viewedDonatorEmail$.asObservable();
    
    if (storedEmail) {
      console.log(`[AdminViewer] Email restauré depuis le storage: ${storedEmail}`);
    }
  }
  
  /**
   * Définit l'email du donateur à visualiser
   */
  viewDonator(email: string): void {
    console.log(`[AdminViewer] Visualisation du donateur: ${email}`);
    sessionStorage.setItem(this.STORAGE_KEY, email);
    this.viewedDonatorEmail$.next(email);
  }
  
  /**
   * Réinitialise la vue (revenir à son propre compte)
   */
  resetView(): void {
    console.log('[AdminViewer] Retour au compte admin');
    sessionStorage.removeItem(this.STORAGE_KEY);
    this.viewedDonatorEmail$.next(null);
  }
  
  /**
   * Récupère l'email du donateur actuellement visualisé
   */
  getViewedEmail(): string | null {
    return this.viewedDonatorEmail$.value;
  }
  
  /**
   * Vérifie si on est en mode visualisation
   */
  isViewingDonator(): boolean {
    return this.viewedDonatorEmail$.value !== null;
  }
}
