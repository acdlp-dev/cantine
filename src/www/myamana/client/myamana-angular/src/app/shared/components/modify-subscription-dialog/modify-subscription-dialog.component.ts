import { Component, ElementRef, EventEmitter, Input, OnInit, AfterViewInit, Output, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Stripe, loadStripe } from '@stripe/stripe-js';
import { DonsService } from '../../../modules/dashboard/services/dons.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCcVisa, faCcAmex } from '@fortawesome/free-brands-svg-icons';
import { faUniversity, faCreditCard } from '@fortawesome/free-solid-svg-icons';

interface ModifyFormData {
  amount: number;
  billingDay: number;
  firstName: string;
  lastName: string;
  email: string;
}

type PaymentType = 'card' | 'sepa' | null;

interface CardElements {
  number: any;
  expiry: any;
  cvc: any;
}

@Component({
  selector: 'app-modify-subscription-dialog',
  templateUrl: './modify-subscription-dialog.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, FontAwesomeModule],
})
export class ModifySubscriptionDialogComponent implements OnInit, AfterViewInit {
  @Input() currentAmount!: number;
  @Input() asso!: string;
  @Output() onConfirm = new EventEmitter<{
    amount: number;
    billingDay: number;
    paymentMethod?: string;
    paymentType?: string;
  }>();
  @Output() onClose = new EventEmitter<void>();

  @ViewChild('cardElement', { static: true }) cardElement!: ElementRef;
  @ViewChild('sepaElement', { static: true }) sepaElement!: ElementRef;

  modifyForm: FormGroup;

  @Input() nft!: {
    email: string;
    firstName: string;
    lastName: string;
    occurence: 'mensuel' | 'quotidien';
    recurrence: string;
    moyen?: 'IBAN' | 'CB';
    last4?: string;
    brand?: 'visa' | 'mastercard' | 'american-express' | 'carte-bancaire';
    expirationCB?: string;
  };

  formatAssoName(name: string): string {
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private formatExpirationDate(date: string | undefined): string {
    console.log('Date d\'expiration reçue:', date);
    if (!date) {
      console.log('Pas de date d\'expiration');
      return '';
    }
    // Convertir de YYYY-MM-DD à MM/YY
    const [year, month] = date.split('-');
    const formatted = `${month}/${year.slice(2)}`;
    console.log('Date formatée:', formatted);
    return formatted;
  }

  // Font Awesome icons
  faVisa = faCcVisa;
  faAmex = faCcAmex;
  faIban = faUniversity;
  faCard = faCreditCard;

  stripe: Stripe | null = null;
  elements: any = null;
  currentElement: any | CardElements = null;
  paymentError: string | null = null;
  isSubmitting = false;
  viewInitialized = false;
  // Variable pour suivre si l'utilisateur a modifié le moyen de paiement
  private paymentMethodModified = false;

  constructor(
    private donsService: DonsService,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder
  ) {
    this.modifyForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(1)]],
      billingDay: ['', [Validators.required, Validators.min(1), Validators.max(28)]],
      email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
      paymentType: [null, Validators.required]
    });

    // Désactiver initialement le champ paymentType
    this.modifyForm.get('paymentType')?.disable();

    // Observer les changements des champs obligatoires
    this.modifyForm.valueChanges.subscribe(() => {
      this.updateFormValidity();
    });
  }

  async ngOnInit() {
    console.log('ModifySubscriptionDialog initialized', this.nft);
    // Toujours initialiser avec SEPA
    this.modifyForm.patchValue({
      amount: this.currentAmount,
      billingDay: parseInt(this.nft.recurrence) || 1,
      email: this.nft.email,
      paymentType: 'sepa'
    });

    try {
      console.log('Getting Stripe public key for:', this.asso);
      const publicKey = await this.donsService.getStripePublicKey(this.asso).toPromise();
      if (!publicKey) {
        throw new Error('Impossible de récupérer la clé publique Stripe');
      }

      console.log('Initializing Stripe with public key');
      this.stripe = await loadStripe(publicKey);
      if (this.stripe) {
        this.elements = this.stripe.elements();
        console.log('Stripe elements created');
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de Stripe:', error);
      this.paymentError = 'Erreur lors de l\'initialisation du formulaire de paiement';
    }
  }

  async ngAfterViewInit() {
    console.log('View initialized');
    this.viewInitialized = true;

    // Attendre que Stripe et les éléments soient initialisés
    let attempts = 0;
    while (!this.elements && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (this.elements) {
      await this.initializePaymentElement('sepa');
      // Activer le type de paiement une fois l'élément initialisé
      this.modifyForm.get('paymentType')?.enable({ emitEvent: false });
      this.cdr.detectChanges();
    }
  }

  private async waitForElement(elementRef: ElementRef | null, maxAttempts = 10): Promise<boolean> {
    let attempts = 0;
    while (attempts < maxAttempts) {
      if (elementRef?.nativeElement) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    return false;
  }

  async initializePaymentElement(type: PaymentType) {
    console.log('Initializing payment element:', type);
    console.log('Stripe:', !!this.stripe);
    console.log('Elements:', !!this.elements);
    console.log('View initialized:', this.viewInitialized);

    // Attendre que l'élément soit disponible dans le DOM
    const elementAvailable = await this.waitForElement(
      type === 'card' ? this.cardElement : this.sepaElement
    );

    if (!elementAvailable) {
      console.error(`${type} element not available after waiting`);
      this.paymentError = 'Erreur lors de l\'initialisation du formulaire de paiement';
      return;
    }

    console.log('Card element:', !!this.cardElement?.nativeElement);
    console.log('SEPA element:', !!this.sepaElement?.nativeElement);

    if (!this.stripe || !this.elements || !this.viewInitialized) {
      console.log('Missing required elements for initialization');
      return;
    }

    // Vérifier que les éléments du DOM sont présents
    if (type === 'card' && !this.cardElement?.nativeElement) {
      console.error('Card element not found in DOM');
      return;
    }
    if (type === 'sepa' && !this.sepaElement?.nativeElement) {
      console.error('SEPA element not found in DOM');
      return;
    }

    // Détruit l'élément existant
    if (this.currentElement) {
      console.log('Destroying existing element');
      try {
        if ('number' in this.currentElement) {
          // Si c'est un élément de carte, détruire chaque sous-élément
          const cardElements = this.currentElement as CardElements;
          cardElements.number?.destroy();
          cardElements.expiry?.destroy();
          cardElements.cvc?.destroy();
        } else if (typeof this.currentElement.destroy === 'function') {
          // Si c'est un élément SEPA
          this.currentElement.destroy();
        }
        this.currentElement = null;
        console.log('Element destroyed successfully');
      } catch (error) {
        console.error('Error destroying element:', error);
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
      // Crée l'élément approprié
      if (type === 'card' && this.cardElement) {
        console.log('Creating card elements', {
          last4: this.nft.last4,
          expirationCB: this.nft.expirationCB
        });
        const elements: CardElements = {
          number: this.elements.create('cardNumber', elementOptions),
          expiry: this.elements.create('cardExpiry', elementOptions),
          cvc: this.elements.create('cardCvc', elementOptions)
        };

        // Monter les éléments
        elements.number.mount('#card-number');
        elements.expiry.mount('#card-expiry');
        elements.cvc.mount('#card-cvc');

        // Gestion des erreurs pour chaque élément
        Object.values(elements).forEach(element => {
          element.on('change', (event: any) => {
            if (event.error) {
              this.paymentError = event.error.message;
            } else {
              this.paymentError = null;
            }
            // Si l'utilisateur a commencé à saisir des informations, on considère qu'il modifie le moyen de paiement
            if (event.complete || event.value) {
              this.paymentMethodModified = true;
            }
            this.cdr.detectChanges();
          });
        });

        this.currentElement = elements;
      } else if (type === 'sepa' && this.sepaElement) {
        console.log('Creating SEPA element', {
          currentMoyen: this.nft.moyen,
          last4: this.nft.last4
        });

        // Créer l'élément IBAN
        const ibanOptions = {
          supportedCountries: ['SEPA'],
          placeholderCountry: 'FR',
          style: {
            base: {
              color: '#32325d',
              fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
              fontSize: '16px',
              '::placeholder': {
                color: '#aab7c4'
              }
            },
            invalid: {
              color: '#fa755a'
            }
          }
        };

        // Créer et monter l'élément IBAN
        this.currentElement = this.elements.create('iban', ibanOptions);
        this.currentElement.mount(this.sepaElement.nativeElement);

        this.currentElement.on('change', (event: any) => {
          this.paymentError = event.error ? event.error.message : null;
          // Si l'utilisateur a commencé à saisir des informations, on considère qu'il modifie le moyen de paiement
          if (event.complete || event.value) {
            this.paymentMethodModified = true;
          }
          this.cdr.detectChanges();
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de l\'élément de paiement:', error);
      this.paymentError = 'Erreur lors de l\'initialisation du formulaire de paiement';
      this.cdr.detectChanges();
    }
  }

  // Propriété pour la validité du formulaire
  isFormValid = false;

  private updateFormValidity() {
    const amount = this.modifyForm.get('amount');
    this.isFormValid = !!amount?.valid;
  }

  setPaymentType(type: PaymentType) {
    if (!this.isFormValid) return;
    
    this.paymentMethodModified = true;
    this.modifyForm.patchValue({ paymentType: type });
    this.initializePaymentElement(type);
  }

  async onPaymentTypeChange() {
    const paymentType = this.modifyForm.get('paymentType')?.value;
    console.log('Payment type changed to:', paymentType);
    if (paymentType) {
      this.paymentMethodModified = true;
      // Attendre le prochain cycle de détection des changements
      setTimeout(async () => {
        // Attendre que Stripe soit initialisé si nécessaire
        let attempts = 0;
        while (!this.stripe && attempts < 10) {
          console.log('Waiting for Stripe initialization...');
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
        }

        if (!this.stripe) {
          console.error('Stripe initialization timeout');
          this.paymentError = 'Erreur lors de l\'initialisation du formulaire de paiement';
          return;
        }

        this.initializePaymentElement(paymentType);
      });
    }
  }

  async onSubmit() {
    const paymentType = this.modifyForm.get('paymentType')?.value;
    const formValue = this.modifyForm.value;

    // Vérifier quels champs ont été modifiés
    const changes: any = {};
    
    if (formValue.amount !== this.currentAmount) {
      changes.amount = formValue.amount;
    }
    
    if (formValue.billingDay !== parseInt(this.nft.recurrence)) {
      changes.billingDay = formValue.billingDay;
    }

    // Si le moyen de paiement n'a pas été modifié, on émet uniquement les champs modifiés
    if (!this.paymentMethodModified) {
      if (Object.keys(changes).length > 0) {
        this.onConfirm.emit(changes);
      } else {
        this.onClose.emit();
      }
      return;
    }

    // Sinon, on procède à la création d'une nouvelle méthode de paiement
    if (!this.stripe || !this.currentElement || !paymentType) {
      console.log('Missing required elements for submission');
      return;
    }

    this.isSubmitting = true;
    let paymentMethod: string | undefined;

    try {
      let result;
      const billingDetails = {
        name: `${this.nft.firstName} ${this.nft.lastName}`,
        email: this.nft.email,
      };

      if (paymentType === 'sepa') {
        console.log('Creating SEPA payment method');
        result = await this.stripe.createPaymentMethod({
          type: 'sepa_debit',
          sepa_debit: this.currentElement,
          billing_details: billingDetails,
        });
      } else {
        console.log('Creating card payment method');
        const elements = this.currentElement as CardElements;
        result = await this.stripe.createPaymentMethod({
          type: 'card',
          card: elements.number,
          billing_details: billingDetails,
        });
      }

      const { paymentMethod: stripePaymentMethod, error } = result;

      if (error) {
        console.error('Payment method creation error:', error);
        this.paymentError = error.message || 'Une erreur est survenue';
        this.isSubmitting = false;
        return;
      }

      if (stripePaymentMethod) {
        paymentMethod = stripePaymentMethod.id;
        console.log('Payment method created:', paymentMethod);
      }

      // Ajouter le nouveau moyen de paiement aux changements
      this.onConfirm.emit({
        ...changes,
        paymentMethod,
        paymentType: paymentType
      });
      // Ne pas désactiver isSubmitting ici, le parent fermera le dialogue
      // lorsque le traitement sera terminé
    } catch (error) {
      console.error('Payment submission error:', error);
      this.paymentError = 'Une erreur est survenue lors du traitement de votre moyen de paiement';
      // En cas d'erreur, on désactive le loader pour permettre à l'utilisateur de corriger
      this.isSubmitting = false;
      this.cdr.detectChanges();
    }
  }

  onCancel() {
    this.onClose.emit();
  }

  private resetPaymentElement() {
    if (this.currentElement) {
      if ('number' in this.currentElement) {
        // Si c'est un élément de carte, détruire chaque sous-élément
        const cardElements = this.currentElement as CardElements;
        cardElements.number?.destroy();
        cardElements.expiry?.destroy();
        cardElements.cvc?.destroy();
      } else if (typeof this.currentElement.destroy === 'function') {
        // Si c'est un élément SEPA
        this.currentElement.destroy();
      }
      this.currentElement = null;
    }
    this.modifyForm.patchValue({ paymentType: null });
    this.paymentError = null;
  }

  ngOnDestroy() {
    if (this.currentElement) {
      if ('number' in this.currentElement) {
        // Si c'est un élément de carte, détruire chaque sous-élément
        const cardElements = this.currentElement as CardElements;
        cardElements.number?.destroy();
        cardElements.expiry?.destroy();
        cardElements.cvc?.destroy();
      } else if (typeof this.currentElement.destroy === 'function') {
        // Si c'est un élément SEPA
        this.currentElement.destroy();
      }
    }
  }
}
