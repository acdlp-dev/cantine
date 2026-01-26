import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Router } from '@angular/router';
import { AbonnementsService, Abonnement, AbonnementsResponse } from './services/abonnements.service';

@Component({
  selector: 'app-abonnements',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './abonnements.component.html',
  styleUrl: './abonnements.component.scss'
})
export class AbonnementsComponent implements OnInit {
  abonnementsBackOffice: Abonnement[] = [];
  abonnementsAffiches: Abonnement[] = [];
  isLoading: boolean = true;
  isSearching: boolean = false;
  searchTerm: string = '';
  filterYear: string = 'toutes';
  filterStatut: string = 'tous';
  error: string | null = null;
  totalAbonnements: number = 0;

  // Constantes
  readonly MAX_ABONNEMENTS: number = 10000;

  // Pagination
  pageActuelle: number = 1;
  itemsParPage: number = 10;
  nombreTotalPages: number = 0;
  Math = Math;

  constructor(
    private abonnementsService: AbonnementsService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.chargerAbonnements();
  }

  chargerAbonnements(): void {
    this.isLoading = true;
    this.error = null;

    this.abonnementsService.getAbonnementsBackOffice(this.filterYear, this.filterStatut, this.searchTerm, this.MAX_ABONNEMENTS)
      .subscribe({
        next: (response: AbonnementsResponse) => {

          if (response && response.results) {
            this.abonnementsBackOffice = response.results.map((abonnement: any) => {
              // Formater la date si nécessaire
              if (abonnement.dernierPaiement) {
                abonnement.dernierPaiement = this.formatDate(abonnement.dernierPaiement);
              }
              return abonnement;
            });

            this.totalAbonnements = response.total; // Nombre total d'abonnements dans la base

            // Afficher un message si la limite est atteinte
            if (this.abonnementsBackOffice.length === this.MAX_ABONNEMENTS && this.totalAbonnements > this.MAX_ABONNEMENTS) {
              console.warn(`Limite de ${this.MAX_ABONNEMENTS} abonnements atteinte. Total réel: ${this.totalAbonnements}`);
            }

            // Calculer le nombre total de pages
            this.nombreTotalPages = Math.ceil(this.abonnementsBackOffice.length / this.itemsParPage);
            // Reset à la page 1 quand on charge de nouvelles données
            this.pageActuelle = 1;
            // Afficher la première page
            this.afficherPage(1);

            this.isLoading = false;
          } else {
            console.error('Format de réponse inattendu:', response);
            this.error = 'Format de réponse inattendu';
            this.isLoading = false;
          }
        },
        error: (err) => {
          console.error('Erreur lors du chargement des abonnements', err);
          this.error = 'Impossible de charger les abonnements. Veuillez réessayer plus tard.';
          this.isLoading = false;
        }
      });
  }

  afficherPage(page: number): void {
    this.pageActuelle = page;
    const debut = (this.pageActuelle - 1) * this.itemsParPage;
    const fin = debut + this.itemsParPage;
    this.abonnementsAffiches = this.abonnementsBackOffice.slice(debut, fin);
  }

  pageSuivante(): void {
    if (this.pageActuelle < this.nombreTotalPages) {
      this.afficherPage(this.pageActuelle + 1);
    }
  }

  pagePrecedente(): void {
    if (this.pageActuelle > 1) {
      this.afficherPage(this.pageActuelle - 1);
    }
  }

  filtrerParAnnee(annee: string): void {
    this.filterYear = annee;
    this.chargerAbonnements();
  }

  filtrerParStatut(statut: string): void {
    this.filterStatut = statut;
    this.chargerAbonnements();
  }

  searchAbonnements(term: string): void {
    this.searchTerm = term;
    this.chargerAbonnements();
  }

  showAbonnementDetail(id: string): void {
    this.router.navigate(['/backoffice/abonnements/detail', id]);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  }

  exporterCSV(): void {
    // Implémenter l'export CSV si nécessaire
    console.log('Exporter en CSV');
  }
}