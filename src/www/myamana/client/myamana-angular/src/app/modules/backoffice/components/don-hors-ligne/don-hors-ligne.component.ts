import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';

declare var google: any;

@Component({
  selector: 'app-don-hors-ligne',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './don-hors-ligne.component.html',
  styleUrls: ['./don-hors-ligne.component.scss']
})


export class DonHorsLigneComponent implements OnInit, AfterViewInit {
  @ViewChild('addressInput') addressInput!: ElementRef;

  donForm!: FormGroup;
  submitted = false;
  loading = false;
  success = false;
  error = '';
  fetchingCity = false;
  fetchingCompany = false;

  // Timer pour l'auto-disparition des notifications
  private notificationTimer: any;

  // Options pour le type de don
  typesDon = [
    { value: 'especes', label: 'Espèces' },
    { value: 'carte', label: 'Carte Bancaire' },
    { value: 'virement', label: 'Virement' },
    { value: 'cheque', label: 'Chèque' },
    { value: 'paypal', label: 'PayPal' }
  ];

  campagnes: any[] = [];
  loadingCampagnes = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.setupPostalCodeListener();
    this.setupSirenListener();
    this.loadCampagnes();
  }

  ngAfterViewInit(): void {
    this.initGooglePlacesAutocomplete();
  }

  initForm(): void {
    this.donForm = this.fb.group({
      moyen: ['', [Validators.required]],
      dateDon: [new Date().toISOString().split('T')[0], [Validators.required]],
      prenom: ['', [Validators.required]],
      nom: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      campagne: ['', [Validators.required]],
      amount: ['', [Validators.required, Validators.min(1)]],
      raison: [''],
      telephone: [''],
      siren: [''],
      address: [''],
      line1: [''],
      postal_code: [''],
      city: [''],
      country: [''],
      addToDatabase: [true] // Par défaut à true
    });
  }

  loadCampagnes(): void {
    this.loadingCampagnes = true;
    this.http.get(`${environment.apiUrl}/getcampagnes`, { withCredentials: true }).subscribe({
      next: (data: any) => {
        this.loadingCampagnes = false;
        if (data && data.results && Array.isArray(data.results)) {
          // Filtrer les campagnes actives et les transformer au format attendu
          this.campagnes = data.results
            .filter((campagne: any) => campagne.statut === 'actif')
            .map((campagne: any) => ({
              value: campagne.nom,
              label: campagne.nom
            }));

          // Si des campagnes sont disponibles, sélectionner la première par défaut
          if (this.campagnes.length > 0) {
            this.donForm.get('campagne')?.setValue(this.campagnes[0].value);
          }
        } else {
          console.error('Format de réponse inattendu pour les campagnes:', data);
        }
      },
      error: (err) => {
        this.loadingCampagnes = false;
        console.error('Erreur lors du chargement des campagnes:', err);
      }
    });
  }

  setupPostalCodeListener(): void {
    // Surveiller les changements dans le champ code postal
    this.donForm.get('postal_code')?.valueChanges
      .pipe(
        debounceTime(500), // Attendre que l'utilisateur ait terminé de taper
        distinctUntilChanged(), // Ne réagir que si la valeur a changé
        filter(value => value && value.length >= 5) // Ne réagir que si le code postal a au moins 5 caractères
      )
      .subscribe(postalCode => {
        this.fetchCityFromPostalCode(postalCode);
      });
  }

  setupSirenListener(): void {
    // Surveiller les changements dans le champ SIREN
    this.donForm.get('siren')?.valueChanges
      .pipe(
        debounceTime(800), // Attendre que l'utilisateur ait terminé de taper
        distinctUntilChanged(), // Ne réagir que si la valeur a changé
        filter(value => value && value.length === 9) // Ne réagir que si le SIREN a exactement 9 caractères
      )
      .subscribe(siren => {
        this.fetchCompanyFromSiren(siren);
      });
  }

  initGooglePlacesAutocomplete(): void {
    if (typeof google !== 'undefined' && this.addressInput) {
      const autocomplete = new google.maps.places.Autocomplete(
        this.addressInput.nativeElement,
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

          // Mettre à jour les valeurs du formulaire
          this.donForm.patchValue({
            address: place.formatted_address || addressLine1,
            line1: addressLine1,
            postal_code: postalCode,
            city: city,
            country: country
          });
        }
      });
    } else {
      console.error('Google Places API n\'est pas disponible');
    }
  }

  fetchCityFromPostalCode(postalCode: string): void {
    if (postalCode.length < 5) return;

    this.fetchingCity = true;
    // Utiliser l'API du gouvernement pour récupérer les informations sur les communes
    this.http.get(`https://geo.api.gouv.fr/communes?codePostal=${postalCode}&fields=nom&format=json`)
      .subscribe({
        next: (data: any) => {
          this.fetchingCity = false;
          if (data && data.length > 0) {
            // S'il y a plusieurs communes pour ce code postal, prendre la première
            const cityName = data[0].nom;
            this.donForm.get('city')?.setValue(cityName);
          }
        },
        error: (err) => {
          this.fetchingCity = false;
          console.error('Erreur lors de la récupération de la ville', err);
        }
      });
  }

  fetchCompanyFromSiren(siren: string): void {
    if (siren.length !== 9) return;

    this.fetchingCompany = true;
    // Utilise la route API qui appelle getLegalName pour récupérer le nom légal de l'entreprise
    this.http.get(`${environment.apiUrl}/api/sirene/${siren}`, { withCredentials: true })
      .subscribe({
        next: (data: any) => {
          this.fetchingCompany = false;
          if (data && data.success && data.denomination) {
            // Récupérer la raison sociale/dénomination
            this.donForm.get('raison')?.setValue(data.denomination);
          }
        },
        error: (err) => {
          this.fetchingCompany = false;
          console.error('Erreur lors de la récupération des informations de l\'entreprise', err);
        }
      });
  }

  onSubmit(): void {
    this.submitted = true;

    // Vérifier spécifiquement si l'adresse est remplie
    if (!this.donForm.get('line1')?.value) {
      this.showError('Veuillez saisir une adresse complète');
      return;
    }

    if (this.donForm.invalid) {
      // Afficher les erreurs spécifiques des contrôles
      Object.keys(this.donForm.controls).forEach(key => {
        const control = this.donForm.get(key);
      });
      this.showError('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    this.loading = true;
    this.clearNotifications();

    const currentAsso = this.donForm.get('currentAsso')?.value || 'au-coeur-de-la-precarite';

    // Construction des données pour l'API selon la structure de notre route
    const donData = {
      asso: currentAsso,
      tracking: 'backoffice',
      nom: this.donForm.get('nom')?.value,
      prenom: this.donForm.get('prenom')?.value,
      montant: this.donForm.get('amount')?.value,
      adresse: this.donForm.get('line1')?.value,
      code_postal: this.donForm.get('postal_code')?.value,
      ville: this.donForm.get('city')?.value,
      pays: this.donForm.get('country')?.value || 'France',
      email: this.donForm.get('email')?.value,
      campagne: this.donForm.get('campagne')?.value,
      moyen: this.donForm.get('moyen')?.value,
      dateDon: this.donForm.get('dateDon')?.value,
      siren: this.donForm.get('siren')?.value || '',
      raison: this.donForm.get('raison')?.value || '',
      tel: this.donForm.get('telephone')?.value || ''
    };

    // Vérifier si on doit ajouter en base de données
    if (!this.donForm.get('addToDatabase')?.value) {
      // Si non, simplement afficher un message de succès sans appel API
      this.loading = false;
      this.showSuccess();
      this.submitted = false;
      this.resetForm();
      return;
    }

    // Envoi à l'API
    this.http.post(`${environment.apiUrl}/createHl`, donData, { withCredentials: true })
      .subscribe({
        next: (response: any) => {
          this.loading = false;
          if (response.erreurCode === 'false') {
            this.showSuccess();
            this.submitted = false;
            this.resetForm();
          } else {
            this.showError('Erreur lors de l\'enregistrement du don: ' + (response.message || 'Erreur inconnue'));
          }
        },
        error: (err) => {
          this.loading = false;
          this.showError('Erreur lors de l\'enregistrement du don hors ligne');
          console.error('Erreur lors de l\'enregistrement du don hors ligne', err);
        }
      });
  }

  // Méthodes pour gérer les notifications avec auto-disparition
  private showSuccess(): void {
    this.clearNotifications();
    this.success = true;
    this.autoHideNotification();
  }

  private showError(message: string): void {
    this.clearNotifications();
    this.error = message;
    this.autoHideNotification();
  }

  private clearNotifications(): void {
    this.success = false;
    this.error = '';
    if (this.notificationTimer) {
      clearTimeout(this.notificationTimer);
    }
  }

  private autoHideNotification(): void {
    this.notificationTimer = setTimeout(() => {
      this.success = false;
      this.error = '';
    }, 5000); // Disparaît après 5 secondes
  }

  private resetForm(): void {
    // Réinitialiser le formulaire mais garder certaines valeurs
    const currentAddToDatabase = this.donForm.get('addToDatabase')?.value;
    const currentCampagne = this.donForm.get('campagne')?.value;
    const currentAsso = this.donForm.get('currentAsso')?.value;

    this.donForm.reset({
      addToDatabase: currentAddToDatabase,
      dateDon: new Date().toISOString().split('T')[0],
      country: 'France',
      currentAsso: currentAsso,
      campagne: currentCampagne
    });
  }

  // Méthodes pour fermer manuellement les notifications
  closeSuccessNotification(): void {
    this.success = false;
    if (this.notificationTimer) {
      clearTimeout(this.notificationTimer);
    }
  }

  closeErrorNotification(): void {
    this.error = '';
    if (this.notificationTimer) {
      clearTimeout(this.notificationTimer);
    }
  }

  isProfessional(): boolean {
    return this.donForm.get('raison')?.value || this.donForm.get('siren')?.value;
  }
}
