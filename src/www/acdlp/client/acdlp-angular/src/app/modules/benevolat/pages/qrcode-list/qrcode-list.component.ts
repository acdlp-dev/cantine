import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { VolunteerService } from '../../services/volunteer.service';

@Component({
  selector: 'app-qrcode-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './qrcode-list.component.html',
  styleUrls: ['./qrcode-list.component.scss']
})
export class QrcodeListComponent implements OnInit {
  // Données des scans
  pickups: any[] = [];
  filteredPickups: any[] = [];

  // État du composant
  isLoading = false;
  errorMessage: string | null = null;

  // Filtres
  dateFrom: string = '';
  dateTo: string = '';
  searchTerm: string = '';

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;

  constructor(private volunteerService: VolunteerService) { }

  ngOnInit(): void {
    this.loadPickups();
  }

  /**
   * Charge les données des récupérations
   */
  loadPickups(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.volunteerService.getMealPickups(
      this.itemsPerPage,
      (this.currentPage - 1) * this.itemsPerPage,
      this.dateFrom,
      this.dateTo
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.pickups = response.pickups || [];
          this.filteredPickups = [...this.pickups];
          this.totalItems = response.total || 0;
          this.applyFilters();
        } else {
          this.errorMessage = response.message || 'Une erreur est survenue lors du chargement.';
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement des récupérations:', error);
        this.errorMessage = error.message || 'Une erreur est survenue lors du chargement des données.';
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  /**
   * Applique les filtres de recherche
   */
  applyFilters(): void {
    this.filteredPickups = this.pickups.filter(pickup => {
      // Filtre par terme de recherche
      const searchTermLower = this.searchTerm.toLowerCase();
      const matchesSearch = !this.searchTerm ||
        pickup.nom.toLowerCase().includes(searchTermLower) ||
        pickup.prenom.toLowerCase().includes(searchTermLower) ||
        (pickup.volunteer_nom && pickup.volunteer_nom.toLowerCase().includes(searchTermLower)) ||
        (pickup.volunteer_prenom && pickup.volunteer_prenom.toLowerCase().includes(searchTermLower));

      return matchesSearch;
    });
  }

  /**
   * Change de page
   */
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadPickups();
    }
  }

  /**
   * Réinitialise les filtres
   */
  resetFilters(): void {
    this.dateFrom = '';
    this.dateTo = '';
    this.searchTerm = '';
    this.currentPage = 1;
    this.loadPickups();
  }

  /**
   * Exporte les données (à implémenter)
   */
  exportData(): void {
    alert('Fonctionnalité d\'export à implémenter (CSV/Excel)');
    // En production, on utiliserait une bibliothèque comme Papa Parse ou ExcelJS
  }

  /**
   * Formate la date pour l'affichage
   */
  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  }

  /**
   * Formate la date pour les inputs (YYYY-MM-DD)
   */
  formatDateForInput(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch (error) {
      return '';
    }
  }

  /**
   * Calcule le nombre total de pages
   */
  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  /**
   * Génère un tableau de pages pour la pagination
   */
  get pagesArray(): number[] {
    return Array.from({length: this.totalPages}, (_, i) => i + 1);
  }

  /**
   * Calcule le nombre de scans réussis
   */
  get successfulScansCount(): number {
    if (!this.pickups || this.pickups.length === 0) return 0;
    return this.pickups.filter(p => p.statut === 'success').length;
  }

  /**
   * Calcule le nombre de doublons
   */
  get duplicateScansCount(): number {
    if (!this.pickups || this.pickups.length === 0) return 0;
    return this.pickups.filter(p => p.statut === 'duplicate').length;
  }

  /**
   * Calcule la fin de la plage de pagination
   */
  get paginationEnd(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
  }

  /**
   * Calcule le début de la plage de pagination
   */
  get paginationStart(): number {
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }
}
