import { Component, OnInit, HostListener } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, finalize } from 'rxjs/operators';
import { CampagnesResponse, CampagnesService } from './services/campagnes.service';
import { of } from 'rxjs';
import { BackofficeAuthService } from '../../../backoffice-auth/services/backoffice-auth.service';
import * as QRCode from 'qrcode';


interface Campaign {
  id: number;
  nom: string;
  type: 'ponctuel' | 'mensuel';
  objectif: number;
  montant: number;
  statut: 'actif' | 'inactif' | 'marketing';
  step1?: 'libre' | 'calcul' | 'selecteurNominatif';
  prix?: number;
  donations?: Donation[];
}

interface Donation {
  id: number;
  montant: number;
  date: Date;
  donateur_id: number;
}

@Component({
  selector: 'app-campagnes',
  standalone: true,
  imports: [
    LucideAngularModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './campagnes.component.html',
  styleUrl: './campagnes.component.scss'
})
export class CampagnesComponent implements OnInit {
  // États de chargement et d'erreur
  isLoading: boolean = true;
  error: string | null = null;

  // Gestion des campagnes
  campaigns: Campaign[] = [];
  filteredCampaigns: Campaign[] = [];

  // Filtres et pagination
  searchTerm: string = '';
  typeFilter: string = 'all';
  statusFilter: string = 'all';
  currentPage: number = 1;
  itemsPerPage: number = 10;

  // Modals et formulaires
  showCampaignModal: boolean = false;
  campaignForm!: FormGroup;
  editingCampaign: Campaign | null = null;
  selectedCampaign: Campaign | null = null;

  // Notification toast
  notification: string | null = null;
  notificationType: 'success' | 'error' = 'success';
  notificationTimeout: any;

  // Variable pour stocker le montant des dons du mois en cours
  currentMonthDonationsAmount: number = 0;

  // Variables pour la modal de confirmation de changement de statut
  showStatusConfirmModal: boolean = false;
  campaignToToggle: Campaign | null = null;

  // Propriété pour stocker les montants collectés par campagne (utilisation du nom comme clé)
  campaignAmounts: { [key: string]: number } = {};

  // Menu d'actions (ouvert via l'icône écrou)
  openActionMenuId: number | null = null;

  // URI de l'association pour construire l'URL de la campagne
  assoUri: string = '';

  // Variables pour la modal de QR code
  showQRCodeModal: boolean = false;
  qrCodeDataUrl: string = '';
  selectedCampaignForQR: Campaign | null = null;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private campagnesService: CampagnesService, // Changement de nom pour correspondre au service
    private backofficeAuthService: BackofficeAuthService
  ) { }

  ngOnInit(): void {
    this.loadCampaigns();
    this.loadCurrentMonthDonations();
    this.loadAssoUri();
    // Initialisation du formulaire de campagne
    this.initCampaignForm();
  }

  // Initialisation du formulaire
  initCampaignForm(): void {
    this.campaignForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(3)]],
      type: ['ponctuel', Validators.required],
      objectif: [0, [Validators.required, Validators.min(1)]],
      step1: ['libre'],
      prix: [0, Validators.min(0)]
    });

    // Validation conditionnelle pour le prix
    this.campaignForm.get('step1')?.valueChanges.subscribe(value => {
      if (value === 'calcul' || value === 'selecteurNominatif') {
        this.campaignForm.get('prix')?.setValidators([Validators.required, Validators.min(1)]);
      } else {
        this.campaignForm.get('prix')?.setValidators([Validators.min(0)]);
      }
      this.campaignForm.get('prix')?.updateValueAndValidity();
    });
  }

  loadCampaigns(): void {
    this.isLoading = true;
    this.error = null;

    this.campagnesService.getCampagnesBackOffice()
      .subscribe({
        next: (response: CampagnesResponse) => {
          // Affecte les données aux tableaux
          if (response && response.results) {
            // Trier les campagnes : actives en premier, puis inactives, puis marketing
            this.campaigns = response.results.sort((a, b) => {
              const statusOrder: { [key: string]: number } = {
                'actif': 1,
                'inactif': 2,
                'marketing': 3
              };
              return (statusOrder[a.statut] || 99) - (statusOrder[b.statut] || 99);
            });
            
            this.filteredCampaigns = [...this.campaigns]; // Copie des campagnes pour l'affichage

            // Charger les montants collectés pour chaque campagne (utiliser le nom)
            this.campaigns.forEach(campaign => {
              this.loadCampaignAmount(campaign.nom);
            });
          } else {
            this.campaigns = [];
            this.filteredCampaigns = [];
          }

          this.isLoading = false;
        },
        error: (err) => {
          console.error('Erreur lors du chargement des campagnes', err);
          this.error = 'Impossible de charger les campagnes. Veuillez réessayer plus tard.';
          this.isLoading = false;

          // Initialisation des tableaux vides en cas d'erreur
          this.campaigns = [];
          this.filteredCampaigns = [];
        }
      });
  }

  loadCurrentMonthDonations(): void {
    this.isLoading = true;
    this.campagnesService.getDonsByMonth().subscribe({
      next: (response) => {
        if (response && response.total) {
          this.currentMonthDonationsAmount = response.total;
        } else {
          this.currentMonthDonationsAmount = 0;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des dons mensuels', error);
        this.currentMonthDonationsAmount = 0;
        this.isLoading = false;
      }
    });
  }

  // Méthode pour charger le montant collecté d'une campagne (modifiée pour utiliser le nom)
  loadCampaignAmount(campaignName: string): void {
    this.campagnesService.getCampaignCollectedAmount(campaignName)
      .subscribe({
        next: (response) => {
          if (response && response.montant_collecte !== undefined) {
            this.campaignAmounts[campaignName] = response.montant_collecte;

            // Mettre à jour les montants dans les objets campaign si nécessaire
            this.campaigns.forEach(campaign => {
              if (campaign.nom === campaignName) {
                campaign.montant = response.montant_collecte;
              }
            });

            // Mettre à jour la campagne sélectionnée si c'est celle-ci
            if (this.selectedCampaign && this.selectedCampaign.nom === campaignName) {
              this.selectedCampaign.montant = response.montant_collecte;
            }
          }
        },
        error: (error) => {
          console.error(`Erreur lors du chargement du montant pour la campagne "${campaignName}":`, error);
        }
      });
  }

  // Méthode pour récupérer le montant collecté d'une campagne (modifiée pour utiliser le nom)
  getCampaignAmount(campaignName: string): number {
    return this.campaignAmounts[campaignName] || 0;
  }

  // Appliquer les filtres
  applyFilters(): void {
    let filtered = [...this.campaigns];

    // Filtre par recherche
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(campaign =>
        campaign.nom.toLowerCase().includes(term)
      );
    }

    // Filtre par type
    if (this.typeFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.type === this.typeFilter);
    }

    // Filtre par statut
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.statut === this.statusFilter);
    }

    // Trier par statut : actives en premier, puis inactives, puis marketing
    const statusOrder: { [key: string]: number } = {
      'actif': 1,
      'inactif': 3,
      'marketing': 2
    };
    filtered.sort((a, b) => {
      return (statusOrder[a.statut] || 99) - (statusOrder[b.statut] || 99);
    });

    this.filteredCampaigns = filtered;
  }


  getActiveCampaignsCount(): number {
    return this.campaigns.filter(c => c.statut === 'actif').length;
  }

  getTotalCampaignsCount(): number {
    return this.campaigns.length;
  }

  getTotalDonationsAmount(): number {
    return this.campaigns.reduce((sum, campaign) => sum + campaign.montant, 0);
  }

  getCurrentMonthDonationsAmount(): number {
    return this.currentMonthDonationsAmount;
  }

  getOneTimeCampaignsCount(): number {
    return this.campaigns.filter(c => c.type === 'ponctuel').length;
  }

  getOneTimeDonationsAmount(): number {
    return this.campaigns
      .filter(c => c.type === 'ponctuel')
      .reduce((sum, campaign) => sum + campaign.montant, 0);
  }

  // Gestion du menu d'actions
  toggleActionMenu(campaignId: number): void {
    this.openActionMenuId = (this.openActionMenuId === campaignId) ? null : campaignId;
  }

  closeActionMenu(): void {
    this.openActionMenuId = null;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    // Fermer si le clic est à l'extérieur du bouton écrou ou du menu
    if (!target.closest('.gear-button') && !target.closest('.actions-menu')) {
      this.openActionMenuId = null;
    }
  }

  getMonthlyCampaignsCount(): number {
    return this.campaigns.filter(c => c.type === 'mensuel').length;
  }

  getMonthlyDonationsAmount(): number {
    return this.campaigns
      .filter(c => c.type === 'mensuel')
      .reduce((sum, campaign) => sum + campaign.montant, 0);
  }

  getCampaignTypeClass(type: string): string {
    switch (type) {
      case 'ponctuel':
        return 'bg-blue-100 text-blue-800';
      case 'mensuel':
        return 'bg-green-100 text-green-800';
      case 'challenge':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-purpule-100 text-purpule-800';
    }
  }

  getCampaignTypeIcon(type: string): string {
    switch (type) {
      case 'ponctuel':
        return 'gift';
      case 'mensuel':
        return 'repeat';
      case 'challenge':
        return 'trophy';
      default:
        return 'help-circle';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'actif':
        return 'bg-green-100 text-green-800';
      case 'inactif':
        return 'bg-gray-100 text-gray-800';
      case 'marketing':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusDotClass(status: string): string {
    switch (status) {
      case 'actif':
        return 'bg-green-500';
      case 'inactif':
        return 'bg-gray-400';
      case 'marketing':
        return 'bg-amber-500';
      default:
        return 'bg-gray-400';
    }
  }

  // Pagination
  getPaginationStart(): number {
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  getPaginationEnd(): number {
    const end = this.currentPage * this.itemsPerPage;
    return end > this.filteredCampaigns.length ? this.filteredCampaigns.length : end;
  }

  nextPage(): void {
    if (!this.isLastPage()) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  isLastPage(): boolean {
    return this.currentPage * this.itemsPerPage >= this.filteredCampaigns.length;
  }

  // Modals et opérations sur les campagnes
  openNewCampaignModal(): void {
    this.editingCampaign = null;
    this.campaignForm.reset({
      nom: '',
      type: 'ponctuel',
      objectif: 0,
      step1: 'libre',
      prix: 0
    });
    this.showCampaignModal = true;
  }

  closeCampaignModal(): void {
    this.showCampaignModal = false;
    this.editingCampaign = null;
  }

  updateExistingCampaign(campaign: Campaign): void {
    console.log('Édition de la campagne:', campaign);
    this.editingCampaign = campaign;
    this.campaignForm.patchValue({
      nom: campaign.nom,
      type: campaign.type,
      objectif: campaign.objectif,
      step1: campaign.step1 || 'libre',
      prix: campaign.prix || 0
    });
    this.showCampaignModal = true;
  }

  saveCampaign(): void {
    if (this.campaignForm.invalid) {
      return;
    }

    const campaignData = this.campaignForm.value;
    this.isLoading = true;

    // Mise à jour d'une campagne existante
    this.campagnesService.updateCampaign(
      this.editingCampaign?.id || 0,
      campaignData.nom,
      campaignData.objectif
    ).subscribe({
      next: (response) => {
        if (response && response.campaign) {
          // Mise à jour locale
          const index = this.campaigns.findIndex(c => c.id === this.editingCampaign!.id);
          if (index !== -1) {
            this.campaigns[index] = {
              ...this.campaigns[index],
              nom: response.campaign.nom,
              objectif: response.campaign.objectif
            };
            this.applyFilters();
          }
          this.showNotification('Campagne mise à jour avec succès');
          this.closeCampaignModal();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors de la mise à jour de la campagne:', error);
        this.showNotification('Erreur lors de la mise à jour de la campagne', 'error');
        this.isLoading = false;
      }
    });

  }


  createNewCampaign(): void {
    const campaignData = this.campaignForm.value;
    const newCampaignData = {
      nom: campaignData.nom,
      type: 'ponctuel',
      objectif: campaignData.objectif,
    };

    this.campagnesService.createCampaign(newCampaignData).subscribe({
      next: (response) => {
        if (response && response.campaign) {
          // Ajouter la nouvelle campagne à la liste locale
          const createdCampaign: Campaign = {
            id: response.campaign.id,
            nom: response.campaign.nom,
            type: response.campaign.type,
            objectif: response.campaign.objectif,
            montant: 0,
            statut: 'actif',
            prix: response.campaign.prix,
            donations: []
          };

          this.campaigns.push(createdCampaign);
          this.applyFilters();
          this.showNotification('Campagne créée avec succès');
          this.closeCampaignModal();
        } else {
          this.showNotification('La campagne a été créée mais les détails n\'ont pas été retournés', 'error');
          this.loadCampaigns(); // Recharger toutes les campagnes pour être sûr d'avoir les données à jour
          this.closeCampaignModal();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors de la création de la campagne:', error);
        this.showNotification('Erreur lors de la création de la campagne', 'error');
        this.isLoading = false;
      }
    });
  }

  // Méthode pour ouvrir la modal de confirmation de changement de statut
  toggleCampaignStatus(campaign: Campaign): void {
    this.campaignToToggle = { ...campaign };
    this.showStatusConfirmModal = true;
  }

  // Méthode pour fermer la modal de confirmation
  closeStatusConfirmModal(): void {
    this.showStatusConfirmModal = false;
    this.campaignToToggle = null;
  }

  // Méthode pour confirmer le changement de statut
  confirmStatusChange(): void {
    if (!this.campaignToToggle) return;

    const campaignId = this.campaignToToggle.id;
    const newStatus = this.campaignToToggle.statut === 'actif' ? 'inactif' : 'actif';

    this.isLoading = true;

    this.campagnesService.updateCampaignStatus(campaignId, newStatus)
      .subscribe({
        next: (response) => {
          // Mise à jour locale de la campagne dans le tableau
          const index = this.campaigns.findIndex(c => c.id === campaignId);
          if (index !== -1) {
            this.campaigns[index].statut = newStatus;

            // Si la campagne est sélectionnée, mettre à jour aussi
            if (this.selectedCampaign?.id === campaignId) {
              this.selectedCampaign.statut = newStatus;
            }

            // Réappliquer les filtres pour mettre à jour l'affichage
            this.applyFilters();
          }

          // Afficher une notification de succès
          this.showNotification(
            `La campagne ${this.campaignToToggle!.nom} a été ${newStatus === 'actif' ? 'activée' : 'désactivée'} avec succès.`,
            'success'
          );

          // Fermer la modal
          this.closeStatusConfirmModal();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors du changement de statut:', error);
          this.showNotification(
            `Erreur lors de la ${newStatus === 'actif' ? 'l\'activation' : 'la désactivation'} de la campagne.`,
            'error'
          );
          this.closeStatusConfirmModal();
          this.isLoading = false;
        }
      });
  }

  showCampaignDetails(campaign: Campaign): void {
    this.selectedCampaign = { ...campaign };
  }

  closeDetailsModal(): void {
    this.selectedCampaign = null;
  }

  // Statistiques pour une campagne spécifique
  getCampaignDonationCount(campaign: Campaign): number {
    return (campaign.donations || []).length;
  }

  getAverageDonation(campaign: Campaign): number {
    const donations = campaign.donations || [];
    if (donations.length === 0) return 0;

    const total = donations.reduce((sum, donation) => sum + donation.montant, 0);
    return total / donations.length;
  }

  getLastDonationDate(campaign: Campaign): Date | null {
    const donations = campaign.donations || [];
    if (donations.length === 0) return null;

    const dates = donations.map(d => new Date(d.date));
    return new Date(Math.max(...dates.map(d => d.getTime())));
  }



  exportCampaignData(campaign: Campaign): void {
    this.isLoading = true;

    // Appel au backend pour récupérer les données complètes des dons
    this.campagnesService.getCampaignDonations(campaign.nom).subscribe({
      next: (response) => {
        if (response && response.donations) {
          // Vérifier si on est dans le contexte de l'association "La Ruée Vers l'Eau"
          const isLaRueeVersLEau = response.asso === 'la-ruee-vers-l-eau';

          // En-têtes des colonnes - ajout conditionnel de colonnes pour La Ruée Vers l'Eau
          let headers = ['Date', 'Nom', 'Prénom', 'Email', 'Montant', 'Reçu fiscal', 'ID Client Stripe'];

          // Ajouter les colonnes spécifiques pour La Ruée Vers l'Eau
          if (isLaRueeVersLEau) {
            headers.push('Nom Arbres', 'Téléphone');
          }

          let csvContent = headers.join(',') + '\n';

          // Ajouter les lignes de données
          response.donations.forEach((don: any) => {
            const row = [
              don.ajout ? new Date(don.ajout).toLocaleDateString('fr-FR') : '',
              don.nom ? `"${don.nom.replace(/"/g, '""')}"` : '',
              don.prenom ? `"${don.prenom.replace(/"/g, '""')}"` : '',
              don.email ? `"${don.email.replace(/"/g, '""')}"` : '',
              don.montant || 0,
              don.lien_recu ? `"${don.lien_recu.replace(/"/g, '""')}"` : 'Non disponible',
              don.stripe_cus_id ? `"${don.stripe_cus_id.replace(/"/g, '""')}"` : '',
            ];

            // Ajouter les données spécifiques pour La Ruée Vers l'Eau
            if (isLaRueeVersLEau) {
              row.push(
                don.nom_arbres ? `"${don.nom_arbres.replace(/"/g, '""')}"` : '',
                don.telephone ? `"${don.telephone.replace(/"/g, '""')}"` : ''
              );
            }

            csvContent += row.join(',') + '\n';
          });

          // Créer le Blob et déclencher le téléchargement
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `campagne-${campaign.id}-${campaign.nom.replace(/\s+/g, '-').toLowerCase()}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          this.showNotification('Données exportées avec succès au format CSV');
          this.isLoading = false;
        } else {
          this.showNotification('Aucune donnée disponible pour l\'export', 'error');
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Erreur lors de l\'export des données:', error);
        this.showNotification('Erreur lors de l\'export des données', 'error');
        this.isLoading = false;
      }
    });
  }

  // Charger l'URI de l'association
  loadAssoUri(): void {
    this.backofficeAuthService.getAssoData().subscribe({
      next: (asso) => {
        if (asso && asso.uri) {
          this.assoUri = asso.uri;
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement de l\'URI de l\'association:', error);
      }
    });
  }

  // Copier l'URL de la campagne dans le presse-papier
  copyCampaignUrl(campaign: Campaign): void {
    if (!this.assoUri) {
      this.showNotification('URI de l\'association non disponible', 'error');
      return;
    }

    // Construire l'URL v1 : https://www.myamana.fr/ponctuel/{uri_asso}?campagne={nom_campagne}
    const url = `https://www.myamana.fr/ponctuel/${this.assoUri}?campagne=${encodeURIComponent(campaign.nom)}`;
    // URL v2 (commentée pour l'instant) : https://v2.myamana.fr/app/donation/one-time-donation/{uri_asso}/campagne/{nom_campagne}
    // const url = `https://v2.myamana.fr/app/donation/one-time-donation/${this.assoUri}/campagne/${encodeURIComponent(campaign.nom)}`;

    // Copier dans le presse-papier
    navigator.clipboard.writeText(url).then(() => {
      this.showNotification('URL copiée dans le presse-papier !', 'success');
      this.closeActionMenu();
    }).catch(err => {
      console.error('Erreur lors de la copie:', err);
      this.showNotification('Erreur lors de la copie de l\'URL', 'error');
    });
  }

  // Générer et afficher le QR code
  async generateQRCode(campaign: Campaign): Promise<void> {
    if (!this.assoUri) {
      this.showNotification('URI de l\'association non disponible', 'error');
      return;
    }

    // URL v1 : https://www.myamana.fr/ponctuel/{uri_asso}?campagne={nom_campagne}
    const url = `https://www.myamana.fr/ponctuel/${this.assoUri}?campagne=${encodeURIComponent(campaign.nom)}`;
    // URL v2 (commentée pour l'instant) : https://v2.myamana.fr/app/donation/one-time-donation/{uri_asso}/campagne/{nom_campagne}
    // const url = `https://v2.myamana.fr/app/donation/one-time-donation/${this.assoUri}/campagne/${encodeURIComponent(campaign.nom)}`;

    try {
      // Générer le QR code avec une meilleure qualité
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      this.qrCodeDataUrl = qrDataUrl;
      this.selectedCampaignForQR = campaign;
      this.showQRCodeModal = true;
      this.closeActionMenu();
    } catch (error) {
      console.error('Erreur lors de la génération du QR code:', error);
      this.showNotification('Erreur lors de la génération du QR code', 'error');
    }
  }

  // Télécharger le QR code
  downloadQRCode(): void {
    if (!this.qrCodeDataUrl || !this.selectedCampaignForQR) return;

    const link = document.createElement('a');
    link.href = this.qrCodeDataUrl;
    link.download = `qrcode-${this.selectedCampaignForQR.nom.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.click();
    this.showNotification('QR Code téléchargé avec succès !', 'success');
  }

  // Fermer la modal de QR code
  closeQRCodeModal(): void {
    this.showQRCodeModal = false;
    this.qrCodeDataUrl = '';
    this.selectedCampaignForQR = null;
  }

  // Système de notification
  showNotification(message: string, type: 'success' | 'error' = 'success'): void {
    // Effacer le timeout précédent si existant
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }

    this.notification = message;
    this.notificationType = type;

    // Disparaître après 3 secondes
    this.notificationTimeout = setTimeout(() => {
      this.notification = null;
    }, 3000);
  }
}