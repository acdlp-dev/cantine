import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { InfosResponse, InfosService } from './services/infos.service';
import { OnboardingService } from '../../services/onboarding.service';

declare var google: any;

@Component({
    selector: 'app-infos',
    templateUrl: './infos.component.html',
    styleUrls: ['./infos.component.scss'],
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule]
})
export class InfosComponent implements OnInit, AfterViewInit {
    @ViewChild('addressInput') addressInput!: ElementRef;
    @ViewChild('chequeAddressInput') chequeAddressInput!: ElementRef;

    infoForm!: FormGroup;
    isLoading = false;
    error: string | null = null;
    successMessage: string | null = null;
    fetchingCity = false;
    submitted = false;

    // Flags provenant de l'onboarding pour afficher/masquer des blocs
    isOnboarded = false;
    hasCantine = false;
    hasDonations = false;
    hasSuiviVehicule = false;

    constructor(private fb: FormBuilder, private infosService: InfosService, private onboardingService: OnboardingService) { }

    ngOnInit(): void {
        this.initForm();
        this.loadAssociationData();

        // Charger les flags d'onboarding
        this.onboardingService.isOnboardingCompleted().subscribe({
            next: (res) => {
                const r = res && res.result ? res.result : {};
                this.isOnboarded = r.isOnboarded === 1 || r.isOnboarded === true;
                this.hasCantine = r.cantine === 1 || r.cantine === true;
                this.hasDonations = r.donations === 1 || r.donations === true;
                this.hasSuiviVehicule = r.suiviVehicule === 1 || r.suiviVehicule === true;
            },
            error: () => {
                this.isOnboarded = false;
                this.hasCantine = false;
                this.hasDonations = false;
                this.hasSuiviVehicule = false;
            }
        });
        // Ce formulaire ne gère que l'identité et le contact (pas de moyens de paiement ici)
    }

    ngAfterViewInit(): void {
        this.initGooglePlacesAutocomplete();
    }

    initForm(): void {
        // Infos: uniquement identité + coordonnées affichées dans le template
        this.infoForm = this.fb.group({
            siren: ['', Validators.required],
            association_name: ['', Validators.required],
            nickname: [''],
            type: ['', Validators.required],
            address: ['', Validators.required],
            city: ['', Validators.required],
            postal_code: ['', Validators.required],
            phone: ['', Validators.required],
            email: ['', [Validators.required, Validators.email]],
            website: [''],
            color: ['#ff7443'],
            colorHex: ['#ff7443']
        });

        // Synchroniser color <-> colorHex
        this.infoForm.get('color')?.valueChanges.subscribe(value => {
            this.infoForm.get('colorHex')?.setValue(value, { emitEvent: false });
        });
        this.infoForm.get('colorHex')?.valueChanges.subscribe(value => {
            if (/^#[0-9A-F]{6}$/i.test(value)) {
                this.infoForm.get('color')?.setValue(value, { emitEvent: false });
            }
        });
    }

    loadAssociationData(): void {
        this.isLoading = true;
        const currentSuccessMessage = this.successMessage;

        this.infosService.getInfosAsso().subscribe({
            next: (response: InfosResponse) => {
                const data = response.data;
                const hasCheque = data.adresseCheque && data.adresseCheque.trim() !== '';

                const formattedResponse = {
                    siren: data.siren,
                    association_name: data.nom,
                    nickname: data.surnom,
                    type: data.type,
                    website: data.site,
                    color: data.codeCouleur,
                    colorHex: data.codeCouleur,
                    address: data.adresse,
                    city: data.ville,
                    postal_code: data.code_postal,
                    phone: data.tel,
                    email: data.email,
                    same_address: hasCheque ? 'yes' : 'no'
                } as any;

                this.infoForm.patchValue(formattedResponse);
                this.isLoading = false;
                this.successMessage = currentSuccessMessage;
            },
            error: (err) => {
                console.error('Erreur lors du chargement des infos', err);
                this.error = 'Impossible de charger les infos. Veuillez réessayer plus tard.';
                this.isLoading = false;
            }
        });
    }

    saveInfosAsso(): void {
        if (!this.infoForm.valid) {
            this.submitted = true;
            return;
        }

        this.isLoading = true;
        this.error = null;
        this.successMessage = null;

        const raw = this.infoForm.value;
        const formData: any = {
            source: 'infos',
            siren: raw.siren,
            association_name: raw.association_name,
            nickname: raw.nickname,
            type: raw.type,
            address: raw.address,
            city: raw.city,
            postal_code: raw.postal_code,
            phone: raw.phone,
            email: raw.email,
            website: raw.website,
            color: raw.color,
            colorHex: raw.colorHex
        };

        this.infosService.saveInfosAsso(formData).subscribe({
            next: () => {
                this.successMessage = 'Les modifications ont été enregistrées avec succès!';
                this.loadAssociationData();
                setTimeout(() => this.successMessage = null, 5000);
            },
            error: (err) => {
                console.error('Erreur lors de la sauvegarde des infos', err);
                this.error = 'Impossible de sauvegarder les infos. Veuillez réessayer plus tard.';
                this.isLoading = false;
            }
        });
    }

    // Autocomplete adresse principale uniquement
    initGooglePlacesAutocomplete(): void {
        if (typeof google !== 'undefined' && this.addressInput) {
            const autocomplete = new google.maps.places.Autocomplete(
                this.addressInput.nativeElement,
                { fields: ['address_components', 'formatted_address'], types: ['address'] }
            );

            autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace();
                if (place && place.address_components) {
                    let streetNumber = '';
                    let street = '';
                    let city = '';
                    let postalCode = '';

                    for (const component of place.address_components) {
                        const componentType = component.types[0];
                        switch (componentType) {
                            case 'street_number': streetNumber = component.long_name; break;
                            case 'route': street = component.long_name; break;
                            case 'locality': city = component.long_name; break;
                            case 'postal_code': postalCode = component.long_name; break;
                        }
                    }
                    const addressLine1 = streetNumber && street ? `${streetNumber} ${street}` : street;
                    this.infoForm.patchValue({
                        address: place.formatted_address || addressLine1,
                        postal_code: postalCode,
                        city: city
                    });
                }
            });
        }
    }

    disableMandatoryPaymentMethods(event: Event): boolean {
        event.preventDefault();
        event.stopPropagation();
        return false;
    }
}
