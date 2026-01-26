import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VolunteerService } from '../../../benevolat/services/volunteer.service';

interface QrCodeCard {
  id: number;
  nom: string;
  prenom: string;
  nombre_beneficiaires: number;
  qrcode_data: string;
  created_at: string;
  statut: string;
  validation_url?: string | null;
  last_scan_date?: string | null;
  last_scan_status?: string | null;
}

@Component({
  selector: 'app-beneficiaires-cartes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './beneficiaires-cartes.component.html',
  styleUrls: ['./beneficiaires-cartes.component.scss']
})
export class BeneficiairesCartesComponent implements OnInit {
  isLoading = false;
  errorMessage: string | null = null;
  searchTerm = '';
  validityStart = '01/01/2026';
  validityEnd = '31/12/2026';

  cards: QrCodeCard[] = [];
  filteredCards: QrCodeCard[] = [];

  constructor(private volunteerService: VolunteerService) {}

  ngOnInit(): void {
    this.loadCards();
  }

  loadCards(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.volunteerService.getQRCodeCards(200, 0).subscribe({
      next: (response) => {
        this.cards = response?.cards || [];
        this.applyFilters();
      },
      error: (error) => {
        console.error('Erreur lors de la récupération des cartes:', error);
        this.errorMessage = error?.message || 'Une erreur est survenue lors de la récupération des cartes.';
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredCards = [...this.cards];
      return;
    }

    this.filteredCards = this.cards.filter((card) => {
      const fullName = `${card.nom} ${card.prenom}`.toLowerCase();
      const qrId = this.getQrCodeId(card).toLowerCase();
      return fullName.includes(term) || qrId.includes(term);
    });
  }

  getQrCodeId(card: QrCodeCard): string {
    try {
      const data = JSON.parse(card.qrcode_data || '{}');
      return data.id || '';
    } catch {
      return '';
    }
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return 'Jamais';
    }
    return new Date(value).toLocaleString('fr-FR');
  }

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

  downloadCard(card: QrCodeCard): void {
    this.volunteerService.getQRCodeCardWithImage(card.id).subscribe({
      next: (response) => {
        if (!response?.card) {
          this.errorMessage = 'Carte introuvable pour le téléchargement.';
          return;
        }

        const printable = response.card;
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          this.errorMessage = 'Impossible d\'ouvrir la fenêtre d\'impression.';
          return;
        }

        const associationName = this.formatAssociationName(printable.association_nom);
        printWindow.document.write(`
          <html>
            <head>
              <title>Carte Repas - ${printable.id}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 16px; color: #111827; }
                .section { margin-bottom: 14px; font-size: 17px; }
                .label { color: #6b7280; font-weight: 700; }
                .value { color: #111827; font-weight: 600; }
                .row { display: flex; justify-content: space-between; gap: 12px; }
                .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px; background: #fff; font-size: 15px; }
                .card-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
                .card-title { font-weight: 700; color: #111827; font-size: 18px; }
                .card-subtitle { font-weight: 700; color: #111827; font-size: 17px; }
                .card-muted { color: #6b7280; font-size: 14px; }
                .card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
                .card-rules { margin-top: 12px; color: #374151; line-height: 1.35; }
                .qr-box { border: 1px solid #e5e7eb; background: #f9fafb; padding: 12px; border-radius: 8px; text-align: center; height: 100%; display: flex; align-items: center; justify-content: center; }
                .qr-image { width: 100%; max-width: 260px; height: auto; }
              </style>
            </head>
            <body>
              <div class="section">
                <div class="row"><span class="label">ID Carte:</span><span class="value">${printable.id}</span></div>
                <div class="row"><span class="label">Nom:</span><span class="value">${printable.nom} ${printable.prenom}</span></div>
                <div class="row"><span class="label">Nombre de repas:</span><span class="value">${printable.nombre_beneficiaires}</span></div>
                <div class="row"><span class="label">Date de creation:</span><span class="value">${new Date(printable.created_at).toLocaleString('fr-FR')}</span></div>
              </div>

              <div class="card">
                <div class="card-row">
                  <div>
                    <div class="card-title">Carte Beneficiaire delivree le ${new Date(printable.created_at).toLocaleDateString('fr-FR')}</div>
                    <div class="card-subtitle">${associationName}</div>
                    <div class="card-muted">Valable du ${this.validityStart} au ${this.validityEnd}</div>
                    <div class="card-grid">
                      <div><strong>Nom:</strong> ${printable.nom}</div>
                      <div><strong>Prenom:</strong> ${printable.prenom}</div>
                      <div><strong>Repas:</strong> ${printable.nombre_beneficiaires}</div>
                      <div><strong>ID:</strong> ${printable.id}</div>
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
                    <img src="${printable.qr_code_image}" alt="QR Code" class="qr-image">
                  </div>
                </div>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 300);
      },
      error: (error) => {
        console.error('Erreur lors du téléchargement de la carte:', error);
        this.errorMessage = error?.message || 'Erreur lors du téléchargement de la carte.';
      }
    });
  }
}
