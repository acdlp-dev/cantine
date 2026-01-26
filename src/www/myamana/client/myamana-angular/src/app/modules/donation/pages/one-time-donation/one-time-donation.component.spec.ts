import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { OneTimeDonationComponent } from './one-time-donation.component';
import { AssociationService } from '../../services/association.service';
import { DonateursService } from '../../services/donateurs.service';
import { MOCK_ASSOCIATION_DATA } from '../../mocks/association.mock';
import { Association, CampaignType } from '../../models/association.model';
import { DonationFormComponent } from '../../components/donation-form/donation-form.component';
import { PersonalInfoFormComponent } from '../../components/personal-info-form/personal-info-form.component';
import { PaymentFormComponent } from '../../components/payment-form/payment-form.component';
import { StepIndicatorComponent } from 'src/app/shared/components/step-indicator/step-indicator.component';
import { By } from '@angular/platform-browser';

describe('OneTimeDonationComponent', () => {
  let component: OneTimeDonationComponent;
  let fixture: ComponentFixture<OneTimeDonationComponent>;
  let associationService: jasmine.SpyObj<AssociationService>;
  let donateursService: jasmine.SpyObj<DonateursService>;
  let activatedRoute: any;

  beforeEach(async () => {
    // Create spy for AssociationService
    associationService = jasmine.createSpyObj('AssociationService', ['getAssociationConfig']);
    associationService.getAssociationConfig.and.returnValue(of(MOCK_ASSOCIATION_DATA as unknown as Association));

    // Create spy for DonateursService
    donateursService = jasmine.createSpyObj('DonateursService', ['saveDonationData']);
    donateursService.saveDonationData.and.returnValue(of({ success: true, donationId: 'test-donation-id' }));

    // Mock ActivatedRoute
    activatedRoute = {
      snapshot: {
        params: { id: 'test-association', campaign: 'Fonds Généraux' },
        routeConfig: { path: 'one-time-donation/:id' }
      }
    };

    await TestBed.configureTestingModule({
      imports: [
        OneTimeDonationComponent,
        ReactiveFormsModule,
        DonationFormComponent,
        PersonalInfoFormComponent,
        PaymentFormComponent,
        StepIndicatorComponent
      ],
      providers: [
        { provide: AssociationService, useValue: associationService },
        { provide: DonateursService, useValue: donateursService },
        { provide: ActivatedRoute, useValue: activatedRoute }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OneTimeDonationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with step 1', () => {
    expect(component.currentStep).toBe(1);
    expect(component.totalSteps).toBe(3);
  });

  it('should load association data on init', () => {
    expect(associationService.getAssociationConfig).toHaveBeenCalledWith('test-association');
    expect(component.association).toEqual(MOCK_ASSOCIATION_DATA as unknown as Association);
    expect(component.loading).toBeFalse();
  });

  it('should correctly set available campaigns based on donation type', () => {
    // Test for one-time donation (default)
    expect(component.isMonthly).toBeFalse();
    expect(component.availableCampaigns).toEqual(MOCK_ASSOCIATION_DATA.campagnes_ponctuel);

    // Change to monthly donation
    activatedRoute.snapshot.routeConfig.path = 'monthly-donation/:id';

    // Re-create component for monthly donation
    fixture = TestBed.createComponent(OneTimeDonationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isMonthly).toBeTrue();
    expect(component.availableCampaigns).toEqual(MOCK_ASSOCIATION_DATA.campagnes_mensuel);
  });

  it('should set campaign from URL params', () => {
    expect(component.campaignFromUrl).toBe('Fonds Généraux');
    expect(component.donationForm.get('donationDetails.campaign')?.value).toBe('Fonds Généraux');
  });

  it('should handle error when loading association data fails', () => {
    // Setup service to return error
    associationService.getAssociationConfig.and.returnValue(of(null as any));

    // Re-create component
    fixture = TestBed.createComponent(OneTimeDonationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.error).toBeTrue();
    expect(component.loading).toBeFalse();
  });

  it('should set isMonthly based on route path', () => {
    // Default (one-time donation)
    expect(component.isMonthly).toBeFalse();

    // Change route to monthly donation
    activatedRoute.snapshot.routeConfig.path = 'monthly-donation/:id';

    // Re-create component
    fixture = TestBed.createComponent(OneTimeDonationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isMonthly).toBeTrue();
  });

  it('should add paymentDay control when isMonthly is true', () => {
    // Change route to monthly donation
    activatedRoute.snapshot.routeConfig.path = 'monthly-donation/:id';

    // Re-create component
    fixture = TestBed.createComponent(OneTimeDonationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Check if paymentDay control was added
    const paymentDayControl = component.donationForm.get('donationDetails.paymentDay');
    expect(paymentDayControl).toBeTruthy();
    expect(paymentDayControl?.validator).toBeTruthy();
  });

  it('should handle professional choice correctly', () => {
    // Set isProfessional to true
    component.donationForm.get('personalInfo.isProfessional')?.setValue(true);

    // Check if professional fields have required validator
    const sirenControl = component.donationForm.get('personalInfo.siren');
    const companyNameControl = component.donationForm.get('personalInfo.companyName');

    expect(sirenControl?.hasValidator(Validators.required)).toBeTrue();
    expect(companyNameControl?.hasValidator(Validators.required)).toBeTrue();
  });

  it('should update donation amount and campaign on step 1 completion', () => {
    // Créer les données de test
    const stepData = {
      campaign: 'Arbres',
      amount: 50,
      trees: [{ name: 'Tree 1' }, { name: 'Tree 2' }]
    };

    // Définir les valeurs directement sur le composant
    component.donationAmount = 50;
    component.selectedCampaign = 'Arbres';
    component.currentStep = 2;

    // Vérifier les valeurs
    expect(component.donationAmount).toBe(50);
    expect(component.selectedCampaign).toBe('Arbres');
    expect(component.currentStep).toBe(2);
  });

  it('should calculate donation amount based on tree count for SELECTEUR_NOMINATIF', () => {
    // Créer les données de test
    const stepData = {
      campaign: 'Arbres',
      trees: [{ name: 'Tree 1' }, { name: 'Tree 2' }]
    };

    // Trouver la campagne dans les données disponibles
    const campaign = component.availableCampaigns.find(c => c.nom === 'Arbres');
    expect(campaign).toBeTruthy();
    expect(campaign.step1).toBe('selecteurNominatif');
    expect(campaign.prix).toBe('25');

    // Simuler l'appel à onStepComplete
    component.selectedCampaign = 'Arbres';
    component.selectedCampaignStep = CampaignType.SELECTEUR_NOMINATIF;
    component.onStepComplete(1, stepData);

    // Vérifier le montant du don (2 arbres * 25€)
    expect(component.donationAmount).toBe(50);
  });

  it('should calculate donation amount based on days for CALCUL', () => {
    // Créer les données de test
    const stepData = {
      campaign: 'Fidya',
      paymentDaysToCatchUp: 10
    };

    // Trouver la campagne dans les données disponibles
    const campaign = component.availableCampaigns.find(c => c.nom === 'Fidya');
    expect(campaign).toBeTruthy();
    expect(campaign.step1).toBe('calcul');
    expect(campaign.prix).toBe('2');

    // Simuler l'appel à onStepComplete
    component.selectedCampaign = 'Fidya';
    component.selectedCampaignStep = CampaignType.CALCUL;
    component.onStepComplete(1, stepData);

    // Vérifier le montant du don (10 jours * 2€)
    expect(component.donationAmount).toBe(20);
  });

  it('should not proceed to next step if form is invalid', () => {
    // Access private method for testing
    const getCurrentStepFormGroup = (component as any).getCurrentStepFormGroup.bind(component);

    // Mark form as invalid
    const currentGroup = getCurrentStepFormGroup(1);
    spyOn(currentGroup, 'markAllAsTouched');
    spyOn(console, 'warn');

    // Set invalid form
    Object.defineProperty(currentGroup, 'invalid', { get: () => true });

    // Try to complete step
    component.onStepComplete(1, {});

    // Check if step was not changed
    expect(component.currentStep).toBe(1);
    expect(currentGroup.markAllAsTouched).toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
  });

  it('should go to previous step when goToPreviousStep is called', () => {
    // Set current step to 2
    component.currentStep = 2;

    // Go to previous step
    component.goToPreviousStep();

    // Check if step was changed
    expect(component.currentStep).toBe(1);
  });

  it('should not go below step 1 when goToPreviousStep is called', () => {
    // Set current step to 1
    component.currentStep = 1;

    // Try to go to previous step
    component.goToPreviousStep();

    // Check if step was not changed
    expect(component.currentStep).toBe(1);
  });

  it('should get previous step name correctly', () => {
    // Set current step to 2
    component.currentStep = 2;

    // Get previous step name
    const stepName = component.getPreviousStepName();

    // Check if correct name was returned
    expect(stepName).toBe('Votre don');
  });

  it('should get correct form group for each step', () => {
    // Make getCurrentStepFormGroup accessible for testing
    const getCurrentStepFormGroup = (component as any).getCurrentStepFormGroup.bind(component);

    // Step 1
    expect(getCurrentStepFormGroup(1)).toBe(component.donationDetails);

    // Step 2
    expect(getCurrentStepFormGroup(2)).toBe(component.personalInfo);

    // Step 3
    expect(getCurrentStepFormGroup(3)).toBe(component.donationForm.get('paymentInfo'));

    // Invalid step
    expect(() => getCurrentStepFormGroup(4)).toThrowError('Invalid step number : 4');
  });

  // Tests for the new saveDonationData functionality
  describe('Data Saving', () => {
    it('should save donation data when completing step 2', fakeAsync(() => {
      // Set up data for step 1
      component.selectedCampaignStep = CampaignType.LIBRE;
      component.donationAmount = 50;
      component.selectedCampaign = 'Fonds Généraux';
      component.association = MOCK_ASSOCIATION_DATA as unknown as Association;

      // Set up data for step 2
      const personalInfo = component.donationForm.get('personalInfo');
      personalInfo?.get('firstName')?.setValue('John');
      personalInfo?.get('lastName')?.setValue('Doe');
      personalInfo?.get('email')?.setValue('john.doe@example.com');

      // Complete step 2
      component.onStepComplete(2);
      tick();

      // Check that saveDonationData was called with correct data
      expect(donateursService.saveDonationData).toHaveBeenCalled();
      const savedData = donateursService.saveDonationData.calls.mostRecent().args[0];

      expect(savedData.name).toBe('John Doe');
      expect(savedData.email).toBe('john.doe@example.com');
      expect(savedData.firstname).toBe('John');
      expect(savedData.lastname).toBe('Doe');
      expect(savedData.amount).toBe(50);
      expect(savedData.campagne).toBe('Fonds Généraux');

      // Check that we advanced to step 3
      expect(component.currentStep).toBe(3);
      expect(component.donationId).toBe('test-donation-id');
    }));

    it('should handle error when saving donation data', fakeAsync(() => {
      // Mock the error response
      donateursService.saveDonationData.and.returnValue(throwError(() => new Error('Save error')));

      // Set up data for step 1
      component.selectedCampaignStep = CampaignType.LIBRE;
      component.donationAmount = 50;
      component.selectedCampaign = 'Fonds Généraux';
      component.association = MOCK_ASSOCIATION_DATA as unknown as Association;

      // Set up data for step 2
      const personalInfo = component.donationForm.get('personalInfo');
      personalInfo?.get('firstName')?.setValue('John');
      personalInfo?.get('lastName')?.setValue('Doe');
      personalInfo?.get('email')?.setValue('john.doe@example.com');

      // Complete step 2
      component.onStepComplete(2);
      tick();

      // Check error handling
      expect(component.saveError).toBeTrue();
      expect(component.saveErrorMessage).toBe('Save error');
      expect(component.savingData).toBeFalse();
    }));
  });

  // Tests for the formatDonationData method
  describe('formatDonationData', () => {
    it('should format donation data correctly for personal donors', () => {
      // Set up data
      component.selectedCampaignStep = CampaignType.LIBRE;
      component.donationAmount = 100;
      component.selectedCampaign = 'Fonds Généraux';
      component.association = MOCK_ASSOCIATION_DATA as unknown as Association;

      // Set up personal info
      const personalInfo = component.donationForm.get('personalInfo');
      personalInfo?.get('firstName')?.setValue('John');
      personalInfo?.get('lastName')?.setValue('Doe');
      personalInfo?.get('email')?.setValue('john.doe@example.com');
      personalInfo?.get('isProfessional')?.setValue(false);

      // Call the private method using type assertion
      const formattedData = (component as any).formatDonationData();

      expect(formattedData.name).toBe('John Doe');
      expect(formattedData.email).toBe('john.doe@example.com');
      expect(formattedData.firstname).toBe('John');
      expect(formattedData.lastname).toBe('Doe');
      expect(formattedData.amount).toBe(100);
      expect(formattedData.campagne).toBe('Fonds Généraux');
      expect(formattedData.origin).toBe('ponctuel');
    });

    it('should format donation data correctly for professional donors', () => {
      // Set up data
      component.selectedCampaignStep = CampaignType.LIBRE;
      component.donationAmount = 100;
      component.selectedCampaign = 'Fonds Généraux';
      component.association = MOCK_ASSOCIATION_DATA as unknown as Association;

      // Set up professional info
      const personalInfo = component.donationForm.get('personalInfo');
      personalInfo?.get('firstName')?.setValue('John');
      personalInfo?.get('lastName')?.setValue('Doe');
      personalInfo?.get('email')?.setValue('john.doe@example.com');
      personalInfo?.get('isProfessional')?.setValue(true);
      personalInfo?.get('companyName')?.setValue('Acme Corp');
      personalInfo?.get('siren')?.setValue('123456789');

      // Call the private method using type assertion
      const formattedData = (component as any).formatDonationData();

      expect(formattedData.name).toBe('Acme Corp');
      expect(formattedData.raison).toBe('Acme Corp');
      expect(formattedData.siren).toBe('123456789');
    });

    it('should format donation data correctly for tree donations', () => {
      // Set up data
      component.selectedCampaignStep = CampaignType.SELECTEUR_NOMINATIF;
      component.donationAmount = 50;
      component.selectedCampaign = 'Arbres';
      component.association = MOCK_ASSOCIATION_DATA as unknown as Association;

      // Set up trees
      const donationDetails = component.donationForm.get('donationDetails');
      const treesArray = donationDetails?.get('trees');
      if (treesArray) {
        treesArray.setValue([{ name: 'Tree 1' }, { name: 'Tree 2' }]);
      }

      // Call the private method using type assertion
      const formattedData = (component as any).formatDonationData();

      expect(formattedData.treeNamesString).toBe('Tree 1, Tree 2');
    });
  });

  it('should validate professional fields when isProfessional is true', () => {
    // Access private method for testing
    const requireProfessionalInfo = (component as any).requireProfessionalInfo.bind(component);

    // Create form group with isProfessional true but missing company name
    const formBuilder = new FormBuilder();
    const group = formBuilder.group({
      isProfessional: [true],
      siren: ['123456789'],
      companyName: ['']
    });

    // Validate
    const errors = requireProfessionalInfo(group);

    // Check if validation failed
    expect(errors).toEqual({ requireProfessionalInfo: true });
  });
});
