import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DonsService } from '../../modules/dashboard/services/dons.service';
import { AuthService } from '../../modules/auth/services/auth.service';

export interface FailedDonation {
  asso: string;
  montant: number;
}

@Injectable({
  providedIn: 'root'
})
export class FailedDonationsService {
  private failedDonationsSubject = new BehaviorSubject<FailedDonation[]>([]);
  failedDonations$ = this.failedDonationsSubject.asObservable();

  showDialog = false;

  constructor(
    private donsService: DonsService,
    private authService: AuthService
  ) {
    console.log('FailedDonationsService initialized');
    // Vérifier d'abord si l'utilisateur est authentifié
    this.authService.isAuthenticated().subscribe({
      next: (isAuth) => {
        console.log('Authentication status:', isAuth);
        if (isAuth) {
          // Si authentifié, récupérer les données utilisateur
          this.authService.getUserData().subscribe({
            next: (response) => {
              if (response && response.email && response.role === 'donator') {
                this.checkFailedDonations(response.email);
              } else {
                console.warn('No email found in user data');
              }
            },
            error: (err) => {
              console.error('Erreur lors de la récupération des données utilisateur:', err);
            }
          });
        } else {
          console.log('User not authenticated');
        }
      },
      error: (err) => {
        console.error('Erreur lors de la vérification de l\'authentification:', err);
      }
    });
  }

  public checkFailedDonations(email: string): void {
    console.log('=== Checking failed donations ===');
    console.log('Email:', email);
    this.donsService.getSubscriptionsByEmail(email).subscribe({
      next: (response) => {
        console.log('=== Subscriptions response ===');
        console.log('Raw response:', response);
        console.log('Results:', response.results);
        const failedDons = response.results
          .filter((item: any) => item.statut === 'failed')
          .map((item: any) => ({
            asso: item.asso.replace(/-/g, ' ').replace(/\b\w/g, (match: string) => match.toUpperCase()),
            montant: item.montant
          }));

        if (failedDons.length > 0) {
          console.log('=== Failed donations detected ===');
          console.log('Number of failed donations:', failedDons.length);
          console.log('Failed donations details:', failedDons);
          this.failedDonationsSubject.next(failedDons);
          this.showDialog = true;
          console.log('Dialog visibility:', this.showDialog);
        } else {
          console.log('No failed donations found');
        }
      },
      error: (err) => {
        console.error('Erreur lors de la vérification des dons en échec:', err);
      }
    });
  }

  closeDialog(): void {
    this.showDialog = false;
  }
}
