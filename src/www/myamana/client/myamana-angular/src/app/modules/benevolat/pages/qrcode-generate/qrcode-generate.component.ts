import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { VolunteerService } from '../../services/volunteer.service';

@Component({
  selector: 'app-qrcode-generate',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './qrcode-generate.component.html',
  styleUrls: ['./qrcode-generate.component.scss']
})
export class QrcodeGenerateComponent implements OnInit {
  // Formulaire pour la génération de QR code
  beneficiaryForm = {
    nom: '',
    prenom: '',
    nombre_beneficiaires: 1
  };

  // État du composant
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  generatedQrCode: any = null;

  // Options pour le nombre de bénéficiaires
  familySizeOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  validityStart = '01/01/2026';
  validityEnd = '31/12/2026';
  private formatAssociationName(value?: string | null): string {
    const base = (value || '').trim();
    if (!base) {
      return 'Au Coeur De La Precarite';
    }
    const words = base
      .replace(/[-_]+/g, ' ')
      .split(' ')
      .map((word) => word.trim())
      .filter(Boolean);
    return words
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  constructor(private volunteerService: VolunteerService) { }

  ngOnInit(): void {
    // Initialisation si nécessaire
  }

  /**
   * Génère un QR code avec les informations du bénéficiaire
   */
  generateQRCode(): void {
    // Réinitialiser les messages
    this.errorMessage = null;
    this.successMessage = null;
    this.generatedQrCode = null;

    // Validation du formulaire
    if (!this.beneficiaryForm.nom.trim() || !this.beneficiaryForm.prenom.trim()) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }

    if (this.beneficiaryForm.nombre_beneficiaires < 1 || this.beneficiaryForm.nombre_beneficiaires > 10) {
      this.errorMessage = 'Le nombre de bénéficiaires doit être compris entre 1 et 10.';
      return;
    }

    // Activer le chargement
    this.isLoading = true;

    // Appeler le service pour générer le QR code
    this.volunteerService.generateQRCode(
      this.beneficiaryForm.nom.trim(),
      this.beneficiaryForm.prenom.trim(),
      this.beneficiaryForm.nombre_beneficiaires
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.generatedQrCode = response.qr_code;
          this.successMessage = 'QR code généré avec succès !';
          // Réinitialiser le formulaire pour une nouvelle génération
          this.beneficiaryForm = {
            nom: '',
            prenom: '',
            nombre_beneficiaires: 1
          };
        } else {
          this.errorMessage = response.message || 'Une erreur est survenue lors de la génération.';
        }
      },
      error: (error) => {
        console.error('Erreur lors de la génération du QR code:', error);
        this.errorMessage = error.message || 'Une erreur est survenue lors de la génération du QR code.';
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  /**
   * Télécharge le QR code généré
   */
  downloadQRCode(): void {
    if (!this.generatedQrCode || !this.generatedQrCode.qr_code_image) {
      this.errorMessage = 'Aucun QR code à télécharger.';
      return;
    }

    try {
      // Créer un lien temporaire pour le téléchargement
      const link = document.createElement('a');
      link.href = this.generatedQrCode.qr_code_image;
      link.download = `carte-repas-${this.generatedQrCode.qr_code_id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.successMessage = 'QR code téléchargé avec succès !';
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      this.errorMessage = 'Erreur lors du téléchargement du QR code.';
    }
  }

  /**
   * Imprime le QR code généré
   */
  printQRCode(): void {
    if (!this.generatedQrCode || !this.generatedQrCode.qr_code_image) {
      this.errorMessage = 'Aucun QR code à imprimer.';
      return;
    }

    try {
      // Ouvrir une nouvelle fenêtre pour l'impression
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const watermarkUrl = `${window.location.origin}/assets/images/logo.png`;
        printWindow.document.write(`
          <html>
            <head>
              <title>Carte Repas - ${this.generatedQrCode.qr_code_id}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 16px; color: #111827; }
                .section { margin-bottom: 14px; font-size: 17px; }
                .label { color: #6b7280; font-weight: 700; }
                .value { color: #111827; font-weight: 600; }
                .row { display: flex; justify-content: space-between; gap: 12px; }
                .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px; background: #fff; font-size: 15px; position: relative; overflow: hidden; }
                .card-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
                .card-title { font-weight: 700; color: #111827; font-size: 18px; }
                .card-subtitle { font-weight: 700; color: #111827; font-size: 17px; }
                .card-muted { color: #6b7280; font-size: 14px; }
                .card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
                .card-rules { margin-top: 12px; color: #374151; line-height: 1.35; }
                .qr-box { border: 1px solid #e5e7eb; background: #f9fafb; padding: 12px; border-radius: 8px; text-align: center; height: 100%; display: flex; align-items: center; justify-content: center; }
                .qr-image { width: 100%; max-width: 260px; height: auto; }
                .watermark { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0.2; pointer-events: none; }
                .watermark img { width: 70%; height: auto; max-width: 420px; }
                .card-content { position: relative; z-index: 1; }
              </style>
            </head>
            <body>
              <div class="section">
                <div class="row"><span class="label">ID Carte:</span><span class="value">${this.generatedQrCode.qr_code_id}</span></div>
                <div class="row"><span class="label">Nom:</span><span class="value">${this.generatedQrCode.nom} ${this.generatedQrCode.prenom}</span></div>
                <div class="row"><span class="label">Nombre de repas:</span><span class="value">${this.generatedQrCode.nombre_beneficiaires}</span></div>
                <div class="row"><span class="label">Date de creation:</span><span class="value">${new Date(this.generatedQrCode.created_at).toLocaleString('fr-FR')}</span></div>
              </div>

              <div class="card">
                <div class="watermark"><img src="${watermarkUrl}" alt="Filigrane logo"></div>
                <div class="card-content">
                <div class="card-row">
                  <div>
                    <div class="card-title">Carte Beneficiaire delivree le ${new Date(this.generatedQrCode.created_at).toLocaleDateString('fr-FR')}</div>
                    <div class="card-subtitle">${this.formatAssociationName(this.generatedQrCode.association_nom)}</div>
                    <div class="card-muted">Valable du ${this.validityStart} au ${this.validityEnd}</div>
                    <div class="card-grid">
                      <div><strong>Nom:</strong> ${this.generatedQrCode.nom}</div>
                      <div><strong>Prenom:</strong> ${this.generatedQrCode.prenom}</div>
                      <div><strong>Repas:</strong> ${this.generatedQrCode.nombre_beneficiaires}</div>
                      <div><strong>ID:</strong> ${this.generatedQrCode.qr_code_id}</div>
                    </div>

                    <div class="card-rules">
                      <div><strong>Rappel des regles :</strong></div>
                      <div>- 1 Carte par famille</div>
                      <div>- Enfants mineurs uniquement, sauf handicap (CMI)</div>
                      <div>- Conjoints non pris en compte</div>
                      <div>- Cartes expirees non valables</div>
                    </div>

                  </div>
                  <div class="qr-box">
                    <img src="${this.generatedQrCode.qr_code_image}" alt="QR Code" class="qr-image">
                  </div>
                </div>
                </div>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();

        // Attendre que le contenu soit chargé avant d'imprimer
        setTimeout(() => {
          printWindow.print();
        }, 500);
      } else {
        this.errorMessage = 'Impossible d\'ouvrir la fenêtre d\'impression. Veuillez vérifier vos paramètres de bloqueur de pop-ups.';
      }
    } catch (error) {
      console.error('Erreur lors de l\'impression:', error);
      this.errorMessage = 'Erreur lors de l\'impression du QR code.';
    }
  }
}
