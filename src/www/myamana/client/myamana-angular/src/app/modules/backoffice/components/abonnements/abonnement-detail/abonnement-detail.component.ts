import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AbonnementsService } from '../../abonnements/services/abonnements.service';

interface StatutStyle {
  bg: string;
  text: string;
  dot: string;
}

@Component({
  selector: 'app-abonnement-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './abonnement-detail.component.html',
  styleUrls: ['./abonnement-detail.component.scss']
})
export class AbonnementDetailComponent implements OnInit {
  abonnementId: string = '';
  abonnement: any = null;
  isLoading: boolean = true;
  error: string | null = null;
  copySuccess: boolean = false;


  statutsColors: Record<string, StatutStyle> = {
    'actif': { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
    'pending': { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
    'inactif': { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-500' }
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private abonnementsService: AbonnementsService,
    private location: Location
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.abonnementId = params['id'];
        this.chargerDetailsAbonnement();
      } else {
        this.error = "Identifiant d'abonnement manquant";
      }
    });
  }

  chargerDetailsAbonnement(): void {
    this.isLoading = true;
    this.error = null;

    this.abonnementsService.getAbonnementDetail(this.abonnementId).subscribe({
      next: (response) => {
        if (response && response.result) {
          this.abonnement = response.result;

          // Formatter les dates si nécessaires
          if (this.abonnement.dernierPaiement) {
            this.abonnement.dernierPaiementFormatted = this.formatDate(this.abonnement.dernierPaiement);
          }
          if (this.abonnement.ajout) {
            this.abonnement.ajoutFormatted = this.formatDate(this.abonnement.ajout);
          }

          this.isLoading = false;
        } else {
          this.error = 'Données invalides reçues du serveur';
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.error("Erreur lors du chargement des détails de l'abonnement", err);
        this.error = "Impossible de charger les détails de l'abonnement. Veuillez réessayer plus tard.";
        this.isLoading = false;
      }
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  goBack(): void {
    this.location.back();
  }

  retourListe(): void {
    this.router.navigate(['/backoffice/abonnements']);
  }


  getStatutClass(statut: string): StatutStyle {
    const defaultColors: StatutStyle = { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-500' };

    // Vérification sécurisée avec une conversion en minuscules
    const statutKey = statut.toLowerCase();
    if (statutKey === 'actif' || statutKey === 'pending' || statutKey === 'inactif') {
      return this.statutsColors[statutKey];
    }

    return defaultColors;
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(
      () => {
        console.log('Texte copié dans le presse-papiers');
        this.showCopyNotification();
      },
      (err) => {
        console.error('Erreur lors de la copie dans le presse-papiers: ', err);
      }
    );
  }

  formatMoney(amount: number): string {
    if (amount === null || amount === undefined) return '0,00 €';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  }

  private showCopyNotification(): void {
    this.copySuccess = true;
    setTimeout(() => {
      this.copySuccess = false;
    }, 2000);
  }
}
