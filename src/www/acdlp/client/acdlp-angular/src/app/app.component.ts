import { Component, OnInit } from '@angular/core';
import { ThemeService } from './core/services/theme.service';
import { Router, RouterOutlet } from '@angular/router';
import { NgClass, NgIf, AsyncPipe } from '@angular/common';
import { ResponsiveHelperComponent } from './shared/components/responsive-helper/responsive-helper.component';
import { NgxSonnerToaster } from 'ngx-sonner';
import { FailedDonationsService } from './core/services/failed-donations.service';
import { AuthService } from './modules/auth/services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [NgClass, NgIf, AsyncPipe, RouterOutlet, ResponsiveHelperComponent, NgxSonnerToaster],
})
export class AppComponent implements OnInit {
  title = 'My Amana';
  failedDonations: any[] = [];

  constructor(
    public themeService: ThemeService,
    public failedDonationsService: FailedDonationsService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    console.log('=== App Component Initialization ===');
    // Vérifier l'authentification au démarrage
    this.authService.isAuthenticated().subscribe((isAuth: boolean) => {
      console.log('App Component - Auth status:', isAuth);
      if (isAuth) {
        // S'abonner aux dons en échec une fois authentifié
        this.failedDonationsService.failedDonations$.subscribe(donations => {
          console.log('App Component - Received donations:', donations);
          this.failedDonations = donations;
          // Vérifier si la popup doit être affichée
          if (this.failedDonationsService.showDialog) {
            console.log('App Component - Show dialog is true, popup should be visible');
          }
        });
      }
    });
  }

  // Méthode pour vérifier si la popup doit être affichée
  get shouldShowDialog(): boolean {
    const shouldShow = this.failedDonationsService.showDialog && this.failedDonations.length > 0;

    return shouldShow;
  }

  navigateToSubscriptions(): void {
    this.failedDonationsService.closeDialog();
    this.router.navigate(['/dashboard/abonnements']);
  }
}
