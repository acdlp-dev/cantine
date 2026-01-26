import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { VolunteerService } from '../../services/volunteer.service';

@Component({
  selector: 'app-qrcode-validation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './qrcode-validation.component.html',
  styleUrls: ['./qrcode-validation.component.scss']
})
export class QrcodeValidationComponent implements OnInit {
  // État du composant
  isLoading = true;
  isSuccess = false;
  isError = false;
  errorMessage: string | null = null;
  validationData: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private volunteerService: VolunteerService
  ) { }

  ngOnInit(): void {
    // Récupérer le QR code ID depuis l'URL
    const qrCodeId = this.route.snapshot.paramMap.get('qrCodeId');

    if (!qrCodeId) {
      this.isLoading = false;
      this.isError = true;
      this.errorMessage = 'ID de QR code manquant dans l\'URL.';
      return;
    }

    // Valider le QR code en appelant le backend
    this.validateQRCode(qrCodeId);
  }

  /**
   * Valide le QR code en appelant l'endpoint de validation
   */
  validateQRCode(qrCodeId: string): void {
    this.isLoading = true;
    this.isError = false;
    this.errorMessage = null;

    this.volunteerService.validateQRCode(qrCodeId).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.isSuccess = true;
          this.validationData = response.validation;
        } else {
          this.isError = true;
          this.errorMessage = response.message || 'La validation du QR code a échoué.';
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Erreur lors de la validation du QR code:', error);
        this.isError = true;
        this.errorMessage = error?.error?.message || error.message || 'Une erreur est survenue lors de la validation du QR code.';
        this.isLoading = false;
      }
    });
  }

  /**
   * Redirige vers la page d'accueil après validation
   */
  goToHome(): void {
    this.router.navigate(['/']);
  }
}
