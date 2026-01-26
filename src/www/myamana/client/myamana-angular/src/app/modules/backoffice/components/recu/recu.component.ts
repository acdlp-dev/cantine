import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RecusService } from './services/recus.service';
import { RecuFiscal, RecuFiscalFilters, RecusStats } from '../../models/recu.model';



@Component({
  selector: 'app-recus',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
  ],
  templateUrl: './recu.component.html',
  styleUrls: ['./recu.component.scss']
})
export class RecusComponent implements OnInit {

  // Référence à l'objet Math pour l'utiliser dans le template
  Math = Math;

  // Année courante
  currentYear = new Date().getFullYear();
  lastYear = this.currentYear - 1;

  // États de chargement
  isLoadingStats = false;
  isLoadingList = false;
  isGeneratingRecu = false;
  isGeneratingBulk = false;

  // Variables pour la génération en masse
  selectedYear: string = new Date().getFullYear().toString();
  selectedType: string = 'all';

  // Données
  stats: RecusStats | null = null;
  recusList: RecuFiscal[] = []; // Tous les reçus
  recusAffiches: RecuFiscal[] = []; // Reçus de la page courante

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  nombreTotalPages = 0;

  // Constantes
  readonly MAX_RECUS: number = 10000;

  // Filtres
  filterForm: FormGroup;
  years: string[] = [];

  constructor(
    private recusService: RecusService,
    private fb: FormBuilder
  ) {
    // Initialisation du formulaire de filtres
    this.filterForm = this.fb.group({
      year: [''],
      email: [''],
    });

    // Génération des années (de l'année courante jusqu'à 2023)
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= 2023; year--) {
      this.years.push(year.toString());
    }

  }

  ngOnInit(): void {
    this.loadStats();
  }


  /**
   * Retourne la valeur maximale du nombre de reçus dans les statistiques par année
   */
  getMaxYearlyCount(): number {
    if (!this.stats || !this.stats.yearlyStats || this.stats.yearlyStats.length === 0) {
      return 1;
    }
    return Math.max(...this.stats.yearlyStats.map(stat => stat.count));
  }

  /**
   * Charge les statistiques des reçus fiscaux
   */
  loadStats(): void {
    this.isLoadingStats = true;
    this.recusService.getRecusStats().subscribe({
      next: (response: { stats: RecusStats }) => {
        this.stats = response.stats;
        this.isLoadingStats = false;
      },
      error: (error: unknown) => {
        console.error('Erreur lors du chargement des statistiques', error);
        this.isLoadingStats = false;
      }
    });
  }

  /**
   * Charge tous les reçus (avec une limite) puis gère la pagination côté client
   */
  loadAllRecus(): void {
    this.isLoadingList = true;

    // Récupération des filtres depuis le formulaire
    const filters = {
      email: this.filterForm.get('email')?.value || '',
      year: this.filterForm.get('year')?.value || '',
    };

    this.recusService.getRecusList(filters, 1, this.MAX_RECUS).subscribe({
      next: (response) => {
        console.log('Liste des reçus:', response.data);
        this.recusList = response.data;
        this.totalItems = response.total;
        
        // Calcul du nombre total de pages
        this.nombreTotalPages = Math.ceil(this.recusList.length / this.pageSize);
        
        // Reset à la première page quand on charge de nouvelles données
        this.currentPage = 1;
        
        // Afficher la première page
        this.afficherPage(1);
        
        this.isLoadingList = false;
      },
      error: (error: unknown) => {
        console.error('Erreur lors du chargement des reçus', error);
        this.isLoadingList = false;
        // TODO: Afficher un message d'erreur
      }
    });
  }

  /**
   * Affiche les reçus pour la page spécifiée
   */
  afficherPage(page: number): void {
    this.currentPage = page;
    const debut = (this.currentPage - 1) * this.pageSize;
    const fin = debut + this.pageSize;
    this.recusAffiches = this.recusList.slice(debut, fin);
  }

  /**
   * Change de page
   */
  changePage(page: number): void {
    this.afficherPage(page);
  }

  pageSuivante(): void {
    if (this.currentPage < this.nombreTotalPages) {
      this.afficherPage(this.currentPage + 1);
    }
  }

  pagePrecedente(): void {
    if (this.currentPage > 1) {
      this.afficherPage(this.currentPage - 1);
    }
  }

  /**
   * Applique les filtres
   */
  applyFilters(): void {
    this.loadAllRecus(); // Recharger tous les reçus avec les nouveaux filtres
  }

  /**
   * Réinitialise les filtres
   */
  resetFilters(): void {
    this.filterForm.reset();
    this.loadAllRecus(); // Recharger tous les reçus sans filtres
  }

  /**
   * Génère un reçu fiscal pour un don spécifique
   */
  generateRecu(donId: string, donType: string = 'ponctuel'): void {
    // this.isGeneratingRecu = true;
    // this.recusService.generateRecu(donId, donType).subscribe({
    //   next: (response: { success: boolean, pdfLink: string }) => {
    //     // Mise à jour de la liste et des statistiques
    //     this.loadStats();
    //     this.loadRecus();
    //     this.isGeneratingRecu = false;
    //     // TODO: Afficher un message de succès
    //   },
    //   error: (error: unknown) => {
    //     console.error('Erreur lors de la génération du reçu', error);
    //     this.isGeneratingRecu = false;
    //     // TODO: Afficher un message d'erreur
    //   }
    // });
  }

  /**
   * Génère des reçus fiscaux en masse pour une année spécifiée
   */
  generateBulkRecus(year: string = this.selectedYear, type: string = this.selectedType): void {
    //   this.isGeneratingBulk = true;
    //   this.recusService.generateBulkRecus(year, type).subscribe({
    //     next: (response: { success: boolean, count: number }) => {
    //       // Mise à jour des statistiques et de la liste
    //       this.loadStats();
    //       this.loadRecus();
    //       this.isGeneratingBulk = false;
    //       // TODO: Afficher un message de succès
    //     },
    //     error: (error: unknown) => {
    //       console.error('Erreur lors de la génération des reçus', error);
    //       this.isGeneratingBulk = false;
    //       // TODO: Afficher un message d'erreur
    //     }
    //   });
  }
}