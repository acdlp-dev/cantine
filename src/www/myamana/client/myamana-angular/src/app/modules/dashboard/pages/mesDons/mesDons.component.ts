import { Component, OnInit } from '@angular/core';
import { NftSingleCardComponent } from '../../components/nft/nft-single-card/nft-single-card.component';
import { NftAuctionsTableComponent } from '../../components/nft/nft-auctions-table/nft-auctions-table.component';
import { DonsService } from '../../services/dons.service';
import { AuthService } from 'src/app/modules/auth/services/auth.service';
import { NgFor, NgIf, NgClass } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AddressUpdateDialogComponent } from 'src/app/shared/components/address-update-dialog/address-update-dialog.component';
import { AssociationService } from 'src/app/modules/donation/services/association.service';
import { Observable, of } from 'rxjs';
import { 
  faCcVisa, 
  faCcAmex,
  faCcPaypal
} from '@fortawesome/free-brands-svg-icons';
import { 
  faUniversity, 
  faCreditCard, 
  faMoneyBillWave,
  faMoneyCheck,
  faFileInvoice,
  faFileDownload
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-mes-dons',
  templateUrl: './mesDons.component.html',
  standalone: true,
  imports: [
    NftSingleCardComponent,
    NftAuctionsTableComponent,
    NgFor,
    NgIf,
    NgClass,
    FontAwesomeModule,
    AddressUpdateDialogComponent
  ],
})
export class MesDonsComponent implements OnInit {
  donsPonctuels: any[] = []; // Contiendra les dons ponctuels
  private userEmail: string = ''; // Email de l'utilisateur
  isLoading: boolean = true; // État de chargement
  loadError: boolean = false; // État d'erreur de chargement

  // Icônes pour les moyens de paiement
  faVisa = faCcVisa;
  faAmex = faCcAmex;
  faPaypal = faCcPaypal;
  faIban = faUniversity;
  faCard = faCreditCard;
  faCash = faMoneyBillWave;
  faCheck = faMoneyCheck;
  faTransfer = faUniversity;
  faFileInvoice = faFileInvoice;
  faFileDownload = faFileDownload;

  // Informations sur les associations
  assoInfos: { [key: string]: any } = {};
  
  // Suivi des appels en cours pour éviter les doublons
  private pendingAssoRequests: { [key: string]: Observable<any> } = {};
  
  // Contrôle de l'affichage du dialogue de mise à jour d'adresse
  showAddressDialog = false;
  
  // Don en cours de traitement pour le reçu fiscal
  currentDon: any = null;

  // Suivi des dons en cours de génération de reçu fiscal
  generatingReceiptFor: { [key: string]: boolean } = {};

  constructor(
    private donsService: DonsService, 
    private authService: AuthService,
    private http: HttpClient,
    private associationService: AssociationService
  ) { }

  // Gestion des erreurs de chargement d'image
  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = 'assets/images/asso/demo.png';
    }
  }

  // Récupérer les informations sur une association
  getAssoInfo(asso: string): void {
    // Vérifier si les informations sont déjà disponibles
    if (this.assoInfos[asso]) {
      return;
    }

    // Vérifier si un appel est déjà en cours pour cette association
    if (this.pendingAssoRequests[asso]) {
      return;
    }

    console.log(`🔄 Récupération des infos pour l'association: ${asso}`);
    
    // Marquer l'appel comme en cours et utiliser le service AssociationService
    this.pendingAssoRequests[asso] = this.associationService.getAssociationConfig(asso);
    
    this.pendingAssoRequests[asso].subscribe({
      next: (response) => {
        this.assoInfos[asso] = response;
        console.log(`✅ Infos asso ${asso} récupérées:`, response);
        
        // Nettoyer la requête en cours
        delete this.pendingAssoRequests[asso];
      },
      error: (err) => {
        console.error(`❌ Erreur lors de la récupération des infos de l'asso ${asso}:`, err);
        this.assoInfos[asso] = { recu_asso: false }; // Valeur par défaut
        
        // Nettoyer la requête en cours même en cas d'erreur
        delete this.pendingAssoRequests[asso];
      }
    });
  }

  // Vérifier si l'association délivre des reçus fiscaux
  assoDeliversReceipt(asso: string): boolean {
    return this.assoInfos[asso]?.recu_asso === 'true' || this.assoInfos[asso]?.recu_asso === true;
  }

  // Générer un reçu fiscal
  generateReceipt(don: any): void {
    // Vérifier si les champs d'adresse sont vides
    if (!don.adresse || !don.ville || !don.codePostal) {
      // Stocker le don en cours pour le traitement ultérieur
      this.currentDon = don;
      // Afficher le dialogue de mise à jour d'adresse
      this.showAddressDialog = true;
      return;
    }
    
    // Si tous les champs sont remplis, procéder à la génération du reçu fiscal
    this.processReceiptGeneration(don);
  }
  
  // Traiter la génération du reçu fiscal avec les données complètes
  private processReceiptGeneration(don: any): void {
    // Marquer ce don comme étant en cours de génération
    this.generatingReceiptFor[don.id] = true;

    // Préparer les données pour la génération du reçu fiscal
    const data = {
      asso: don.asso.toLowerCase().replace(/ /g, '-'), // Convertir en format URI
      prenom: don.firstName || '',
      nom: don.lastName || '',
      adresse: don.adresse || '',
      ville: don.ville || '',
      codePostal: don.codePostal || '',
      montant: don.montant,
      date: don.date,
      moyen: don.moyen,
      id_don: don.id,
      type: don.type,
      dateT: don.dateT
    };

    // Appeler l'API pour générer le reçu fiscal
    this.http.post<any>(`${environment.apiUrl}/generateRecuFiscal`, data, {
      withCredentials: true
    }).subscribe({
      next: (response) => {
        console.log('Reçu fiscal généré avec succès:', response);
        // Construire directement l'URL pour télécharger le reçu fiscal
        don.link = `${environment.apiUrl}/getRecuFiscal/${don.id}`;

        // Réussite: arrêter l'indicateur de chargement
        this.generatingReceiptFor[don.id] = false;
      },
      error: (err) => {
        console.error('Erreur lors de la génération du reçu fiscal:', err);
        // Afficher un message d'erreur à l'utilisateur
        alert('Erreur lors de la génération du reçu fiscal. Veuillez réessayer plus tard.');

        // Erreur: arrêter l'indicateur de chargement
        this.generatingReceiptFor[don.id] = false;
      }
    });
  }
  
  // Gérer la confirmation du dialogue de mise à jour d'adresse
  onAddressConfirm(addressData: {adresse: string, ville: string, codePostal: string}): void {
    if (this.currentDon) {
      // Mettre à jour les informations d'adresse du don
      this.currentDon.adresse = addressData.adresse;
      this.currentDon.ville = addressData.ville;
      this.currentDon.codePostal = addressData.codePostal;
      
      // Fermer le dialogue
      this.showAddressDialog = false;
      
      // Procéder à la génération du reçu fiscal avec les informations mises à jour
      this.processReceiptGeneration(this.currentDon);
    }
  }
  
  // Gérer l'annulation du dialogue de mise à jour d'adresse
  onAddressCancel(): void {
    this.showAddressDialog = false;
    this.currentDon = null;
  }

  // Obtenir l'URL du reçu fiscal à partir de l'ID du don
  getRecuFiscalUrl(don: any): string {
    return `${environment.apiUrl}/getRecuFiscal/${don.id}`;
  }

  // Ouvrir le reçu fiscal dans un nouvel onglet
  openReceipt(don: any): void {
    window.open(this.getRecuFiscalUrl(don), '_blank');
  }

  // Vérifier si le bouton de reçu fiscal doit être désactivé
  shouldDisableReceiptButton(don: any): boolean {
    // Comparaison insensible à la casse
    const moyenLower = don.moyen?.toLowerCase();
    return moyenLower === 'chèque' || moyenLower === 'cheque' || moyenLower === 'virement';
  }

  // Obtenir le message pour un bouton désactivé
  getDisabledReceiptMessage(): string {
    return 'Pour ce don, l\'association doit vérifier la bonne réception du montant, merci de les contacter pour votre reçu fiscal.';
  }
  
  ngOnInit(): void {
    this.authService.getUserData().subscribe({
      next: (response: any) => {
        this.userEmail = response.email; // Stocke l'email récupéré
        this.loadDons(); // Charge tous les dons et les filtre
      },
      error: (err: any) => {
        console.error('Nous ne trouvons pas l email:', err);
      },
    });
  }

  loadDons(): void {
    // Définir l'état de chargement à vrai
    this.isLoading = true;
    this.loadError = false;

    // Utilisation de la méthode getDonsByEmail du service
    this.donsService.getDonsByEmail(this.userEmail).subscribe(
      (response: any) => {
        console.log('API Response Dons:', response.results);

        // Collecter toutes les associations uniques
        const uniqueAssos = [...new Set(response.results.map((item: any) => item.asso).filter(Boolean))] as string[];

        // Récupérer les informations pour chaque association unique (une seule fois)
        uniqueAssos.forEach((asso: string) => {
          this.getAssoInfo(asso);
        });

        // Traitement commun pour tous les dons
        const allDons = response.results.map((item: any) => {
          const assoName = item.asso
            ? item.asso.replace(/-/g, ' ').replace(/\b\w/g, (match: string) => match.toUpperCase())
            : 'Association inconnue';

          // Construire l'URL du reçu fiscal si un lien existe
          let link = '';
          if (item.lien_recu) {
            // Si le lien est déjà une URL complète, l'utiliser tel quel
            // Sinon, construire l'URL basée sur l'ID du don
            if (item.lien_recu.startsWith('http')) {
              link = item.lien_recu;
            } else {
              link = `${environment.apiUrl}/getRecuFiscal/${item.id}`;
            }
          }

          return {
            id: item.id,
            asso: assoName,
            assoUri: item.asso,
            montant: item.montant,
            date: new Date(item.ajout).toLocaleDateString('fr-FR'),
            image: `assets/images/asso/${item.asso ? item.asso.toLowerCase() : 'demo'}.png`,
            type: item.type || 'ponctuel', // Valeur par défaut si le type n'est pas défini
            moyen: item.moyen || 'CB', // Moyen de paiement (CB, IBAN, paypal, Virement, Chèque, Espèce)
            link: link, // Lien vers le reçu fiscal
            firstName: item.prenom,
            lastName: item.nom,
            adresse: item.adresse,
            ville: item.ville,
            codePostal: item.code_postal,
            brand: item.brand,
            last4: item.last4,
            dateT:item.ajout
          };
        });

        // Filtrer les dons par type
        this.donsPonctuels = allDons;

        // Désactiver l'état de chargement une fois les données reçues
        this.isLoading = false;

        console.log('Dons Ponctuels:', this.donsPonctuels);
      },
      (error: any) => {
        console.error('Erreur lors du chargement des Dons:', error);
        // Désactiver l'état de chargement et marquer l'erreur
        this.isLoading = false;
        this.loadError = true;
      }
    );
  }
}
