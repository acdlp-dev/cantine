import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { LucideIconsModule } from '../../../../../shared/modules/lucide-icons.module';
import { DonsServiceBackOffice, DonTableauBAckOffice } from '../../../components/dons/services/dons.service';
@Component({
  selector: 'app-don-detail',
  standalone: true,
  imports: [
    CommonModule,
    LucideIconsModule
  ],
  templateUrl: './don-detail.component.html',
  styleUrls: ['./don-detail.component.scss']
})
export class DonDetailComponent implements OnInit {
  donId: string = '';
  donDetails: DonTableauBAckOffice | null = null;
  isLoading: boolean = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private donsService: DonsServiceBackOffice,
    private location: Location
  ) { }

  ngOnInit(): void {
    // Récupérer l'ID depuis l'URL
    this.route.paramMap.subscribe(params => {
      this.donId = params.get('id') || '';
      if (this.donId) {
        this.loadDonDetails(this.donId);
      } else {
        this.error = 'ID du don non spécifié';
        this.isLoading = false;
      }
    });
  }

  loadDonDetails(id: string): void {
    this.isLoading = true;
    this.error = null;

    // À implémenter dans dons.service.ts
    this.donsService.getDonById(id).subscribe({
      next: (don) => {
        this.donDetails = don;
        this.isLoading = false;
      },
      error: (err: Error) => {
        console.error('Erreur lors du chargement des détails du don', err);
        this.error = 'Impossible de charger les détails du don.';
        this.isLoading = false;
      }
    });
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(
      () => {
        // Vous pourriez ajouter ici une notification pour indiquer que le texte a été copié
        console.log('Texte copié dans le presse-papiers');
        // Optionnellement, afficher une notification temporaire
        this.showCopyNotification();
      },
      (err) => {
        console.error('Erreur lors de la copie dans le presse-papiers: ', err);
      }
    );
  }

  goBack(): void {
    this.location.back();
  }


  private showCopyNotification(): void {
    // Vous pourriez implémenter ici une notification visuelle
    // Par exemple, avec un service de notification ou un simple élément DOM temporaire

    // Solution simple: créer un élément temporaire
    const notification = document.createElement('div');
    notification.textContent = 'Copié dans le presse-papiers!';
    notification.className = 'fixed bottom-4 right-4 bg-green-100 text-green-800 px-4 py-2 rounded shadow';
    document.body.appendChild(notification);

    // Supprimer après 2 secondes
    setTimeout(() => {
      notification.remove();
    }, 2000);
  }
}