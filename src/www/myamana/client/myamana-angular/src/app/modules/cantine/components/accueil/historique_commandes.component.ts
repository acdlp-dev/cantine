import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClientModule, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { HistoriqueCommandesResponse, HistoriqueCommandesServices, HistoriqueCommandes } from './services/historique_commandes.services';
import { LucideIconsModule } from '../../../../shared/modules/lucide-icons.module';
import { CantineService } from '../../services/cantine.service';

@Component({
  selector: 'app-commandes',
  standalone: true,
  imports: [CommonModule, RouterLink, HttpClientModule, FormsModule, LucideIconsModule],
  templateUrl: `./historique_commandes.component.html`,
  styles: []
})
export class HistoriqueCommandesComponent implements OnInit {
  commandes: HistoriqueCommandes[] = [];
  // Full list fetched from server (subject to MAX limit)
  commandesAll: HistoriqueCommandes[] = [];
  isLoading = true;
  errorMessage = '';

  // Pagination / filtration (client-side pagination like Abonnements)
  page = 1; // current page (1-based)
  pageSize = 10; // items per page
  pageSizeOptions = [10, 25, 50];
  total = 0; // total items reported by server
  readonly MAX_COMMANDES = 10000; // same pattern as abonnements

  dateFromStr = '';
  dateToStr = '';

  // Édition
  editModalVisible = false;
  editCommande: HistoriqueCommandes | null = null;
  editDisponibles: number | null = null;
  editNouvelleQuantite: number | null = null;
  editError = '';
  get editMaxAutorise(): number | null {
    if (!this.editCommande) return null;
    const base = this.editDisponibles || 0;
    return base + (this.editCommande.repas_quantite || 0);
  }

  // Banner state
  showInfosBlockingBanner = false;
  missingCantineFields: string[] = [];

  constructor(
    private router: Router,
    private historiqueCommandesServices: HistoriqueCommandesServices,
    private cantineService: CantineService
  ) { }

  ngOnInit(): void {
    // Check infos completeness first
    this.cantineService.checkCanteInfosCompleted().subscribe({
      next: (res) => {
        if (!res?.isComplete) {
          this.showInfosBlockingBanner = true;
          this.missingCantineFields = res?.missingFields || [];
          this.isLoading = false;
          return;
        }
        this.fetchCommandes();
      },
      error: () => {
        // On error, block as safe default
        this.showInfosBlockingBanner = true;
        this.missingCantineFields = [];
        this.isLoading = false;
      }
    });
  }

  goToInfos(): void {
    this.router.navigate(['/backoffice/infos']);
  }

  // Convertit jj/mm/aaaa -> yyyy-MM-dd
  private toIso(dateStr: string): string | null {
    if (!dateStr) return null;
    // If input already in yyyy-mm-dd (HTML date input), return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    // Accept dd/mm/yyyy as well
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const [dd, mm, yyyy] = parts;
    if (dd.length !== 2 || mm.length !== 2 || yyyy.length !== 4) return null;
    return `${yyyy}-${mm}-${dd}`;
  }

  fetchCommandes(): void {
    this.isLoading = true;
    this.errorMessage = '';
    // Construire les params pour récupérer un maximum d'éléments (client-side pagination)
    const isoFrom = this.toIso(this.dateFromStr);
    const isoTo = this.toIso(this.dateToStr);
    const params: any = { limit: this.MAX_COMMANDES };
    if (isoFrom) params.dateFrom = isoFrom;
    if (isoTo) params.dateTo = isoTo;

    this.historiqueCommandesServices.getCommandesAssosCantine(params).subscribe({
      next: (response: HistoriqueCommandesResponse & { total?: number }) => {
        // Store full set and compute paging client-side (like Abonnements)
        this.commandesAll = response.results || [];
        this.total = (response as any).total || this.commandesAll.length;
        // compute pages
        this.page = 1;
        // afficher la première page
        this.afficherPage(1);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des commandes', err);
        this.errorMessage = 'Impossible de charger les commandes. Veuillez réessayer plus tard.';
        this.isLoading = false;
      }
    });
  }

  /** Pagination helpers **/
  nextPage(): void {
    if (this.page * this.pageSize < this.total) {
      this.afficherPage(this.page + 1);
    }
  }
  prevPage(): void {
    if (this.page > 1) {
      this.afficherPage(this.page - 1);
    }
  }
  goToPage(n: number): void {
    if (n >= 1 && n <= this.totalPages) {
      this.afficherPage(n);
    }
  }

  changePageSize(size: number): void {
    this.pageSize = size;
    this.page = 1;
    // re-calc and display first page from already-fetched data
    this.afficherPage(1);
  }

  /** Coupe la liste complète pour afficher la page demandée */
  afficherPage(page: number): void {
    this.page = page;
    const debut = (this.page - 1) * this.pageSize;
    const fin = debut + this.pageSize;
    // Always slice from commandesAll. If commandesAll is empty, clear commandes so the UI shows empty state.
    const source = this.commandesAll || [];
    if (!source.length) {
      this.commandes = [];
      return;
    }
    this.commandes = source.slice(debut, fin);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  /** Affichage début pour la pagination (1-based) */
  getDisplayStart(): number {
    return (this.page - 1) * this.pageSize + 1;
  }

  /** Affichage fin pour la pagination (min de page*pageSize et total) */
  getDisplayEnd(): number {
    return Math.min(this.page * this.pageSize, this.total);
  }

  /** Tableaux des numéros de pages pour la boucle en template */
  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  applyFilter(): void {
    this.page = 1;
    this.fetchCommandes();
  }

  resetFilter(): void {
    this.dateFromStr = '';
    this.dateToStr = '';
    this.page = 1;
    this.fetchCommandes();
  }

  /**
   * Retourne les classes CSS pour le statut
   */
  getStatutClass(statut: string): string {
    switch (statut) {
      case 'a_recuperer':
        return 'bg-indigo-100 text-indigo-800';
      case 'en_cours':
        return 'bg-yellow-100 text-yellow-800';
      case 'non_confirme':
        return 'bg-amber-100 text-amber-800';
      case 'livree':
        return 'bg-green-100 text-green-800';
      case 'annulee':
        return 'bg-red-100 text-red-800';
      case 'a_preparer':
        return 'bg-purple-100 text-purple-800';
      case 'non_recupere':
        return 'bg-pink-100 text-pink-800';
      case 'recupere':
        return 'bg-teal-100 text-teal-800';
      case 'en_attente':
        return 'bg-gray-100 text-gray-800';
      case 'confirmee':
        return 'bg-blue-100 text-blue-800';
      case 'en_preparation':
        return 'bg-orange-100 text-orange-800';
      case 'blocked':
        return 'bg-gray-700 text-white';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  /**
   * Retourne le label français pour le statut
   */
  getStatutLabel(statut: string): string {
    switch (statut) {
      case 'a_recuperer':
        return 'À récupérer';
      case 'en_cours':
        return 'En cours';
      case 'non_confirme':
        return 'Non confirmée';
      case 'livree':
        return 'Livrée';
      case 'annulee':
        return 'Annulée';
      case 'a_preparer':
        return 'Programmée';
      case 'non_recupere':
        return 'Non récupérée';
      case 'recupere':
        return 'Récupérée';
      case 'blocked':
        return 'Bloquée';
      default:
        return 'Inconnu';
    }
  }

  /**
   * Annule une commande
   */
  annulerCommande(commande: HistoriqueCommandes): void {
    // Prevent cancellation if delivery date already passed
    if (this.isLivraisonPassed(commande)) {
      alert('Impossible d\'annuler : la date de livraison est déjà passée.');
      return;
    }
    const qtyText = `${commande.repas_quantite || 0} repas${commande.colis_quantite ? ' + ' + commande.colis_quantite + ' colis' : ''}`;
    const message = `Êtes-vous sûr de vouloir annuler la commande #${commande.id} (${qtyText}) ?`;
    if (!confirm(message)) return;

    // Call API to set statut = 'annulee'
    this.historiqueCommandesServices.annulerCommande(commande.id).subscribe({
      next: (res) => {
        // Update UI: mark as annulee or remove from list
        const idx = this.commandes.findIndex(c => c.id === commande.id);
        if (idx > -1) this.commandes.splice(idx, 1);
      },
      error: (err) => {
        console.error('Erreur annulation:', err);
        alert('Erreur lors de l\'annulation. Veuillez réessayer.');
      }
    });
  }

  /** Retourne true si la date de livraison est antérieure à aujourd'hui (jour uniquement) */
  isLivraisonPassed(commande: HistoriqueCommandes): boolean {
    if (!commande || !commande.livraison) return false;
    const livraisonDate = new Date(commande.livraison);
    const today = new Date();
    // 1 jour avant minimum
    const todayMinusOne = new Date();
    todayMinusOne.setDate(today.getDate() - 1);
    // zero time portion for day-only comparison
    livraisonDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return livraisonDate < today || livraisonDate < todayMinusOne;
  }

  // Édition
  openEditModal(commande: HistoriqueCommandes): void {
    // cutoff: modification autorisée jusqu'à la veille
    if (this.isLivraisonPassed(commande)) {
      alert('Modification impossible : la veille de la livraison est passée.');
      return;
    }
    this.editCommande = { ...commande };
    this.editNouvelleQuantite = commande.repas_quantite;
    this.editError = '';
    this.editModalVisible = true;
    // Format date as yyyy-MM-dd
    let iso = this.toIso(commande.livraison) || commande.livraison;
    // Appel service Angular pour disponibilités
    this.historiqueCommandesServices.getQuantiteCantine(iso).subscribe({
      next: (data: any) => {
        this.editDisponibles = (data && typeof data.total === 'number') ? data.total : 0;
      },
      error: (err) => {
        console.error('Erreur disponibilités', err);
        this.editDisponibles = 0;
      }
    });
  }

  closeEditModal(): void {
    this.editModalVisible = false;
    this.editCommande = null;
    this.editDisponibles = null;
    this.editNouvelleQuantite = null;
    this.editError = '';
  }

  confirmerEdit(): void {
    if (!this.editCommande || this.editNouvelleQuantite == null) return;
    const newQty = Math.max(1, this.editNouvelleQuantite);
    // validation client: pas au-delà du max autorisé
    const max = this.editMaxAutorise || 0;
    if (newQty > max) {
      this.editError = `Quantité maximale autorisée: ${max}`;
      return;
    }
    // appeler backend via service Angular
    const id = this.editCommande.id;
    this.historiqueCommandesServices.updateCommandeQuantite(id, newQty).subscribe({
      next: (_) => {
        // mettre à jour la ligne en local
        const idx = this.commandes.findIndex(c => c.id === id);
        if (idx > -1) {
          this.commandes[idx].repas_quantite = newQty;
        }
        this.closeEditModal();
        alert('Modification enregistrée avec succès.');
      },
      error: (err) => {
        console.error('Erreur update', err);
        this.editError = 'Impossible de modifier la commande (quota ou délai).';
        alert('La modification a échoué. Veuillez réessayer.');
      }
    });
  }
}