import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideIconsModule } from '../../../../shared/modules/lucide-icons.module';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { DonsServiceBackOffice, DonTableauBAckOffice, DonsResponse } from '../../components/dons/services/dons.service';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dons',
  standalone: true,
  imports: [
    CommonModule,
    LucideIconsModule,
    FormsModule,
    HttpClientModule
  ],
  templateUrl: './dons.component.html',
  styleUrls: ['./dons.component.scss'],
  providers: [DonsServiceBackOffice]
})
export class DonsBackOffice implements OnInit {
  donsBackOffice: DonTableauBAckOffice[] = [];
  donsAffiches: DonTableauBAckOffice[] = [];
  isLoading: boolean = true;
  error: string | null = null;
  totalDons: number = 0;
  montantTotal: number = 0;

  // Filtre - année uniquement, avec "toutes" comme valeur par défaut
  filterYear: string = 'toutes';

  // Recherche
  searchTerm: string = '';
  private searchSubject = new Subject<string>();
  isSearching: boolean = false;

  // Pagination
  itemsParPage: number = 10;
  pageActuelle: number = 1;
  nombreTotalPages: number = 0;
  Math = Math; // Pour utiliser Math.min dans le template

  // Limite pour le nombre de dons récupérés
  readonly MAX_DONS: number = 10000;

  constructor(private donsService: DonsServiceBackOffice
    , private router: Router
  ) { }

  ngOnInit(): void {

    this.loadDons();
  }

  loadDons(): void {
    this.isLoading = true;
    this.error = null;

    this.donsService.getDons(this.filterYear, this.searchTerm, this.MAX_DONS)
      .subscribe({
        next: (response: DonsResponse) => {
          if (response && response.results) {
            this.donsBackOffice = response.results;
            this.totalDons = response.total; // Nombre total de dons dans la base

            // Afficher un message si la limite est atteinte
            if (this.donsBackOffice.length === this.MAX_DONS && this.totalDons > this.MAX_DONS) {
              console.warn(`Limite de ${this.MAX_DONS} dons atteinte. Total réel: ${this.totalDons}`);
            }

            // Calculer le nombre total de pages
            this.nombreTotalPages = Math.ceil(this.donsBackOffice.length / this.itemsParPage);
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
          console.error('Erreur lors du chargement des dons', err);
          this.error = 'Impossible de charger les dons. Veuillez réessayer plus tard.';
          this.isLoading = false;
        }
      });
  }

  // Méthode pour afficher une page spécifique
  afficherPage(numeroDePage: number): void {
    // Vérifier que le numéro de page est valide
    if (numeroDePage < 1) {
      numeroDePage = 1;
    } else if (numeroDePage > this.nombreTotalPages) {
      numeroDePage = this.nombreTotalPages;
    }

    // Mettre à jour la page actuelle
    this.pageActuelle = numeroDePage;

    // Calculer l'index de début et de fin pour la tranche de dons à afficher
    const indexDebut = (numeroDePage - 1) * this.itemsParPage;
    const indexFin = Math.min(indexDebut + this.itemsParPage, this.donsBackOffice.length);

    // Extraire la tranche de dons pour la page actuelle
    this.donsAffiches = this.donsBackOffice.slice(indexDebut, indexFin);
  }

  // Méthodes pour la navigation entre les pages
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

  searchDons(term: string): void {
    this.searchTerm = term;
    this.isSearching = true;
    this.pageActuelle = 1;
    this.loadDons();
  }

  // Méthodes pour les filtres
  filtrerParAnnee(annee: string): void {
    this.filterYear = annee;
    this.loadDons();
  }

  // Indique si la limite de données est atteinte
  get isLimitReached(): boolean {
    return this.donsBackOffice.length === this.MAX_DONS && this.totalDons > this.MAX_DONS;
  }

  // Calcule le montant total des dons
  getMontantTotal(): number {
    return this.donsBackOffice.reduce((total, don) => {
      // Convertir la chaîne en nombre et l'ajouter au total
      const montant = parseFloat(don.montant.toString()) || 0;
      return total + montant;
    }, 0);
  }

exporterCSV(): void {
  // Créer les en-têtes du CSV
  const headers = ['ID Don', 'Date', 'Montant', 'Donateur', 'Email', 'Téléphone', 'Adresse', 'Code Postal', 'Ville', 'Pays', 'Type Paiement', 'Statut'];
  
  // Convertir les données en lignes CSV
  const lignesCSV = this.donsBackOffice.map(don => {
    return [
      don.id || '',
      don.datePaiement || '',
      don.montant || '',
      don.nom || '',
      don.email || '',
      don.tel || '',
      don.adresse || '',
      don.code_postal || '',
      don.ville || '',
      don.pays || '',
      don.type || '',
    ].map(champ => {
      // Échapper les guillemets et entourer les champs contenant des virgules ou guillemets
      const champStr = String(champ);
      if (champStr.includes(',') || champStr.includes('"') || champStr.includes('\n')) {
        return `"${champStr.replace(/"/g, '""')}"`;
      }
      return champStr;
    }).join(',');
  });

  // Combiner les en-têtes et les lignes
  const csvContent = [headers.join(','), ...lignesCSV].join('\n');

  // Créer un Blob avec le contenu CSV
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });

  // Créer un lien de téléchargement
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  // Générer un nom de fichier avec la date actuelle
  const dateExport = new Date().toISOString().split('T')[0];
  const nomFichier = `export_dons_${dateExport}.csv`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', nomFichier);
  link.style.visibility = 'hidden';
  
  // Ajouter au DOM, cliquer et supprimer
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Libérer l'URL
  URL.revokeObjectURL(url);
}

  showDonDetail(donId: string): void {
    console.log(`Afficher les détails du don ${donId}`);
    this.router.navigate(['/backoffice/dons/', donId]);
  }
}