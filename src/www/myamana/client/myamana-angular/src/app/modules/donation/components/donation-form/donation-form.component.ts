import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormArray, FormGroup, FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Campaign, CampaignType } from '../../models/association.model';


@Component({
  selector: 'app-donation-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './donation-form.component.html',
  styleUrl: './donation-form.component.scss',
})
export class DonationFormComponent implements OnInit, OnChanges {
  @Input() campaigns: Campaign[] = [];
  @Input() donationColor: string = '#d7192d';
  @Input() donationDetailsForm!: FormGroup; // Renommé pour plus de clarté
  @Input() defaultCampaign: string | undefined;
  @Input() isMonthly = false;
  @Input() selectedCampaignStep: CampaignType = CampaignType.LIBRE;
  @Input() donationAmount: number = 0;
  @Input() showTaxReduction: boolean = true; // Afficher la phrase de réduction fiscale
  @Output() stepComplete = new EventEmitter<any>();
  @Output() campaignTypeChange = new EventEmitter<CampaignType>();

  constructor(private cdRef: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['donationAmount']) {
      console.log("📊 `donationAmount` mis à jour dans DonationFormComponent :", this.donationAmount);
    }
  }

  trees: FormArray<FormGroup> = new FormArray<FormGroup>([]);
  CampaignType = CampaignType; // ✅ Rendre accessible dans le template



  submitted = false;
  predefinedAmounts = [25, 50, 100];
  unknownDefaultCampaign = false;
  ngOnInit() {
    // Récupération du FormArray dans le form principal
    this.trees = this.donationDetailsForm.get('trees') as FormArray;

    const activeCampaigns = this.campaigns.filter(
      (campaign) => campaign.statut === 'actif'
    );
    if (activeCampaigns.length > 0 && this.donationDetailsForm) {
      this.setDefaultCampaign(activeCampaigns);
    }
    document.documentElement.style.setProperty(
      '--donation-color',
      this.donationColor
    )
    
    // Initialize donation amount from form value
    this.updateDonationAmount();
    
    // Subscribe to amount changes
    const amountControl = this.donationDetailsForm.get('amount');
    if (amountControl) {
      amountControl.valueChanges.subscribe(() => {
        this.updateDonationAmount();
        this.donationDetailsForm.updateValueAndValidity();
      });
    }

    // Subscribe to paymentDaysToCatchUp changes for CALCUL type
    const paymentDaysToCatchUpControl = this.donationDetailsForm.get('paymentDaysToCatchUp');
    if (paymentDaysToCatchUpControl) {
      paymentDaysToCatchUpControl.valueChanges.subscribe(() => {
        if (this.selectedCampaignStep === CampaignType.CALCUL) {
          this.updateDonationAmount();
          this.donationDetailsForm.updateValueAndValidity();
        }
      });
    }

    // Subscribe to trees array changes to update donation amount
    this.trees.valueChanges.subscribe(() => {
      if (this.selectedCampaignStep === CampaignType.SELECTEUR_NOMINATIF) {
        this.updateDonationAmount();
        this.donationDetailsForm.updateValueAndValidity();
      }
    });

    // Subscribe to paymentDay changes for monthly donations
    const paymentDayControl = this.donationDetailsForm.get('paymentDay');
    if (paymentDayControl && this.isMonthly) {
      paymentDayControl.valueChanges.subscribe(() => {
        this.donationDetailsForm.updateValueAndValidity();
      });
    }

    this.checkIfUnknownCampaign();

    this.donationDetailsForm.addControl('trees', this.trees);
  }


  getTreeTypeControl(index: number): FormControl {
    return this.trees.at(index).get('type') as FormControl;
  }
  
  getTreeNameControl(index: number): FormControl {
    return this.trees.at(index).get('name') as FormControl;
  }

  addTree() {
    const newTree = new FormGroup({
        name: new FormControl(''),
    });

    this.trees.push(newTree);
    
    // Update donation amount when a tree is added
    if (this.selectedCampaignStep === CampaignType.SELECTEUR_NOMINATIF) {
      this.updateDonationAmount();
    }
  }

  removeTree(index: number): void {
    this.trees.removeAt(index);
  }
  
  
  updateSelectedCampaignStep() {
    const selectedCampaign = this.donationDetailsForm.get('campaign')?.value;
    const foundCampaign = this.campaigns.find(campagne => campagne.nom === selectedCampaign);

    const previousCampaignType = this.selectedCampaignStep;
    this.selectedCampaignStep = (foundCampaign?.step1 as CampaignType) || CampaignType.LIBRE;

    // Émettre l'événement si le type de campagne a changé
    if (previousCampaignType !== this.selectedCampaignStep) {
      this.campaignTypeChange.emit(this.selectedCampaignStep);
    }

    if (this.selectedCampaignStep === CampaignType.SELECTEUR_NOMINATIF) {
        this.trees.clear();
        this.addTree();
        // Update donation amount after changing to selecteurNominatif
        this.updateDonationAmount();
    } else {
        // For other step types, update with the regular amount
        this.updateDonationAmount();
    }
    
    // Mettre à jour la validité du formulaire après changement de type de campagne
    this.donationDetailsForm.updateValueAndValidity();
  }

  setDefaultCampaign(activeCampaigns: Campaign[]) {
    const currentCampaign = this.donationDetailsForm.get('campaign')?.value;

    if (currentCampaign && activeCampaigns.some(c => c.nom === currentCampaign)) {
        // Si une campagne est déjà sélectionnée, mettre à jour le type de campagne
        this.updateSelectedCampaignStep();
        return;
    }

    if (this.defaultCampaign && this.defaultCampaign.length > 0) {
      const defaultCampaignToSelect = this.campaigns.filter(
        (campaign) => campaign.nom == this.defaultCampaign
      );
      if (defaultCampaignToSelect.length > 0) {
        const campaignControl = this.donationDetailsForm.get('campaign');
        campaignControl?.patchValue(defaultCampaignToSelect[0].nom);
        campaignControl?.disable(); // Disable the control through the form
        
        // Mettre à jour le type de campagne après avoir défini la campagne par défaut
        this.updateSelectedCampaignStep();
      } else {
        this.unknownDefaultCampaign = true;
      }
    } else {
      this.donationDetailsForm.patchValue({
        campaign: activeCampaigns[0].nom,
      });
      
      // Mettre à jour le type de campagne après avoir défini la campagne par défaut
      this.updateSelectedCampaignStep();
    }
  }

  showError(fieldName: string): boolean {
    // Vérifier les erreurs spécifiques du validateur cross-field
    if (this.submitted) {
      if (fieldName === 'amount' && this.selectedCampaignStep === CampaignType.LIBRE) {
        return this.donationDetailsForm.hasError('invalidAmount');
      }
      
      if (fieldName === 'paymentDaysToCatchUp' && this.selectedCampaignStep === CampaignType.CALCUL) {
        return this.donationDetailsForm.hasError('invalidDays');
      }
      
      if (fieldName === 'trees' && this.selectedCampaignStep === CampaignType.SELECTEUR_NOMINATIF) {
        return this.donationDetailsForm.hasError('noTrees') || this.donationDetailsForm.hasError('invalidTreeName');
      }
      
      if (fieldName === 'paymentDay' && this.isMonthly) {
        return this.donationDetailsForm.hasError('invalidPaymentDay');
      }
    }
    
    // Vérification standard pour les autres champs
    const control = this.donationDetailsForm.get(fieldName);
    return control ? control.invalid && this.submitted : false;
  }

  setAmount(amount: number) {
    this.donationDetailsForm.patchValue({ amount });
    this.updateDonationAmount();
  }

  updateDonationAmount() {
    // Get the selected campaign
    const selectedCampaignName = this.donationDetailsForm.get('campaign')?.value;
    const selectedCampaign = this.campaigns.find(campaign => campaign.nom === selectedCampaignName);
    
    if (this.selectedCampaignStep === CampaignType.SELECTEUR_NOMINATIF) {
      if (selectedCampaign && selectedCampaign.prix) {
        // Calculate donation amount based on number of trees and campaign price
        const treeCount = this.trees.length;
        const treePrice = Number(selectedCampaign.prix) || 0;
        this.donationAmount = treeCount * treePrice;
        console.log(`💰 Donation amount updated for trees: ${treeCount} trees x ${treePrice}€ = ${this.donationAmount}€`);
        this.cdRef.detectChanges(); // Force change detection
      }
    } else if (this.selectedCampaignStep === CampaignType.CALCUL) {
      if (selectedCampaign && selectedCampaign.prix) {
        // Calculate donation amount based on days to catch up and campaign price
        const daysControl = this.donationDetailsForm.get('paymentDaysToCatchUp');
        if (daysControl) {
          const days = Number(daysControl.value) || 0;
          const campaignPrice = Number(selectedCampaign.prix) || 0;
          this.donationAmount = days * campaignPrice;
          console.log(`💰 Donation amount updated for CALCUL: ${days} days x ${campaignPrice}€ = ${this.donationAmount}€`);
          this.cdRef.detectChanges(); // Force change detection
        }
      }
    } else {
      const amountControl = this.donationDetailsForm.get('amount');
      if (amountControl) {
        this.donationAmount = Number(amountControl.value) || 0;
        console.log("💰 Donation amount updated:", this.donationAmount);
        this.cdRef.detectChanges(); // Force change detection
      }
    }
  }

  onSubmit() {
    this.submitted = true;
    this.unknownDefaultCampaign = false;

    if (this.donationDetailsForm.valid) {
      this.stepComplete.emit(this.donationDetailsForm.getRawValue());
    }
  }

  // Prevent non-numeric input
  onAmountKeyPress(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  checkIfUnknownCampaign() {
    return (
      this.unknownDefaultCampaign &&
      this.donationDetailsForm.get('campaign')?.value.length == 0
    );
  }
}
