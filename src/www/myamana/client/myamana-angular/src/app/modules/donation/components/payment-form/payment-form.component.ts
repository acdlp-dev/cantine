import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { PaymentTab } from '../../models/payment-tab.type';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Stripe, loadStripe } from '@stripe/stripe-js';
import { DonsService } from '../../../dashboard/services/dons.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCcVisa, faCcAmex } from '@fortawesome/free-brands-svg-icons';
import { faUniversity, faCreditCard } from '@fortawesome/free-solid-svg-icons';
import { Router } from '@angular/router';
import { loadScript } from '@paypal/paypal-js';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

interface CardElements {
  number: any;
  expiry: any;
  cvc: any;
}

type PaymentType = 'card' | 'sepa_debit' | null;

@Component({
  selector: 'app-payment-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, FontAwesomeModule],
  templateUrl: './payment-form.component.html',
  styleUrl: './payment-form.component.scss',
})
export class PaymentFormComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('cardElement', { static: true }) cardElement!: ElementRef;
  @Input() donationAmount: number = 0;
  @Input() donationColor: string = '#d7192d';
  @Input() selectedCampaign: string = '';
  @Input() associationData: any;
  @Input() isZakatCampaign: boolean = false;
  @Input() assoId: string ='';
  @Input() donationFormData: any; 
  @Input() isMonthly: boolean = false;


  activeTab: PaymentTab = 'CB';
  paymentTabs: PaymentTab[] = ['CB'];
  paymentForm: FormGroup;

  // Stripe related properties
  stripe: Stripe | null = null;
  elements: any = null;
  currentElement: any | CardElements = null;
  paymentError: string | null = null;
  isSubmitting = false;
  viewInitialized = false;

  // PayPal related properties
  paypalButtonRendered = false;
  isPaypalLoading = false;
  isSubmittingPaypal = false;
  paypalError: string | null = null;

  // SEPA related properties
  ibanElement: any = null;
  sepaError: string | null = null;
  isSubmittingSepa = false;

  // Font Awesome icons
  faVisa = faCcVisa;
  faAmex = faCcAmex;
  faIban = faUniversity;
  faCard = faCreditCard;

  constructor(
    private fb: FormBuilder,
    private donsService: DonsService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private http: HttpClient
  ) {
    this.paymentForm = this.fb.group({
      acceptTermsPaypal: [false, Validators.requiredTrue],
      acceptTermsCheque: [false, Validators.requiredTrue],
      acceptTermsSepa: [false, Validators.requiredTrue],
      acceptTermsCard: [false, Validators.requiredTrue],
      paymentType: ['card'],
    });
  }

  async ngOnInit() {
    document.documentElement.style.setProperty(
      '--donation-color',
      this.donationColor
    );
    this.initializeAvailableTabs();

    // Initialize Stripe
    await this.initializeStripe();
  }


  private async initializePayPal() {
    this.isPaypalLoading = true;
    this.paypalError = null;
    this.paypalButtonRendered = false;

    try {
      // Charger le SDK PayPal
        const paypalClientId = this.associationData?.paypal_client_id;
        if (!paypalClientId) {
          return;
        }
        const paypal = await loadScript({ 
          clientId: paypalClientId,
          currency: 'EUR',
          intent: 'capture'
        });
      
      if (!paypal || !paypal.Buttons) {
        throw new Error('PayPal SDK could not be loaded.');
      }

      // Vider le conteneur avant de rendre le bouton
      const container = document.getElementById('paypal-button-container');
      if (container) {
        container.innerHTML = '';
      }
      
      // Créer et rendre le bouton PayPal
      const button = paypal.Buttons({
        style: {
          color: 'blue',
          shape: 'rect',
          label: 'pay'
        },
        fundingSource: (paypal && paypal.FUNDING) ? paypal.FUNDING['PAYPAL'] : undefined,
        // Création de la transaction
        createOrder: (data, actions) => {
          if (!actions.order) {
            throw new Error('PayPal actions.order is undefined');
          }
          return actions.order.create({
            intent: 'CAPTURE',
            purchase_units: [{
              amount: {
                value: this.donationAmount.toString(),
                currency_code: 'EUR'
              },
              description: `Don pour ${this.selectedCampaign || 'l\'association'}`,
              invoice_id: `${this.assoId}:${Date.now()}`,
              custom_id: this.associationData?.donationUuid ,
              payee: {
                email_address: this.isZakatCampaign
                  ? this.associationData?.paypal_email_zakat
                  : this.associationData?.paypal_email
              }
            }]
          });
        },
        // Capture du paiement
        onApprove: async (data, actions) => {
          this.isSubmittingPaypal = true;
          try {
            if (!actions.order) {
              throw new Error('PayPal actions.order is undefined');
            }
            
            const details = await actions.order.capture();

            this.sendConfirmationEmail();

            window.location.href = this.associationData.ty_link;

          } catch (error: unknown) {
            this.paypalError = 'Une erreur est survenue lors de la finalisation du paiement.';
          } finally {
            this.isSubmittingPaypal = false;
            this.cdr.detectChanges();
          }
        },
        
        // Gestion des erreurs
        onError: () => {
          this.paypalError = "Une erreur est survenue lors du traitement de votre paiement PayPal";
          this.cdr.detectChanges();
        },
        // Annulation
        onCancel: () => {
          this.cdr.detectChanges();
        }
      });
      
      // Rendre le bouton dans le conteneur
      if (container) {
        button.render('#paypal-button-container')
          .then(() => {
            this.paypalButtonRendered = true;
          })
          .catch(() => {
            this.paypalError = "Erreur lors de l'affichage du bouton PayPal";
          })
          .finally(() => {
            this.isPaypalLoading = false;
            this.cdr.detectChanges();
          });
      } else {
        throw new Error('PayPal button container not found');
      }
    } catch (error) {
      this.paypalError = "Erreur lors de l'initialisation de PayPal";
      this.isPaypalLoading = false;
      this.cdr.detectChanges();
    }
  }

  async ngAfterViewInit() {
    this.viewInitialized = true;

    // Attendre que Stripe et les éléments soient initialisés
    let attempts = 0;
    while (!this.elements && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (this.elements) {
      // Initialiser les éléments avec un délai pour s'assurer que le DOM est prêt
      setTimeout(() => {
        // En mode mensuel avec SEPA par défaut, initialiser l'élément IBAN
        if (this.isMonthly && this.activeTab === 'SEPA') {
          this.initializeIbanElement();
        } else {
          this.initializeCardElements();
        }
        this.cdr.detectChanges();
      }, 500); // Délai plus long pour s'assurer que le DOM est complètement rendu
    }
  }

  private async initializeStripe() {
    try {
      if (!this.assoId) {
        this.paymentError =
          "Erreur lors de l'initialisation du formulaire de paiement";
        return;
      }
      
      const publicKey = await this.donsService.getStripePublicKey(this.assoId).toPromise();
      
      if (!publicKey) {
        throw new Error('Impossible de récupérer la clé publique Stripe');
      }

      this.stripe = await loadStripe(publicKey);

      if (this.stripe) {
        this.elements = this.stripe.elements();
      }
    } catch (error) {
      this.paymentError =
        "Erreur lors de l'initialisation du formulaire de paiement";
    }
  }

  private async initializeIbanElement(retryCount = 0) {
    if (!this.stripe || !this.elements) {
      console.log('[payment-form] initializeIbanElement: Stripe ou elements non prêts');
      return;
    }

    // Détruire l'élément IBAN existant si nécessaire
    if (this.ibanElement) {
      try {
        this.ibanElement.destroy();
        this.ibanElement = null;
      } catch (error) {
        // Ignore errors when destroying elements
      }
    }

    const ibanContainer = document.getElementById('iban-element');
    if (!ibanContainer) {
      // Retry jusqu'à 5 fois avec un délai croissant
      if (retryCount < 5) {
        console.log(`[payment-form] initializeIbanElement: conteneur non trouvé, retry ${retryCount + 1}/5`);
        setTimeout(() => {
          this.initializeIbanElement(retryCount + 1);
        }, 200 * (retryCount + 1));
      } else {
        console.error('[payment-form] initializeIbanElement: conteneur non trouvé après 5 tentatives');
      }
      return;
    }

    console.log('[payment-form] initializeIbanElement: conteneur trouvé, initialisation...');

    const ibanOptions = {
      supportedCountries: ['SEPA'],
      placeholderCountry: 'FR',
      style: {
        base: {
          fontSize: '16px',
          color: '#424770',
          '::placeholder': {
            color: '#aab7c4',
          },
        },
        invalid: {
          color: '#9e2146',
        },
      },
    };

    try {
      this.ibanElement = this.elements.create('iban', ibanOptions);
      this.ibanElement.mount('#iban-element');

      this.ibanElement.on('change', (event: any) => {
        if (event.error) {
          this.sepaError = event.error.message;
        } else {
          this.sepaError = null;
        }
        this.cdr.detectChanges();
      });

      console.log('[payment-form] IBAN element monté avec succès');
      this.cdr.detectChanges();
    } catch (error) {
      console.error('[payment-form] Erreur montage IBAN:', error);
      this.sepaError = "Erreur lors de l'initialisation du formulaire IBAN";
      this.cdr.detectChanges();
    }
  }

  private async initializeCardElements(retryCount = 0) {
    if (!this.stripe || !this.elements) {
      console.error('[payment-form] Stripe ou elements non initialisés', { stripe: !!this.stripe, elements: !!this.elements });
      this.paymentError = "Erreur lors de l'initialisation du formulaire de paiement. Veuillez recharger la page.";
      this.cdr.detectChanges();
      return;
    }

    // Détruire les éléments existants si nécessaire
    if (this.currentElement) {
      try {
        if ('number' in this.currentElement) {
          const cardElements = this.currentElement as CardElements;
          cardElements.number?.destroy();
          cardElements.expiry?.destroy();
          cardElements.cvc?.destroy();
        }
        this.currentElement = null;
      } catch (error) {
        // Ignore errors when destroying elements
      }
    }

    const elementOptions = {
      style: {
        base: {
          fontSize: '16px',
          color: '#424770',
          '::placeholder': {
            color: '#aab7c4',
          },
        },
      },
    };

    try {
      // Vérifier que les éléments du DOM sont présents
      const cardNumber = document.getElementById('card-number');
      const cardExpiry = document.getElementById('card-expiry');
      const cardCvc = document.getElementById('card-cvc');

      if (!cardNumber || !cardExpiry || !cardCvc) {
        // Retry jusqu'à 5 fois avec un délai croissant
        if (retryCount < 5) {
          console.log(`[payment-form] initializeCardElements: éléments DOM non trouvés, retry ${retryCount + 1}/5`);
          setTimeout(() => {
            this.initializeCardElements(retryCount + 1);
          }, 200 * (retryCount + 1));
        } else {
          console.error('[payment-form] Éléments DOM non trouvés après 5 tentatives', { cardNumber: !!cardNumber, cardExpiry: !!cardExpiry, cardCvc: !!cardCvc });
          this.paymentError = 'Erreur lors de l\'initialisation du formulaire de paiement';
          this.cdr.detectChanges();
        }
        return;
      }

      console.log('[payment-form] initializeCardElements: éléments DOM trouvés, initialisation...');

      // Create card elements
      const elements: CardElements = {
        number: this.elements.create('cardNumber', elementOptions),
        expiry: this.elements.create('cardExpiry', elementOptions),
        cvc: this.elements.create('cardCvc', elementOptions),
      };

      // Mount the elements
      elements.number.mount('#card-number');
      elements.expiry.mount('#card-expiry');
      elements.cvc.mount('#card-cvc');

      // Handle errors for each element
      Object.values(elements).forEach((element) => {
        element.on('change', (event: any) => {
          if (event.error) {
            this.paymentError = event.error.message;
          } else {
            this.paymentError = null;
          }
          this.cdr.detectChanges();
        });
      });

      this.currentElement = elements;

      console.log('[payment-form] Card elements montés avec succès');

      // Force change detection after mounting elements
      this.cdr.detectChanges();
    } catch (error) {
      console.error('[payment-form] Erreur montage Card elements:', error);
      this.paymentError =
        "Erreur lors de l'initialisation du formulaire de paiement";
      this.cdr.detectChanges();
    }
  }

  private initializeAvailableTabs() {
    // CB tab is always available
    this.paymentTabs = ['CB'];

    // En mensuel, on autorise CB et SEPA (prélèvement automatique)
    if (this.isMonthly) {
      // Ajouter SEPA en premier pour qu'il soit l'onglet par défaut
      this.paymentTabs = ['SEPA', 'CB'];
      this.activeTab = 'SEPA'; // SEPA par défaut pour les dons mensuels
      return;
    }

    // PayPal tab (ponctuel uniquement)
    const paypalEmail = this.isZakatCampaign
      ? this.associationData?.paypal_email_zakat
      : this.associationData?.paypal_email;
    const paypalClientId = this.associationData?.paypal_client_id;
    if (paypalEmail && paypalClientId) {
      this.paymentTabs.push('PAYPAL');
    }

    // Cheques tab (ponctuel uniquement)
    if (this.associationData?.adresseCheque) {
      this.paymentTabs.push('CHEQUES');
    }

    // SEPA tab (virement ponctuel - affiche simplement les coordonnées bancaires)
    const hasBic = this.isZakatCampaign
      ? this.associationData?.bic_zakat
      : this.associationData?.bic_general;
    const hasIban = this.isZakatCampaign
      ? this.associationData?.iban_zakat
      : this.associationData?.iban_general;
    if (hasBic && hasIban) {
      this.paymentTabs.push('SEPA');
    }

    // If current active tab is not available, default to CB
    if (!this.paymentTabs.includes(this.activeTab)) {
      this.activeTab = 'CB';
    }
  }

  async setActiveTab(tab: PaymentTab) {
    this.activeTab = tab;

    // Forcer la détection de changements d'abord pour mettre à jour la vue
    this.cdr.detectChanges();

    // Initialiser PayPal dès qu'on passe à l'onglet PayPal (sans condition sur checkbox)
    if (tab === 'PAYPAL' && !this.paypalButtonRendered && !this.isPaypalLoading) {
      await this.initializePayPal();
    }

    // Initialiser l'élément IBAN Stripe pour le prélèvement SEPA mensuel
    if (tab === 'SEPA' && this.isMonthly && !this.ibanElement) {
      setTimeout(() => {
        this.initializeIbanElement();
      }, 150);
    }

    // Initialiser les éléments de carte quand on passe sur CB
    if (tab === 'CB' && !this.currentElement) {
      setTimeout(() => {
        this.initializeCardElements();
        this.cdr.detectChanges();
      }, 150);
    }
  }

  async onPaypalSubmit() {
    if (this.paymentForm.get('acceptTermsPaypal')?.valid) {
      // Si le bouton n'est pas encore rendu, initialiser PayPal
      if (!this.paypalButtonRendered && !this.isPaypalLoading) {
        await this.initializePayPal();
      }
    }
  }

  onChequeSubmit() {
    if (this.paymentForm.get('acceptTermsCheque')?.valid) {
      this.submitOfflineDonation('cheque');
    }
  }

  onSepaSubmit() {
    if (this.paymentForm.get('acceptTermsSepa')?.valid) {
      // En mode mensuel, utiliser le prélèvement SEPA Stripe
      if (this.isMonthly) {
        this.onSepaMonthlySubmit();
      } else {
        // En mode ponctuel, utiliser le virement classique (affichage des coordonnées bancaires)
        this.submitOfflineDonation('sepa');
      }
    }
  }

  /**
   * Gère la souscription mensuelle par prélèvement SEPA via Stripe
   */
  async onSepaMonthlySubmit() {
    if (!this.paymentForm.get('acceptTermsSepa')?.valid) {
      return;
    }

    if (!this.stripe || !this.ibanElement) {
      this.sepaError = "Erreur lors de l'initialisation du formulaire de prélèvement";
      return;
    }

    this.isSubmittingSepa = true;
    this.sepaError = null;

    try {
      const name = `${this.donationFormData?.firstname || ''} ${this.donationFormData?.lastname || ''}`.trim();
      const email = this.donationFormData?.email || '';

      // Créer le PaymentMethod SEPA avec l'IBAN
      const { paymentMethod, error: pmError } = await this.stripe.createPaymentMethod({
        type: 'sepa_debit',
        sepa_debit: this.ibanElement,
        billing_details: {
          name: name,
          email: email,
        },
      });

      if (pmError) {
        this.sepaError = this.getSepaErrorMessage(pmError);
        this.isSubmittingSepa = false;
        return;
      }

      if (!paymentMethod) {
        this.sepaError = 'Erreur lors de la création du moyen de paiement SEPA';
        this.isSubmittingSepa = false;
        return;
      }

      // Créer la souscription avec le PaymentMethod SEPA
      const subResponse = await this.http.post<{
        clientSecret?: string;
        subscriptionId?: string;
        status?: string;
        requiresAction?: boolean;
      }>(
        `${environment.apiUrl}/create-subscription`,
        {
          asso: this.assoId,
          paymentMethodId: paymentMethod.id,
          paymentMethodType: 'sepa_debit',
          email: email,
          firstName: this.donationFormData?.firstname || '',
          lastName: this.donationFormData?.lastname || '',
          amount: this.donationAmount,
          campaign: this.donationFormData?.campagne || this.selectedCampaign,
          billingDay: this.donationFormData?.paymentDay || undefined,
          productId: this.donationFormData?.productId || undefined,
        }
      ).toPromise();

      if (!subResponse) {
        throw new Error('Pas de réponse reçue du serveur');
      }

      // Pour SEPA, le paiement est généralement en statut "processing"
      // car le prélèvement prend quelques jours
      if (subResponse.status === 'active' || subResponse.status === 'incomplete') {
        // Si on a un clientSecret, on doit confirmer le paiement
        if (subResponse.clientSecret) {
          const { error: confirmError } = await this.stripe.confirmSepaDebitPayment(
            subResponse.clientSecret,
            {
              payment_method: paymentMethod.id,
            }
          );

          if (confirmError) {
            this.sepaError = this.getSepaErrorMessage(confirmError);
            this.isSubmittingSepa = false;
            return;
          }
        }

        // Redirection vers la page de remerciement
        window.location.href = this.associationData.ty_link;
      } else {
        this.sepaError = "Le prélèvement n'a pas pu être initialisé";
        this.isSubmittingSepa = false;
      }

    } catch (error: any) {
      this.sepaError = error.message || 'Une erreur est survenue lors de la mise en place du prélèvement';
      this.isSubmittingSepa = false;
    }
  }

  private getSepaErrorMessage(error: any): string {
    if (!error) {
      return 'Une erreur est survenue lors du traitement de votre prélèvement';
    }

    const stripeError = error.error || error;
    const code = stripeError.code || stripeError.decline_code || '';

    // Messages d'erreur pour la saisie de l'IBAN
    switch (code) {
      case 'incomplete_iban':
        return 'Veuillez saisir un IBAN complet';
      case 'invalid_iban':
        return 'L\'IBAN saisi est invalide';
      case 'invalid_iban_country_code':
        return 'Le code pays de l\'IBAN n\'est pas valide pour la zone SEPA';
      case 'iban_invalid_country':
        return 'Ce pays n\'est pas supporté pour le prélèvement SEPA';
      case 'sepa_unsupported_account':
        return 'Ce type de compte n\'est pas supporté pour le prélèvement SEPA';

      // Erreurs de limite de compte (IBAN de test Stripe)
      case 'charge_exceeds_source_limit':
        return 'Le montant du paiement dépasse la limite hebdomadaire de votre compte. Veuillez réessayer plus tard ou utiliser un autre moyen de paiement.';
      case 'charge_exceeds_weekly_limit':
        return 'Le montant du paiement dépasse la limite de transactions de votre compte. Veuillez réessayer plus tard ou utiliser un autre moyen de paiement.';

      // Erreurs de fonds insuffisants
      case 'insufficient_funds':
        return 'Fonds insuffisants sur le compte bancaire. Veuillez vérifier votre solde ou utiliser un autre compte.';

      // Erreurs SEPA spécifiques
      case 'debit_not_authorized':
        return 'Le prélèvement n\'a pas été autorisé par le titulaire du compte. Veuillez vérifier que vous avez bien autorisé le mandat SEPA.';
      case 'account_closed':
        return 'Le compte bancaire associé à cet IBAN est fermé. Veuillez utiliser un autre compte.';
      case 'bank_account_restricted':
        return 'Le compte bancaire est restreint et ne peut pas recevoir de prélèvements SEPA.';
      case 'invalid_account_number':
        return 'Le numéro de compte est invalide. Veuillez vérifier votre IBAN.';
      case 'invalid_currency':
        return 'La devise n\'est pas acceptée par ce compte. Le prélèvement SEPA nécessite un compte en euros.';
      case 'no_account':
        return 'Le compte bancaire associé à cet IBAN n\'existe pas. Veuillez vérifier votre IBAN.';
      case 'sepa_direct_debit_incomplete':
        return 'Le mandat SEPA est incomplet. Veuillez réessayer ou contacter le support.';

      // Erreur générique de refus
      case 'generic_decline':
        return 'Le prélèvement a été refusé par votre banque. Veuillez contacter votre banque ou utiliser un autre moyen de paiement.';

      default:
        return stripeError.message || 'Une erreur est survenue lors du traitement de votre prélèvement SEPA. Veuillez réessayer ou utiliser un autre moyen de paiement.';
    }
  }

  private getStripeErrorMessage(error: any): string {

    // Message d'erreur par defaut
    let errorMessage =
      'Une erreur est survenue lors du traitement de votre paiement';

    if (!error) {
      return errorMessage;
    }

    const stripeError = error.error || error;

    switch (stripeError.type) {
      case 'card_error':
        if (stripeError.code) {
          switch (stripeError.code) {
            case 'card_declined':
              if (stripeError.decline_code) {
                switch (stripeError.decline_code) {
                  case 'insufficient_funds':
                    errorMessage =
                      'Fonds insuffisants sur la carte. Veuillez utiliser une autre carte.';
                    break;
                  case 'lost_card':
                    errorMessage =
                      'Carte inutilisable. Veuillez utiliser une autre carte.';
                    break;
                  case 'stolen_card':
                    errorMessage =
                      'Carte inutilisable. Veuillez utiliser une autre carte.';
                    break;
                  case 'card_velocity_exceeded':
                    errorMessage =
                      'Limite de transactions dépassée pour cette carte. Veuillez réessayer plus tard ou utiliser une autre carte.';
                    break;
                  default:
                    errorMessage =
                      'Votre paiement a été refusée. Veuillez vérifier les informations ou utiliser une autre carte.';
                    break;
                }
              } else {
                errorMessage =
                  'Votre carte a été refusée. Veuillez vérifier les informations ou utiliser une autre carte.';
              }
              break;
            case 'expired_card':
              errorMessage =
                'Votre carte est expirée. Veuillez utiliser une autre carte.';
              break;
            case 'incorrect_cvc':
              errorMessage =
                'Le code de sécurité (CVC) est incorrect. Veuillez vérifier et réessayer.';
              break;
            case 'processing_error':
              errorMessage =
                'Une erreur est survenue lors du traitement de votre carte. Veuillez réessayer.';
              break;
            case 'incorrect_number':
              errorMessage =
                'Le numéro de carte est incorrect. Veuillez vérifier et réessayer.';
              break;
            default:
              errorMessage = stripeError.message || errorMessage;
              break;
          }
        } else {
          errorMessage = stripeError.message || errorMessage;
        }
        break;

      case 'validation_error':
        errorMessage =
          'Les informations de paiement sont invalides. Veuillez vérifier et réessayer.';
        break;

      default:
        errorMessage = stripeError.message || errorMessage;
        break;
    }

    return errorMessage;
  }

  async onCardSubmit() {
    if (!this.paymentForm.get('acceptTermsCard')?.valid) {
      return;
    }

    if (!this.stripe || !this.currentElement) {
      this.paymentError =
        "Erreur lors de l'initialisation du formulaire de paiement";
      return;
    }

    this.isSubmitting = true;
    this.paymentError = null;

    try {
      //Créer le PaymentMethod (tokenisation de la carte)
      const elements = this.currentElement as CardElements;
      const { paymentMethod, error: pmError } = await this.stripe.createPaymentMethod({
        type: 'card',
        card: elements.number,
        billing_details: {
          name: this.associationData?.name_donateur || '',
          email: this.associationData?.email_donateur || '',
        },
      });

      if (pmError) {
        this.paymentError = this.getStripeErrorMessage(pmError);
        this.isSubmitting = false;
        return;
      }

      if (!paymentMethod) {
        this.paymentError = 'Erreur lors de la création du moyen de paiement';
        this.isSubmitting = false;
        return;
      }

      if (this.isMonthly) {
        // Flux abonnement (subscription)
        const subResponse = await this.http.post<{ clientSecret?: string; subscriptionId?: string; status?: string }>(
          `${environment.apiUrl}/create-subscription`,
          {
            asso: this.assoId,
            paymentMethodId: paymentMethod.id,
            email: this.donationFormData?.email || '',
            firstName: this.donationFormData?.firstname || '',
            lastName: this.donationFormData?.lastname || '',
            amount: this.donationAmount, // en euros
            campaign: this.donationFormData?.campagne || this.selectedCampaign,
            billingDay: this.donationFormData?.paymentDay || undefined,
            productId: this.donationFormData?.productId || undefined,
            siren: this.donationFormData?.siren || '',
            raison: this.donationFormData?.raison || '',
            adresse: this.donationFormData?.address || '',
            ville: this.donationFormData?.city || '',
            code_postal: this.donationFormData?.postal_code || '',
            pays: this.donationFormData?.country || 'France',
          }
        ).toPromise();

        if (!subResponse) {
          throw new Error('Pas de réponse reçue du serveur');
        }

        console.log('[payment-form] Réponse subscription:', {
          subscriptionId: subResponse.subscriptionId,
          status: subResponse.status,
          hasClientSecret: !!subResponse.clientSecret
        });

        // Si la subscription est déjà active, le paiement a réussi immédiatement
        if (subResponse.status === 'active') {
          console.log('[payment-form] Subscription active, redirection vers succès');
          window.location.href = this.associationData.ty_link;
          return;
        }

        // Pour les statuts 'incomplete' ou autres, on tente de confirmer le paiement
        if (subResponse.clientSecret) {
          console.log('[payment-form] Confirmation du paiement avec clientSecret');
          const { error: confirmError, paymentIntent } = await this.stripe.confirmCardPayment(
            subResponse.clientSecret,
            { payment_method: paymentMethod.id }
          );

          console.log('[payment-form] Résultat confirmation:', {
            hasError: !!confirmError,
            errorCode: confirmError?.code,
            paymentIntentStatus: paymentIntent?.status
          });

          if (confirmError) {
            this.paymentError = this.getStripeErrorMessage(confirmError);
            this.isSubmitting = false;
            this.router.navigate(['/donation/payment-failure']);
            return;
          }

          // Vérifier les statuts valides pour un paiement réussi
          // 'succeeded' = paiement confirmé
          // 'processing' = en cours (cartes qui nécessitent plus de temps)
          // 'requires_capture' = capture manuelle requise (rare)
          // Si pas d'erreur et pas de paymentIntent, considérer comme succès (déjà payé)
          const successStatuses = ['succeeded', 'processing', 'requires_capture'];
          if (!paymentIntent || successStatuses.includes(paymentIntent.status)) {
            console.log('[payment-form] Paiement réussi, redirection vers succès');
            window.location.href = this.associationData.ty_link;
            return;
          }

          // Si le statut nécessite une action 3D Secure, Stripe gère automatiquement
          if (paymentIntent.status === 'requires_action') {
            console.log('[payment-form] 3D Secure requis, attente de confirmation utilisateur');
            // Stripe.js gère automatiquement le modal 3D Secure
            // Le résultat sera dans le retour de confirmCardPayment
            // Si on arrive ici, c'est que l'utilisateur a annulé ou le 3DS a échoué
            this.paymentError = 'L\'authentification 3D Secure a échoué ou a été annulée';
            this.isSubmitting = false;
            return;
          }

          console.log('[payment-form] Statut paymentIntent non géré:', paymentIntent.status);
        } else {
          console.log('[payment-form] Pas de clientSecret, statut subscription:', subResponse.status);
        }

        // Si on arrive ici sans avoir redirigé, c'est un échec
        this.paymentError = 'Le paiement n\'a pas pu être confirmé';
        this.isSubmitting = false;
        this.router.navigate(['/donation/payment-failure']);
        return;
      } else {
        // Flux ponctuel (PaymentIntent)
        const response = await this.http.post<{ clientSecret: string }>(
          `${environment.apiUrl}/create-payment-intent`,
          {
            asso: this.assoId,
            amount: Math.round(this.donationAmount * 100), // Stripe attend les centimes
            donationData: {
              nom: this.donationFormData?.lastname || '',
              prenom: this.donationFormData?.firstname || '',
              email: this.donationFormData?.email || '',
              campagne: this.donationFormData?.campagne || this.selectedCampaign,
              siren: this.donationFormData?.siren || '',
              raison: this.donationFormData?.raison || '',
              adresse: this.donationFormData?.address || '',
              ville: this.donationFormData?.city || '',
              code_postal: this.donationFormData?.postal_code || '',
              pays: this.donationFormData?.country || 'France',
              recu: this.donationFormData?.recu || false,
              type: this.donationFormData?.origin || 'ponctuel'
            }
          }
        ).toPromise();

        if (!response?.clientSecret) {
          throw new Error('Pas de client secret reçu du serveur');
        }

        // Confirmer le paiement avec Stripe
        const { error: confirmError, paymentIntent } = await this.stripe.confirmCardPayment(
          response.clientSecret,
          {
            payment_method: paymentMethod.id
          }
        );

        if (confirmError) {
          this.paymentError = this.getStripeErrorMessage(confirmError);
          this.isSubmitting = false;
          // Redirection vers la page d'échec
          this.router.navigate(['/donation/payment-failure']);
          return;
        }

        if (paymentIntent?.status === 'succeeded') {
          // Envoi de l'email de confirmation (fallback si webhook indisponible)
          this.sendConfirmationEmail();
          // Redirection vers la page de remerciement
          window.location.href = this.associationData.ty_link;
        } else {
          this.paymentError = 'Le paiement n\'a pas pu être confirmé';
          this.isSubmitting = false;
          // Redirection vers la page d'échec
          this.router.navigate(['/donation/payment-failure']);
        }
      }

    } catch (error: any) {
      this.paymentError = error.message || 'Une erreur est survenue lors du paiement';
      this.isSubmitting = false;
      // Redirection vers la page d'échec
      this.router.navigate(['/donation/payment-failure']);
    }
  }

  getBankDetails() {
    if (this.isZakatCampaign) {
      return {
        bic: this.associationData?.bic_zakat,
        iban: this.associationData?.iban_zakat,
      };
    }
    return {
      bic: this.associationData?.bic_general,
      iban: this.associationData?.iban_general,
    };
  }

  formatAssoName(name: string): string {
    return name
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  ngOnDestroy() {
    // Clean up Stripe card elements
    if (this.currentElement) {
      if ('number' in this.currentElement) {
        const cardElements = this.currentElement as CardElements;
        cardElements.number?.destroy();
        cardElements.expiry?.destroy();
        cardElements.cvc?.destroy();
      }
    }
    // Clean up IBAN element
    if (this.ibanElement) {
      try {
        this.ibanElement.destroy();
      } catch (error) {
        // Ignore errors when destroying elements
      }
    }
  }
  /**
   * Soumet un don hors ligne (SEPA ou Chèque) au backend
   */
  private async submitOfflineDonation(paymentMethod: 'sepa' | 'cheque') {
    try {
      // Afficher un indicateur de chargement
      this.isSubmitting = true;
      this.paymentError = null;
      this.cdr.detectChanges();

      // Préparer les données à envoyer au backend
      const donationData = {
        asso: this.assoId,
        amount: this.donationAmount,
        campagne: this.donationFormData?.campagne || this.selectedCampaign,
        email: this.donationFormData?.email || '',
        firstname: this.donationFormData?.firstname || '',
        lastname: this.donationFormData?.lastname || '',
        address: this.donationFormData?.address || '',
        city: this.donationFormData?.city || '',
        postal_code: this.donationFormData?.postal_code || '',
        country: this.donationFormData?.country || 'France',
        phone: this.donationFormData?.phone || '',
        siren: this.donationFormData?.siren || '',
        raison: this.donationFormData?.raison || '',
        paymentMethod: paymentMethod
      };

      // Appeler le nouvel endpoint backend
      const response = await this.http.post<{
        success: boolean;
        donationId?: string;
        tracking?: string;
        message?: string;
      }>(`${environment.apiUrl}/offline-donations/save`, donationData).toPromise();

      if (!response) {
        throw new Error('Pas de réponse reçue du serveur');
      }

      if (!response.success) {
        throw new Error(response.message || 'Erreur lors de l\'enregistrement du don');
      }

      // Envoyer l'email de confirmation de promesse de don
      this.sendConfirmationEmail(true);

      // Rediriger vers la page de remerciement
      window.location.href = this.associationData.ty_link;

    } catch (error: any) {
      this.paymentError = error.message || 'Une erreur est survenue lors de l\'enregistrement de votre promesse de don';
      this.isSubmitting = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Envoi direct de l'email de confirmation
   * @param isOfflineDonation Indique si c'est un don hors ligne (SEPA/Chèque)
   */
  private sendConfirmationEmail(isOfflineDonation: boolean = false) {
    const email = this.donationFormData?.email || this.associationData?.email_donateur;
    if (!email) {
      return;
    }

    const prenom = this.donationFormData?.firstname || this.associationData?.name_donateur || '';
    const montant = this.donationAmount || 0;
    const asso =
      this.associationData?.name_asso ||
      this.associationData?.surname_asso ||
      this.assoId ||
      '';
    const campagne =
      this.donationFormData?.campagne ||
      this.selectedCampaign ||
      '';

    // Utiliser le template approprié en fonction du type de don
    const templateId = isOfflineDonation ? 7614888 : 6857507;
    const subject = isOfflineDonation ? "Confirmation de votre promesse de don" : "Confirmation de votre don";

    this.http
      .post(
        `${environment.apiUrl}/send-donation-email`,
        {
          email,
          prenom,
          montant,
          asso,
          campagne,
          templateId,
          subject
        }
      )
      .subscribe({
        next: () => {},
        error: () => {}
      });
  }
}
