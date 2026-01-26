import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { CommandesResponse, CommandeServices } from '../commande/services/commande.services';
import { LucideIconsModule } from '../../../../shared/modules/lucide-icons.module';
import { CantineService } from '../../services/cantine.service';

@Component({
  selector: 'app-commande',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, LucideIconsModule],
  templateUrl: './commande.component.html'
})
export class CommandeComponent implements OnInit {
  // Google Places var
  declareGoogle: any;
  // Propriétés du formulaire
  dateCommande = '';
  quantitePlats: number | null = null;

  // Multi-adresses: tableau d'adresses
  addresses: Array<{
    line1: string;
    postal_code: string;
    city: string;
    country: string;
  }> = [
    { line1: '', postal_code: '', city: '', country: 'France' }
  ];

  // Propriétés pour la gestion des repas disponibles
  repasDisponibles: number | null = null;
  dateMinimum = '';

  // États du formulaire
  isSubmitting = false;
  submitMessage = '';
  submitError = '';
  errorMessage = '';

  // États pour la modale
  showModal = false;
  modalSuccess = false;
  modalTitle = '';
  modalMessage = '';

  // Blocking banner state
  showInfosBlockingBanner = false;
  missingCantineFields: string[] = [];


  constructor(
    public router: Router,
    private commandeService: CommandeServices,
    private http: HttpClient,
    private cantineService: CantineService
  ) { }

  ngAfterViewInit(): void {
    // Auto-completion sera initialisée par chaque input via #addressInput et la directive dans le template
  }

  // Initialise l'autocomplétion Google Places pour un input spécifique et un index donné
  initGooglePlacesForInput(inputElement: EventTarget | null, index: number): void {
    if (!inputElement || !(inputElement instanceof HTMLInputElement)) return;
    try {
      const googleAny: any = (window as any).google;
      if (typeof googleAny !== 'undefined' && inputElement) {
        const autocomplete = new googleAny.maps.places.Autocomplete(
          inputElement,
          {
            fields: ['address_components', 'formatted_address'],
            types: ['address']
          }
        );

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place && place.address_components) {
            let streetNumber = '';
            let street = '';
            let city = '';
            let postalCode = '';
            let country = '';

            for (const component of place.address_components) {
              const componentType = component.types[0];

              switch (componentType) {
                case 'street_number':
                  streetNumber = component.long_name;
                  break;
                case 'route':
                  street = component.long_name;
                  break;
                case 'locality':
                  city = component.long_name;
                  break;
                case 'postal_code':
                  postalCode = component.long_name;
                  break;
                case 'country':
                  country = component.long_name;
                  break;
              }
            }

            const addressLine1 = streetNumber && street ? `${streetNumber} ${street}` : street;

            // Mettre à jour l'adresse à l'index donné
            this.addresses[index].line1 = addressLine1;
            this.addresses[index].postal_code = postalCode;
            this.addresses[index].city = city;
            this.addresses[index].country = country || 'France';
          }
        });
      }
    } catch (err) {
      console.error('Google Places API non disponible pour autocomplete', err);
    }
  }

  // Ajouter une nouvelle adresse
  addAddress(): void {
    this.addresses.push({
      line1: '',
      postal_code: '',
      city: '',
      country: 'France'
    });
  }

  // Supprimer une adresse (sauf s'il n'en reste qu'une)
  removeAddress(index: number): void {
    if (this.addresses.length > 1) {
      this.addresses.splice(index, 1);
    }
  }

  ngOnInit(): void {
    // Initialiser la date minimum (aujourd'hui + 3 jours)
    this.setDateMinimum();
    // Check cantine infos before enabling page
    this.cantineService.checkCanteInfosCompleted().subscribe({
      next: (res) => {
        if (!res?.isComplete) {
          this.showInfosBlockingBanner = true;
          this.missingCantineFields = res?.missingFields || [];
        }
      },
      error: () => {
        this.showInfosBlockingBanner = true;
        this.missingCantineFields = [];
      }
    });
  }

  goToInfos(): void {
    this.router.navigate(['/backoffice/infos']);
  }

  /**
   * Définit la date minimum pour les commandes (aujourd'hui + 3 jours)
   */
  private setDateMinimum(): void {
    const today = new Date();
    today.setDate(today.getDate() + 3); // Ajouter 3 jours
    this.dateMinimum = today.toISOString().split('T')[0];
  }

  /**
   * Méthode appelée quand la date de commande change
   */
  onDateChange(): void {

    if (this.dateCommande && this.dateCommande.trim() !== '') {
      this.nombreRepasDisponibles(this.dateCommande);
    } else {
      this.repasDisponibles = null;
    }
  }

  /**
   * Simule la récupération du nombre de repas disponibles
   * Dans un vrai projet, cela ferait un appel au service cantine
   */
  private nombreRepasDisponibles(date: string): void {
    this.commandeService.getQuantiteCantine(date).subscribe({
      next: (response: CommandesResponse) => {
        this.repasDisponibles = response.total;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des quantités de repas', err);
        this.errorMessage = 'Impossible de charger la quantité de repas. Veuillez réessayer plus tard.';
      }
    });
  }

  /**
   * Validation du formulaire
   */
  private isFormValid(): boolean {
    // Au moins une adresse doit avoir line1 rempli
    const hasValidAddress = this.addresses.some(addr => addr.line1 && addr.line1.trim().length > 0);
    
    return !!(
      this.dateCommande &&
      this.quantitePlats &&
      this.quantitePlats > 0 &&
      this.quantitePlats <= (this.repasDisponibles || 0) &&
      hasValidAddress &&
      this.repasDisponibles !== 0
    );
  }

  /**
   * Soumission du formulaire
   */
  onSubmit(): void {
    if (this.isFormValid() && !this.isSubmitting) {
      this.isSubmitting = true;
      this.submitMessage = '';
      this.submitError = '';

      // Concaténer toutes les adresses: "addr1, addr2, addr3"
      // Format: "line1 postal_code city country"
      const zoneDistribution = this.addresses
        .filter(addr => addr.line1 && addr.line1.trim().length > 0)
        .map(addr => [addr.line1, addr.postal_code, addr.city, addr.country].filter(Boolean).join(' '))
        .join(', ');

      this.commandeService.addCommandeCantine(this.dateCommande, this.quantitePlats!, zoneDistribution).subscribe({
        next: (response: any) => {
          this.isSubmitting = false;

          // Succès - Afficher la modale de succès
          this.modalSuccess = true;
          this.modalTitle = 'Commande validée !';
          this.modalMessage = `Votre commande de ${this.quantitePlats} repas pour le ${this.formatDate(this.dateCommande)} a été enregistrée avec succès !<br><br>📧 Un email de confirmation vous sera envoyé sous peu.`;
          this.showModal = true;

          // Actualiser le nombre de repas disponibles
          this.nombreRepasDisponibles(this.dateCommande);
        },
        error: (err) => {
          this.isSubmitting = false;

          // Erreur - Afficher la modale d'erreur
          this.modalSuccess = false;
          this.modalTitle = '❌ Erreur lors de la commande';
          this.modalMessage = `Une erreur s'est produite lors de l'enregistrement de votre commande.<br><br>Veuillez réessayer plus tard ou contacter le support si le problème persiste.`;
          this.showModal = true;

          console.error('Erreur lors de l\'ajout de la commande:', err);
        }
      });

    } else {
      this.submitError = 'Le nombre de repas doit être au moins de 1 et ne pas dépasser le nombre de repas disponibles';
    }
  }

  /**
   * Formate une date au format français
   */
  private formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  }

  /**************************************************************************
   * Recherche de la ville à partir du code postal (optionnel)
   * Similaire à `don-hors-ligne` : appelle l'API geo.api.gouv.fr
   **************************************************************************/
  onPostalCodeChange(index: number): void {
    const code = (this.addresses[index].postal_code || '').trim();
    if (code.length < 5) return;
    this.fetchCityFromPostalCode(code, index);
  }

  private fetchCityFromPostalCode(postalCode: string, index: number): void {
    if (!postalCode || postalCode.length < 5) return;
    this.http.get(`https://geo.api.gouv.fr/communes?codePostal=${postalCode}&fields=nom&format=json`)
      .subscribe({
        next: (data: any) => {
          if (data && data.length > 0) {
            this.addresses[index].city = data[0].nom;
          }
        },
        error: (err) => {
          console.error('Erreur lors de la récupération de la ville', err);
        }
      });
  }

  /**
   * Annule le formulaire et redirige
   */
  onCancel(): void {
    this.router.navigate(['/cantine/commandes']);
  }

  /**
   * Ferme la modale
   */
  closeModal(): void {
    this.showModal = false;

    // Si c'est un succès, rediriger vers la liste des commandes ou réinitialiser le formulaire
    if (this.modalSuccess) {
      // Option 1: Redirection
      // this.router.navigate(['/cantine/commandes']);

      // Option 2: Réinitialiser le formulaire
      this.resetForm();
    }
  }

  /**
   * Réinitialise le formulaire
   */
  private resetForm(): void {
    this.dateCommande = '';
    this.quantitePlats = null;
    // Reset addresses to one empty address
    this.addresses = [{ line1: '', postal_code: '', city: '', country: 'France' }];
    this.repasDisponibles = null;
    this.submitError = '';
  }
}
