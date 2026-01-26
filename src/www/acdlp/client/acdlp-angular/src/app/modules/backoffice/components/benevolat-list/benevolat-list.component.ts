import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideIconsModule } from '../../../../shared/modules/lucide-icons.module';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BenevolatAdminService, Benevole, BenevolesResponse } from '../../services/benevolat-admin.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-benevolat-list',
  standalone: true,
  imports: [
    CommonModule,
    LucideIconsModule,
    FormsModule,
    HttpClientModule
  ],
  templateUrl: './benevolat-list.component.html',
  styleUrls: ['./benevolat-list.component.scss'],
  providers: [BenevolatAdminService]
})
export class BenevolatListComponent implements OnInit, OnDestroy {
  benevoles: Benevole[] = [];
  benevolesTousBrut: Benevole[] = []; // Liste complète non filtrée pour la recherche locale
  benevolesFiltres: Benevole[] = [];
  benevolesAffiches: Benevole[] = [];
  isLoading: boolean = true;
  error: string | null = null;

  // Recherche
  searchTerm: string = '';
  isSearching: boolean = false;
  private searchSubject = new Subject<string>();

  // Filtres
  filterType: string = 'tous';
  filterGenre: string = 'tous';
  filterStatut: string = 'actifs'; // Par défaut : uniquement confirmés et restreints

  // Pagination
  itemsParPage: number = 10;
  pageActuelle: number = 1;
  nombreTotalPages: number = 0;
  Math = Math;

  // Tri
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Modal détails bénévole
  selectedBenevole: Benevole | null = null;
  benevoleActions: any[] = [];
  benevoleActionsPast: any[] = [];
  benevoleActionsFuture: any[] = [];
  isLoadingActions: boolean = false;
  showModal: boolean = false;

  // Édition du bénévole dans le modal
  isEditingBenevole: boolean = false;
  editedBenevole: Benevole | null = null;
  isSavingBenevole: boolean = false;

  constructor(private benevolatService: BenevolatAdminService) {}

  ngOnInit(): void {
    // Charger tous les bénévoles au démarrage (sans paramètre de recherche)
    this.loadBenevoles();
    
    // Configuration de la recherche en temps réel avec debounce
    this.searchSubject.pipe(
      debounceTime(300), // Attendre 300ms après la dernière frappe
      distinctUntilChanged() // Ne déclencher que si la valeur a changé
    ).subscribe(searchTerm => {
      this.performLocalSearch(searchTerm);
    });
  }

  ngOnDestroy(): void {
    // Nettoyer les subscriptions
    this.searchSubject.complete();
  }

  loadBenevoles(): void {
    this.isLoading = true;
    this.error = null;

    // Charger TOUS les bénévoles sans filtre de recherche côté serveur
    this.benevolatService.getBenevoles('')
      .subscribe({
        next: (response: BenevolesResponse) => {
          if (response && response.results) {
            this.benevoles = response.results;
            this.benevolesTousBrut = response.results; // Garder une copie complète
            
            // Appliquer les filtres
            this.appliquerFiltres();

            this.isLoading = false;
          } else {
            console.error('Format de réponse inattendu:', response);
            this.error = 'Format de réponse inattendu';
            this.isLoading = false;
          }
        },
        error: (err) => {
          console.error('Erreur lors du chargement des bénévoles', err);
          this.error = 'Impossible de charger les bénévoles. Veuillez réessayer plus tard.';
          this.isLoading = false;
        }
      });
  }

  /**
   * Normalise un numéro de téléphone en enlevant tous les caractères non-numériques
   * @param phone Le numéro de téléphone à normaliser
   * @returns Le numéro de téléphone normalisé (chiffres uniquement)
   */
  private normalizePhone(phone: string | undefined): string {
    if (!phone) return '';
    return phone.replace(/\D/g, ''); // Enlève tous les caractères non-numériques
  }

  /**
   * Effectue une recherche locale sur les bénévoles déjà chargés
   * @param searchTerm Le terme de recherche
   */
  performLocalSearch(searchTerm: string): void {
    if (!searchTerm || searchTerm.trim() === '') {
      // Si pas de recherche, réafficher tous les bénévoles
      this.benevoles = [...this.benevolesTousBrut];
    } else {
      // Filtrer localement sur TOUTES les colonnes
      const term = searchTerm.toLowerCase();
      const normalizedSearchPhone = this.normalizePhone(searchTerm);
      
      this.benevoles = this.benevolesTousBrut.filter(benevole => {
        // Recherche de téléphone normalisée uniquement si le terme contient des chiffres
        const phoneMatch = normalizedSearchPhone.length > 0 
          ? this.normalizePhone(benevole.telephone).includes(normalizedSearchPhone)
          : false;
        
        return (
          benevole.type?.toLowerCase().includes(term) ||
          benevole.nom?.toLowerCase().includes(term) ||
          benevole.prenom?.toLowerCase().includes(term) ||
          benevole.email?.toLowerCase().includes(term) ||
          phoneMatch ||
          benevole.adresse?.toLowerCase().includes(term) ||
          benevole.ville?.toLowerCase().includes(term) ||
          benevole.code_postal?.toLowerCase().includes(term) ||
          benevole.pays?.toLowerCase().includes(term) ||
          benevole.age?.toString().includes(term) ||
          benevole.genre?.toLowerCase().includes(term) ||
          benevole.metiers_competences?.toLowerCase().includes(term) ||
          benevole.statut?.toLowerCase().includes(term)
        );
      });
    }
    
    // Réappliquer les filtres (type, genre) et la pagination
    this.appliquerFiltres();
  }

  /**
   * Déclenche la recherche en temps réel
   * Appelé à chaque modification du champ de recherche
   */
  onSearchChange(searchTerm: string): void {
    this.searchTerm = searchTerm;
    this.searchSubject.next(searchTerm);
  }

  appliquerFiltres(): void {
    // Filtrer les bénévoles selon les critères
    this.benevolesFiltres = this.benevoles.filter(benevole => {
      const matchType = this.filterType === 'tous' || benevole.type === this.filterType;
      const matchGenre = this.filterGenre === 'tous' || benevole.genre === this.filterGenre;
      
      // Filtre par statut
      let matchStatut = false;
      if (this.filterStatut === 'tous') {
        matchStatut = true;
      } else if (this.filterStatut === 'actifs') {
        // Actifs = confirmé ou restreint (exclut "email en attente")
        matchStatut = benevole.statut === 'confirmé' || benevole.statut === 'restreint' || !benevole.statut;
      } else {
        matchStatut = benevole.statut === this.filterStatut;
      }
      
      return matchType && matchGenre && matchStatut;
    });

    // Calculer le nombre total de pages avec les données filtrées
    this.nombreTotalPages = Math.ceil(this.benevolesFiltres.length / this.itemsParPage);
    
    // Reset à la page 1 quand on applique des filtres
    this.pageActuelle = 1;
    
    // Afficher la première page
    this.afficherPage(1);
  }

  onFilterChange(): void {
    this.appliquerFiltres();
  }

  afficherPage(numeroDePage: number): void {
    if (numeroDePage < 1) {
      numeroDePage = 1;
    } else if (numeroDePage > this.nombreTotalPages) {
      numeroDePage = this.nombreTotalPages;
    }

    this.pageActuelle = numeroDePage;

    const indexDebut = (numeroDePage - 1) * this.itemsParPage;
    const indexFin = Math.min(indexDebut + this.itemsParPage, this.benevolesFiltres.length);

    this.benevolesAffiches = this.benevolesFiltres.slice(indexDebut, indexFin);
  }

  pagePrecedente(): void {
    if (this.pageActuelle > 1) {
      this.afficherPage(this.pageActuelle - 1);
    }
  }

  pageSuivante(): void {
    if (this.pageActuelle < this.nombreTotalPages) {
      this.afficherPage(this.pageActuelle + 1);
    }
  }

  searchBenevoles(term: string): void {
    this.searchTerm = term;
    this.isSearching = true;
    this.pageActuelle = 1;
    this.loadBenevoles();
  }

  exporterCSV(): void {
    console.log('Export CSV déclenché');
    if (this.benevoles.length > 0) {
      this.benevolatService.exportBenevolesCSV(this.benevoles);
    }
  }

  openBenevoleDetail(benevole: Benevole): void {
    this.selectedBenevole = benevole;
    this.showModal = true;
    this.isEditingBenevole = false;
    this.editedBenevole = null;
    this.loadBenevoleActions(benevole.email);
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedBenevole = null;
    this.benevoleActions = [];
    this.isEditingBenevole = false;
    this.editedBenevole = null;
  }

  startEditBenevole(): void {
    if (this.selectedBenevole) {
      // Créer une copie de l'objet pour l'édition
      this.editedBenevole = { ...this.selectedBenevole };
      this.isEditingBenevole = true;
    }
  }

  cancelEditBenevole(): void {
    this.isEditingBenevole = false;
    this.editedBenevole = null;
  }

  saveBenevole(): void {
    if (!this.editedBenevole || !this.selectedBenevole) {
      return;
    }

    // Validation des champs obligatoires
    if (!this.editedBenevole.nom || !this.editedBenevole.prenom) {
      alert('Le nom et le prénom sont obligatoires');
      return;
    }

    this.isSavingBenevole = true;

    this.benevolatService.updateBenevole(this.selectedBenevole.email, this.editedBenevole)
      .subscribe({
        next: (response) => {
          if (response.success) {
            // Mettre à jour le bénévole sélectionné
            Object.assign(this.selectedBenevole!, this.editedBenevole);
            
            // Mettre à jour dans la liste principale
            const index = this.benevoles.findIndex(b => b.email === this.selectedBenevole!.email);
            if (index !== -1) {
              Object.assign(this.benevoles[index], this.editedBenevole);
            }
            
            // Réappliquer les filtres pour mettre à jour l'affichage
            this.appliquerFiltres();
            
            // Fermer le mode édition
            this.isEditingBenevole = false;
            this.editedBenevole = null;
            
            alert('Bénévole mis à jour avec succès');
          }
          this.isSavingBenevole = false;
        },
        error: (err) => {
          console.error('Erreur lors de la mise à jour du bénévole', err);
          alert('Erreur lors de la mise à jour du bénévole');
          this.isSavingBenevole = false;
        }
      });
  }

  loadBenevoleActions(email: string): void {
    this.isLoadingActions = true;
    this.benevolatService.getBenevoleActions(email)
      .subscribe({
        next: (response) => {
          if (response && response.success) {
            this.benevoleActions = response.actions || [];
            
            // Séparer les actions passées et futures
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Réinitialiser à minuit pour comparaison
            
            this.benevoleActionsPast = this.benevoleActions.filter(action => {
              const actionDate = new Date(action.date_action);
              actionDate.setHours(0, 0, 0, 0);
              return actionDate < today;
            });
            
            this.benevoleActionsFuture = this.benevoleActions.filter(action => {
              const actionDate = new Date(action.date_action);
              actionDate.setHours(0, 0, 0, 0);
              return actionDate >= today;
            });
          }
          this.isLoadingActions = false;
        },
        error: (err) => {
          console.error('Erreur lors du chargement des actions', err);
          this.isLoadingActions = false;
        }
      });
  }

  /**
   * Trie les bénévoles par colonne
   * @param column Le nom de la colonne à trier
   */
  sortBy(column: string): void {
    // Si on clique sur la même colonne, inverser la direction
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Nouvelle colonne : tri ascendant par défaut
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    // Trier les bénévoles filtrés
    this.benevolesFiltres.sort((a, b) => {
      let valueA: any;
      let valueB: any;

      // Récupérer les valeurs selon la colonne
      switch (column) {
        case 'type':
          valueA = a.type || '';
          valueB = b.type || '';
          break;
        case 'statut':
          valueA = a.statut || '';
          valueB = b.statut || '';
          break;
        case 'nom':
          valueA = a.nom || '';
          valueB = b.nom || '';
          break;
        case 'prenom':
          valueA = a.prenom || '';
          valueB = b.prenom || '';
          break;
        case 'email':
          valueA = a.email || '';
          valueB = b.email || '';
          break;
        case 'telephone':
          valueA = a.telephone || '';
          valueB = b.telephone || '';
          break;
        case 'ville':
          valueA = a.ville || '';
          valueB = b.ville || '';
          break;
        case 'age':
          valueA = a.age || 0;
          valueB = b.age || 0;
          break;
        case 'genre':
          valueA = a.genre || '';
          valueB = b.genre || '';
          break;
        case 'created_at':
          valueA = a.created_at ? new Date(a.created_at).getTime() : 0;
          valueB = b.created_at ? new Date(b.created_at).getTime() : 0;
          break;
        case 'date_derniere_action_presente':
          valueA = a.date_derniere_action_presente ? new Date(a.date_derniere_action_presente).getTime() : 0;
          valueB = b.date_derniere_action_presente ? new Date(b.date_derniere_action_presente).getTime() : 0;
          break;
        default:
          return 0;
      }

      // Comparer les valeurs
      let comparison = 0;
      if (valueA > valueB) {
        comparison = 1;
      } else if (valueA < valueB) {
        comparison = -1;
      }

      // Appliquer la direction du tri
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    // Réafficher la page actuelle avec les données triées
    this.afficherPage(this.pageActuelle);
  }

  /**
   * Retourne l'icône de tri appropriée pour une colonne
   * @param column Le nom de la colonne
   */
  getSortIcon(column: string): string {
    if (this.sortColumn !== column) {
      return 'chevron-down'; // Icône par défaut (non trié)
    }
    return this.sortDirection === 'asc' ? 'arrow-up' : 'arrow-down';
  }
}
