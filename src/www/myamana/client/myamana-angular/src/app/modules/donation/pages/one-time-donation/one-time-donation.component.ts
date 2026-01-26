import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
  AbstractControl,
  ValidatorFn,
  FormArray,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { StepIndicatorComponent } from 'src/app/shared/components/step-indicator/step-indicator.component';
import { DonationFormComponent } from '../../components/donation-form/donation-form.component';
import { PaymentFormComponent } from '../../components/payment-form/payment-form.component';
import { PersonalInfoFormComponent } from '../../components/personal-info-form/personal-info-form.component';
import { Association, AddressRule, CampaignType } from '../../models/association.model';
import { DonationFormData } from '../../models/donation.model';
import { AssociationService } from '../../services/association.service';
import { DonateursService } from '../../services/donateurs.service';
import { Step } from 'src/app/shared/models/step.interface';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-one-time-donation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    StepIndicatorComponent,
    DonationFormComponent,
    PersonalInfoFormComponent,
    PaymentFormComponent,
  ],
  templateUrl: './one-time-donation.component.html',
  styleUrl: './one-time-donation.component.scss',
})
export class OneTimeDonationComponent implements OnInit, OnDestroy {
  currentStep = 1;
  totalSteps = 3;
  donationAmount: number = 0;
  selectedCampaign: string = '';
  selectedProductId: string = '';
  association?: Association;
  loading = true;
  error = false;
  workflowData?: Partial<DonationFormData>;
  isZakatCampaign: boolean = false;
  donationForm: FormGroup;
  campaignFromUrl = '';
  isMonthly = false;

  availableCampaigns: any[] = [];
  selectedCampaignStep: CampaignType = CampaignType.LIBRE;
  assoId ='';

  // Typewriter configuration
  quote = '« Ceux qui gardent scrupuleusement ce qu\'on leur a confié en dépôt et qui respectent leurs engagements »';
  quoteReference = '[Al-Ma\'âaridj : 32]';
  typewriterWords = ['associations', 'bénévoles', 'donateurs'];
  currentWord = '';
  private wordIndex = 0;
  private charIndex = 0;
  private isDeleting = false;
  private typingSpeed = 100;
  private deletingSpeed = 50;
  private pauseTime = 2000;
  private typewriterTimeoutId: any;

  private readonly steps: Step[] = [
    { number: 1, name: 'Votre don' },
    { number: 2, name: 'Infos' },
    { number: 3, name: 'Paiement' },
  ];

  constructor(
    private route: ActivatedRoute,
    private associationService: AssociationService,
    private donateursService: DonateursService,
    private fb: FormBuilder
  ) {
    this.donationForm = this.fb.group({
      donationDetails: this.fb.group({
        campaign: ['', Validators.required],
        paymentDaysToCatchUp: [''],
        trees: this.fb.array([]),
        amount: [
          ''
        ],
        paymentDay: [
          '', 
          [Validators.min(1), Validators.max(28)] 
        ], 
      }),
      personalInfo: this.fb.group(
        {
          firstName: ['', Validators.required],
          lastName: ['', Validators.required],
          email: [
            '',
            [
              Validators.required,
              Validators.pattern(
                /^(?=.{1,64}@.{1,255}$)([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9-]+.)+[a-zA-Z]{2,}$/
              ),
            ],
          ],
          isProfessional: [false],
          siren: [''],
          companyName: [''],
          address: ['', Validators.required],
          city: ['', Validators.required],
          postalCode: ['', Validators.required],
          country: ['France'],
        },
        {
          validators: [
            this.requireProfessionalInfo,
          ],
        }
      ),
      paymentInfo: this.fb.group({}),
    });
  }
  ngOnInit(): void {
    // Start typewriter effect
    this.typeWriter();

    const currentPath = this.route.snapshot.routeConfig?.path;
    this.isMonthly = currentPath?.includes('monthly-donation') || false; 

    if (this.isMonthly) {
      const donationDetails = this.donationForm.get('donationDetails') as FormGroup;
      donationDetails.addControl(
        'paymentDay',
        this.fb.control('', [Validators.required, Validators.min(1), Validators.max(28)])
      );
    }
    
    const donationDetails = this.donationForm.get('donationDetails') as FormGroup;
    donationDetails.addControl('trees', this.fb.array([]));
    donationDetails.addControl('paymentDaysToCatchUp', this.fb.control(''));
    
    // Appliquer le validateur cross-field au groupe donationDetails
    donationDetails.setValidators(
      this.campaignFieldsValidator(
        () => this.selectedCampaignStep,
        () => this.isMonthly
      )
    );


    this.campaignFromUrl = this.route.snapshot.params['campaign'];
    this.assoId = this.route.snapshot.params['id'] || 'default-association-id';

    this.associationService.getAssociationConfig(this.assoId).subscribe({
      next: (data) => {
        this.association = data;

        // Initialiser les campagnes disponibles après le chargement des données d'association
        const isMonthly = this.isMonthly;

        // Vérifier que les campagnes existent et sont des tableaux
        if (!this.association.campagnes_ponctuel || !Array.isArray(this.association.campagnes_ponctuel)) {
          this.association.campagnes_ponctuel = [];
        }

        if (!this.association.campagnes_mensuel || !Array.isArray(this.association.campagnes_mensuel)) {
          this.association.campagnes_mensuel = [];
        }

        this.availableCampaigns = isMonthly ? this.association.campagnes_mensuel : this.association.campagnes_ponctuel;

        if (this.campaignFromUrl) {
          this.donationForm
            .get('donationDetails.campaign')
            ?.setValue(this.campaignFromUrl);
        }
        
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
        
        // Initialiser avec des tableaux vides pour éviter les erreurs
        this.availableCampaigns = [];
        
        // Afficher une alerte pour informer l'utilisateur
        alert('Erreur lors du chargement des données de l\'association. Veuillez réessayer plus tard.');
      },
    });
    
    this.handleProfessionalChoice();
  }

  // Handling dynamic values for `isProfessional` checkbox
  handleProfessionalChoice() {
    this.donationForm
      .get('personalInfo.isProfessional')
      ?.valueChanges.subscribe((isProfessional) => {
        const personalInfoGroup = this.donationForm.get(
          'personalInfo'
        ) as FormGroup;

        if (isProfessional) {
          personalInfoGroup.get('siren')?.setValidators(Validators.required);
          personalInfoGroup
            .get('companyName')
            ?.setValidators(Validators.required);
        } else {
          personalInfoGroup.get('siren')?.clearValidators();
          personalInfoGroup.get('companyName')?.clearValidators();
        }

        personalInfoGroup.get('siren')?.updateValueAndValidity();
        personalInfoGroup.get('companyName')?.updateValueAndValidity();
      }
    );
  }

  onCampaignTypeChange(campaignType: CampaignType): void {
    this.selectedCampaignStep = campaignType;
    
    // Mettre à jour la validité du formulaire après changement de type de campagne
    const donationDetails = this.donationForm.get('donationDetails') as FormGroup;
    donationDetails.updateValueAndValidity();
  }

  // Propriétés pour gérer l'état de l'envoi des données
  savingData = false;
  saveError = false;
  saveErrorMessage = '';
  donationId = '';
  donationFormData?: DonationFormData; // Données du Step 2 pour le Step 3

  onStepComplete(step: number, data?: any): void {
    const currentGroup = this.getCurrentStepFormGroup(step);

    if (currentGroup.invalid) {
      currentGroup.markAllAsTouched();
      return;
    }

    if (step === 1 && data) {
        this.donationAmount = data.amount;
        this.selectedCampaign = data.campaign;

        // Récupération de la campagne et du prix unitaire
        const selectedCampaignData = this.availableCampaigns.find(c => c.nom === this.selectedCampaign);
        this.selectedCampaignStep = selectedCampaignData?.step1 || 'libre';
        const unitPrice = selectedCampaignData?.prix ? Number(selectedCampaignData.prix) : 0;

        // Stocker le productId de la campagne sélectionnée
        this.selectedProductId = selectedCampaignData?.id_product || '';

        // Vérification du type de campagne et mise à jour du montant
        if (this.selectedCampaignStep === CampaignType.CALCUL) {
            this.donationAmount = (data.paymentDaysToCatchUp || 0) * unitPrice;
        }
        else if (this.selectedCampaignStep === CampaignType.SELECTEUR_NOMINATIF) {
            const treeCount = data.trees?.length || 0;
            this.donationAmount = treeCount * unitPrice;
        }

        // Si mensuel, propager le jour de prélèvement pour l’étape 3
        if (this.isMonthly && data.paymentDay !== undefined) {
          this.workflowData = { ...this.workflowData, paymentDay: data.paymentDay };
        }
    }
    
    // À la fin de l'étape 2, envoyer les données au backend
    if (step === 2) {
      this.saveDonationData();
    }

    if (step < this.totalSteps) {
        this.currentStep++;
    }
}

/**
 * Envoie les données du formulaire au backend
 */
private saveDonationData(): void {
  // Réinitialiser les états d'erreur
  this.saveError = false;
  this.saveErrorMessage = '';
  
  // Indiquer que l'envoi est en cours
  this.savingData = true;
  
  // Formater les données du formulaire selon la structure attendue par le backend
  const donationData = this.formatDonationData();

  // Stocker les données pour le Step 3 (paiement)
  this.donationFormData = donationData;

  // Envoyer les données au backend
  this.donateursService.saveDonationData(donationData)
    .pipe(
      finalize(() => {
        this.savingData = false;
      })
    )
    .subscribe({
      next: (response) => {
        if (response.donationId) {
          this.donationId = response.donationId;
        }
        if (response.tracking) {
          // enrichir associationData avec l'UUID de don (stocké dans un cast any pour éviter les erreurs de type)
          (this.association as any) = { ...(this.association as any), donationUuid: response.tracking };
        }
      },
      error: (error) => {
        this.saveError = true;
        this.saveErrorMessage = error.message || 'Une erreur est survenue lors de l\'enregistrement des données.';
        
        // Afficher une alerte pour informer l'utilisateur
        alert('Erreur lors de l\'enregistrement des données: ' + this.saveErrorMessage);
      }
    });
}

/**
 * Formate les données du formulaire selon la structure attendue par le backend
 */
  private formatDonationData(): DonationFormData {
  const formValue = this.donationForm.value;
  const personalInfo = formValue.personalInfo;
  const donationDetails = formValue.donationDetails;

  // Récupérer les noms des arbres si c'est une campagne de type SELECTEUR_NOMINATIF
  let treeNamesString = '';
  if (this.selectedCampaignStep === CampaignType.SELECTEUR_NOMINATIF && donationDetails.trees) {
    const treeNames = donationDetails.trees.map((tree: any) => tree.name);
    treeNamesString = treeNames.join(', ');
  }

  // Utiliser le productId stocké à l'étape 1
  const productId = this.selectedProductId || undefined;

  return {
    name: personalInfo.isProfessional ? personalInfo.companyName : `${personalInfo.firstName} ${personalInfo.lastName}`,
    email: personalInfo.email,
    firstname: personalInfo.firstName,
    lastname: personalInfo.lastName,
    address: personalInfo.address || '',
    raison: personalInfo.isProfessional ? personalInfo.companyName : '',
    siren: personalInfo.isProfessional ? personalInfo.siren : '',
    amount: this.donationAmount,
    payment_method_types: 'card', // Par défaut, peut être modifié à l'étape 3
    campagne: this.selectedCampaign,
    city: personalInfo.city || '',
    country: personalInfo.country || 'France',
    line1: personalInfo.address || '',
    postal_code: personalInfo.postalCode || '',
    recu: personalInfo.wantReceipt || false,
    asso: this.association?.name_asso || '',
    origin: this.isMonthly ? 'mensuel' : 'ponctuel',
    paymentDay: this.isMonthly ? donationDetails.paymentDay : undefined,
    treeNamesString: treeNamesString,
    productId: productId
  };
}

  goToPreviousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  getPreviousStepName(): string {
    const previousStep = this.steps.find(
      (step) => step.number === this.currentStep - 1
    );
    return previousStep?.name || '';
  }

  private getCurrentStepFormGroup(step: number): FormGroup {
    switch (step) {
      case 1:
        return this.donationForm.get('donationDetails') as FormGroup;
      case 2:
        return this.donationForm.get('personalInfo') as FormGroup;
      case 3:
        return this.donationForm.get('paymentInfo') as FormGroup;
      default:
        throw new Error(`Invalid step number : ${step}`);
    }
  }

  getFormData(): any {
    return this.donationForm.value;
  }

  get donationDetails(): FormGroup {
    return this.donationForm.get('donationDetails') as FormGroup;
  }

  get personalInfo(): FormGroup {
    return this.donationForm.get('personalInfo') as FormGroup;
  }

  requireProfessionalInfo(group: FormGroup): ValidationErrors | null {
    const isProfessional = group.get('isProfessional')?.value;
    const siren = group.get('siren')?.value;
    const companyName = group.get('companyName')?.value;

    if (isProfessional && (!siren || !companyName)) {
      return { requireProfessionalInfo: true };
    }
    return null;
  }

  // Validateur cross-field pour vérifier les champs requis en fonction du type de campagne
 campaignFieldsValidator(campaignTypeAccessor: () => CampaignType, isMonthlyAccessor: () => boolean): ValidatorFn {
  return (formGroup: AbstractControl): ValidationErrors | null => {
    const campaignType = campaignTypeAccessor();
    const isMonthly = isMonthlyAccessor();
    const errors: ValidationErrors = {};
    
    // Vérifier les champs selon le type de campagne
    if (campaignType === CampaignType.LIBRE) {
      const amount = formGroup.get('amount')?.value;
      if (!amount || amount <= 0) {
        errors['invalidAmount'] = true;
      }
    } 
    else if (campaignType === CampaignType.CALCUL) {
      const days = formGroup.get('paymentDaysToCatchUp')?.value;
      if (!days || days <= 0) {
        errors['invalidDays'] = true;
      }
    } 
    else if (campaignType === CampaignType.SELECTEUR_NOMINATIF) {
      const trees = formGroup.get('trees') as FormArray;
      if (!trees || trees.length === 0) {
        errors['noTrees'] = true;
      } else {
        // Vérifier que chaque arbre a un nom
        const invalidTree = trees.controls.some(tree => !tree.get('name')?.value);
        if (invalidTree) {
          errors['invalidTreeName'] = true;
        }
      }
    }
    
    // Vérifier le jour de prélèvement pour les dons mensuels
    if (isMonthly) {
      const paymentDay = formGroup.get('paymentDay')?.value;
      if (!paymentDay || paymentDay < 1 || paymentDay > 28) {
        errors['invalidPaymentDay'] = true;
      }
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
  };
}

  ngOnDestroy(): void {
    if (this.typewriterTimeoutId) {
      clearTimeout(this.typewriterTimeoutId);
    }
  }

  private typeWriter(): void {
    const currentFullWord = this.typewriterWords[this.wordIndex];

    if (this.isDeleting) {
      this.currentWord = currentFullWord.substring(0, this.charIndex - 1);
      this.charIndex--;
    } else {
      this.currentWord = currentFullWord.substring(0, this.charIndex + 1);
      this.charIndex++;
    }

    let delay = this.isDeleting ? this.deletingSpeed : this.typingSpeed;

    if (!this.isDeleting && this.charIndex === currentFullWord.length) {
      delay = this.pauseTime;
      this.isDeleting = true;
    } else if (this.isDeleting && this.charIndex === 0) {
      this.isDeleting = false;
      this.wordIndex = (this.wordIndex + 1) % this.typewriterWords.length;
      delay = 500;
    }

    this.typewriterTimeoutId = setTimeout(() => this.typeWriter(), delay);
  }
}
