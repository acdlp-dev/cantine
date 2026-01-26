import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { VolunteerService } from '../../services/volunteer.service';

@Component({
  selector: 'app-volunteer-verify',
  templateUrl: './volunteer-verify.component.html',
  styleUrls: ['./volunteer-verify.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class VolunteerVerifyComponent implements OnInit {
  loading = true;
  success = false;
  error = false;
  errorMessage = '';
  volunteer: any = null;
  token = '';

  constructor(
    private route: ActivatedRoute,
    private volunteerService: VolunteerService
  ) {}

  ngOnInit(): void {
    // Récupérer le token depuis l'URL
    this.token = this.route.snapshot.params['token'];
    
    if (!this.token) {
      this.loading = false;
      this.error = true;
      this.errorMessage = 'Token de vérification manquant.';
      return;
    }

    console.log('🔍 [VolunteerVerify] Token reçu:', this.token);
    this.verifyEmail();
  }

  verifyEmail(): void {
    this.volunteerService.verifyVolunteerEmail(this.token).subscribe({
      next: (response) => {
        console.log('✅ [VolunteerVerify] Vérification réussie:', response);
        this.loading = false;
        this.success = true;
        this.volunteer = response.volunteer;
      },
      error: (error) => {
        console.error('❌ [VolunteerVerify] Erreur de vérification:', error);
        this.loading = false;
        this.error = true;
        
        if (error.status === 400 && error.error?.error === 'INVALID_TOKEN') {
          this.errorMessage = 'Le lien de vérification est invalide ou a expiré. Veuillez contacter l\'association pour obtenir un nouveau lien.';
        } else if (error.status === 500) {
          this.errorMessage = 'Une erreur technique est survenue. Veuillez réessayer plus tard.';
        } else {
          this.errorMessage = error.error?.message || 'Une erreur inattendue est survenue.';
        }
      }
    });
  }

  retry(): void {
    this.loading = true;
    this.error = false;
    this.success = false;
    this.errorMessage = '';
    this.verifyEmail();
  }
}
