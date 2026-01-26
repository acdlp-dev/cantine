import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfigurationResponse, ConfigurationService } from '../configuration/services/configuration.service';
import { OnboardingService } from '../../services/onboarding.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

declare var google: any;


@Component({
    selector: 'app-configuration',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './configuration.component.html',
    styleUrls: ['./configuration.component.scss']
})
export class ConfigurationComponent implements OnInit {

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

    constructor(private fb: FormBuilder, private onboardingService: OnboardingService, private configurationService: ConfigurationService) { }

    ngOnInit(): void {
        this.initForm();
        this.loadAssociationData();

        // Charger les flags d'onboarding pour conditionner l'affichage
        this.onboardingService.isOnboardingCompleted().subscribe({
            next: (res) => {
                const r = res && res.result ? res.result : {};
                this.isOnboarded = r.isOnboarded === 1 || r.isOnboarded === true;
                this.hasCantine = r.cantine === 1 || r.cantine === true;
                this.hasDonations = r.donations === 1 || r.donations === true;
                this.hasSuiviVehicule = r.suiviVehicule === 1 || r.suiviVehicule === true;
            },
            error: (err) => {
                console.warn('Impossible de récupérer l\'état d\'onboarding, on masque les sections dédiées par défaut', err);
                // Par défaut : masquer les sections spécifiques
                this.isOnboarded = false;
                this.hasCantine = false;
                this.hasDonations = false;
                this.hasSuiviVehicule = false;
            }
        });

        // Observer les changements de valeur dans le formulaire
        this.infoForm.valueChanges.subscribe(values => {
            this.handleAddressChanges(values);
        });

        // Surveiller le changement de la case à cocher PayPal
        this.infoForm.get('payment_paypal')?.valueChanges.subscribe(isChecked => {
            if (!isChecked) {
                this.infoForm.get('paypal_email')?.setValue('', { emitEvent: false });
            }
        });

        // Surveiller le changement de la case à cocher Chèque
        this.infoForm.get('payment_check')?.valueChanges.subscribe(isChecked => {
            if (!isChecked) {
                this.clearCheckAddressFields();
                this.infoForm.get('same_address')?.setValue('yes', { emitEvent: false });
            }
        });

        // Surveiller le changement du radio button pour l'adresse des chèques
        this.infoForm.get('same_address')?.valueChanges.subscribe(value => {
            this.handleSameAddressChange(value);
        });
    }


    initForm(): void {
        this.infoForm = this.fb.group({
            // Configuration Stripe
            stripePublicKey: ['', Validators.required],
            stripeSecretKey: ['', Validators.required],

            // Informations Association
            siren: ['', Validators.required],
            association_name: ['', Validators.required],
            nickname: [''],
            type: ['', Validators.required],
            is_cultural: ['', Validators.required],
            quality: ['', Validators.required],
            purpose: ['', Validators.required],
            website: ['', [Validators.required, Validators.pattern('https?://.+')]],
            color: ['#ff7443', Validators.required],
            colorHex: ['#ff7443', Validators.required],

            // Adresse
            address: ['', Validators.required],
            city: ['', Validators.required],
            postal_code: ['', Validators.required],
            phone: ['', Validators.required],
            email: ['', [Validators.required, Validators.email]],
            same_address: ['yes', Validators.required],

            // Adresse pour les chèques
            check_address: [''],
            check_line1: [''],
            check_city: [''],
            check_postal_code: [''],

            // Reçus fiscaux
            email_sender: ['', Validators.required],
            fiscal_receipt_first_name: ['', Validators.required],
            fiscal_receipt_last_name: ['', Validators.required],
            fiscal_receipt_status: ['', Validators.required],

            // Coordonnées bancaires
            iban: ['', Validators.required],
            bic: ['', Validators.required],

            // Options supplémentaires
            has_paypal: ['no', Validators.required],
            has_zakat: ['no', Validators.required],
            hasPaypalZakat: ['no', Validators.required],

            // Champs conditionnels
            paypal_email: [''],
            zakat_iban: [''],
            zakat_bic: [''],
            paypal_email_zakat: [''],
            zakat_paypal_email: [''],

            // Moyens de paiement
            payment_card: [true],
            payment_sepa: [true],
            payment_paypal: [''],
            payment_check: ['']
        });

        // Synchroniser les champs de couleur
        this.infoForm.get('color')?.valueChanges.subscribe(value => {
            this.infoForm.get('colorHex')?.setValue(value, { emitEvent: false });
        });

        this.infoForm.get('colorHex')?.valueChanges.subscribe(value => {
            if (/^#[0-9A-F]{6}$/i.test(value)) {
                this.infoForm.get('color')?.setValue(value, { emitEvent: false });
            }
        });
    }

    handleAddressChanges(values: any): void {
        const mainAddress = (values.address || '').trim();
        const chequeAddress = (values.check_address || '').trim();

        if (values.same_address === 'yes') {
            // Copier l'adresse principale dans les champs de chèque
            this.infoForm.patchValue({
                check_address: values.address,
                check_line1: values.address,
                check_city: values.city,
                check_postal_code: values.postal_code
            }, { emitEvent: false });
        }
    }

    handleSameAddressChange(value: string): void {
        if (value === 'yes') {
            // Copier l'adresse principale dans les champs de chèque
            this.infoForm.patchValue({
                check_address: this.infoForm.get('address')?.value,
                check_line1: this.infoForm.get('address')?.value,
                check_city: this.infoForm.get('city')?.value,
                check_postal_code: this.infoForm.get('postal_code')?.value
            }, { emitEvent: false });
        } else {
            // Effacer les champs d'adresse de chèque
            this.clearCheckAddressFields();
        }
    }

    clearCheckAddressFields(): void {
        this.infoForm.patchValue({
            check_address: '',
            check_line1: '',
            check_city: '',
            check_postal_code: ''
        }, { emitEvent: false });
    }

    loadAssociationData(): void {
        this.isLoading = true;
        const currentSuccessMessage = this.successMessage;

        this.configurationService.getInfosAsso().subscribe({
            next: (response: ConfigurationResponse) => {
                const data = response.data;

                const hasPaypalZakat = data.paypal_email_zakat && data.paypal_email_zakat.trim() !== '';
                const hasPaypal = data.paypal_email && data.paypal_email.trim() !== '';
                const hasZakat = data.iban_zakat && data.iban_zakat.trim() !== '';
                const hasCheque = data.adresseCheque && data.adresseCheque.trim() !== '';

                const formattedResponse = {
                    stripePublicKey: data.stripe_publishable_key,
                    stripeSecretKey: data.stripe_secret_key,
                    siren: data.siren,
                    association_name: data.nom,
                    nickname: data.surnom,
                    type: data.type,
                    is_cultural: data.isMosquee === 'oui' ? 'yes' : 'no',
                    quality: data.qualite,
                    purpose: data.objet,
                    website: data.site,
                    color: data.codeCouleur,
                    colorHex: data.codeCouleur,
                    address: data.adresse,
                    city: data.ville,
                    postal_code: data.code_postal,
                    phone: data.tel,
                    email: data.email,
                    same_address: hasCheque ? 'yes' : 'no',
                    check_address: data.adresseCheque,
                    check_line1: data.adresseCheque,
                    check_city: data.villeCheque,
                    check_postal_code: data.code_postalCheque,
                    email_sender: data.expediteur,
                    fiscal_receipt_first_name: data.signataire_prenom,
                    fiscal_receipt_last_name: data.signataire_nom,
                    fiscal_receipt_status: data.signataire_role,
                    iban: data.iban_general,
                    bic: data.bic_general,
                    has_paypal: hasPaypal ? 'yes' : 'no',
                    has_zakat: hasZakat ? 'yes' : 'no',
                    paypal_email: data.paypal_email || '',
                    zakat_iban: data.iban_zakat || '',
                    zakat_bic: data.bic_zakat || '',
                    payment_paypal: hasPaypal,
                    hasPaypalZakat: hasPaypalZakat ? 'yes' : 'no',
                    paypal_email_zakat: data.paypal_email_zakat || '',
                    zakat_paypal_email: data.paypal_email_zakat || '',
                    payment_check: hasCheque,
                };

                this.infoForm.patchValue(formattedResponse);
                this.isLoading = false;
                this.successMessage = currentSuccessMessage;
            },
            error: (err) => {
                console.error('Erreur lors du chargement des abonnements', err);
                this.error = 'Impossible de charger les abonnements. Veuillez réessayer plus tard.';
                this.isLoading = false;
            }
        });
    }

    saveInfosAsso(): void {
        // Vérification PayPal : activé mais email manquant
        if (this.infoForm.get('payment_paypal')?.value && (!this.infoForm.get('paypal_email')?.value || this.infoForm.get('paypal_email')?.value.trim() === '')) {
            this.error = 'Si vous voulez activer PayPal, vous devez renseigner l\'email associé';
            return;
        }

        // Vérification PayPal Zakat : option "oui" sélectionnée mais email manquant
        if (this.infoForm.get('hasPaypalZakat')?.value === 'yes' && (!this.infoForm.get('paypal_email_zakat')?.value || this.infoForm.get('paypal_email_zakat')?.value.trim() === '')) {
            this.error = 'Si vous avez un compte PayPal pour la Zakat, vous devez renseigner l\'email associé';
            return;
        }

        // Vérification Chèque : activé mais adresse manquante
        if (this.infoForm.get('payment_check')?.value) {
            if (this.infoForm.get('same_address')?.value === 'no') {
                // Si l'option "adresse différente" est sélectionnée, vérifier que les champs d'adresse sont remplis

                if (!this.infoForm.get('check_line1')?.value ||
                    !this.infoForm.get('check_city')?.value ||
                    !this.infoForm.get('check_postal_code')?.value) {
                    this.error = 'Si vous voulez activer le paiement par chèque, vous devez renseigner l\'adresse complète';
                    return;
                }
            }
        }

        if (!this.infoForm.valid) {
            this.submitted = true;
            return;
        }

        this.isLoading = true;
        this.error = null;
        this.successMessage = null;

        const raw = this.infoForm.value;
        const formData: any = {
            source: 'configuration',
            stripePublicKey: raw.stripePublicKey,
            stripeSecretKey: raw.stripeSecretKey,
            siren: raw.siren,
            association_name: raw.association_name,
            nickname: raw.nickname,
            type: raw.type,
            is_cultural: raw.is_cultural,
            quality: raw.quality,
            purpose: raw.purpose,
            website: raw.website,
            color: raw.color,
            colorHex: raw.colorHex,
            address: raw.address,
            city: raw.city,
            postal_code: raw.postal_code,
            phone: raw.phone,
            email: raw.email,
            same_address: raw.same_address,
            check_address: raw.check_address,
            check_line1: raw.check_line1,
            check_city: raw.check_city,
            check_postal_code: raw.check_postal_code,
            email_sender: raw.email_sender,
            fiscal_receipt_first_name: raw.fiscal_receipt_first_name,
            fiscal_receipt_last_name: raw.fiscal_receipt_last_name,
            fiscal_receipt_status: raw.fiscal_receipt_status,
            iban: raw.iban,
            bic: raw.bic,
            has_paypal: raw.has_paypal,
            has_zakat: raw.has_zakat,
            hasPaypalZakat: raw.hasPaypalZakat,
            paypal_email: raw.paypal_email,
            zakat_iban: raw.zakat_iban,
            zakat_bic: raw.zakat_bic,
            paypal_email_zakat: raw.paypal_email_zakat,
            zakat_paypal_email: raw.zakat_paypal_email,
            payment_card: raw.payment_card,
            payment_sepa: raw.payment_sepa,
            payment_paypal: raw.payment_paypal,
            payment_check: raw.payment_check
        };

        this.configurationService.saveInfosAsso(formData).subscribe({
            next: (response: any) => {
                // Message de base
                this.successMessage = 'Les modifications ont été enregistrées avec succès!';
                
                // Vérifier si le seeding Stripe a été déclenché
                if (response?.stripeSeed?.triggered) {
                    if (response.stripeSeed.success) {
                        this.successMessage = `Configuration enregistrée! ${response.stripeSeed.pricesCreated} tarifs mensuels créés sur Stripe (${response.stripeSeed.productName}).`;
                    } else {
                        // Le seeding a échoué mais la config est sauvegardée
                        this.error = `Configuration sauvegardée, mais erreur lors de la création des tarifs Stripe: ${response.stripeSeed.error}`;
                    }
                }
                
                this.loadAssociationData();
                setTimeout(() => this.successMessage = null, 8000); // Plus long pour lire le message
            },
            error: (err) => {
                console.error('Erreur lors de la sauvegarde des infos', err);
                this.error = 'Impossible de sauvegarder les infos. Veuillez réessayer plus tard.';
                this.isLoading = false;
            }
        });
    }

    disableMandatoryPaymentMethods(event: Event): boolean {
        event.preventDefault();
        event.stopPropagation();
        return false;
    }
}
