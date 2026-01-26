import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { DonateursService } from '../../services/donateurs.service';
import { debounceTime, distinctUntilChanged, Subscription } from 'rxjs';
import { FormsModule, ReactiveFormsModule, FormGroup, Validators, FormArray, FormControl, AbstractControl, ValidatorFn } from '@angular/forms';
import { DonationFormData } from '../../models/donation.model';

declare const google: any;

@Component({
  selector: 'app-personal-info-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './personal-info-form.component.html',
  styleUrl: './personal-info-form.component.scss',
})
export class PersonalInfoFormComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('addressInput') addressInput!: ElementRef;
  @Input() donationAmount: number = 0;
  @Input() selectedCampaign: string = '';
  @Input() donationColor: string = '#d7192d';
  @Input() display_pro: string | undefined;
  @Input() personalInfoForm!: FormGroup;
  @Output() stepComplete = new EventEmitter<DonationFormData>();

  submitted = false;
  private sirenSubscription?: Subscription;
  private autocomplete: any;

  constructor(private donateursService: DonateursService) {}

  ngOnInit(): void {
    this.setupEmailValidation();
    this.setupSirenListener();
    this.setupProfessionalListener();
    this.setupTheme();
  }

  /**
   * Valideur personnalisé pour les emails utilisant le même pattern que le backend
   */
  private emailValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (!control.value) {
        return null; // La validation "required" sera gérée séparément
      }

      // Même regex que le backend pour la cohérence - RFC 5322 stricte
      const emailRegex = /^(?=.{1,64}@.{1,255}$)([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
      const isValid = emailRegex.test(control.value);

      return isValid ? null : { invalidEmail: { value: control.value } };
    };
  }

  /**
   * Applique la validation d'email au champ email du formulaire
   */
  private setupEmailValidation(): void {
    const emailControl = this.personalInfoForm.get('email');
    if (emailControl) {
      // Conserver le validateur required existant et ajouter notre validateur d'email
      const validators = [
        Validators.required,
        this.emailValidator()
      ];
      emailControl.setValidators(validators);
      emailControl.updateValueAndValidity();
    }
  }

  getFormControl(control: any): FormControl {
    return control as FormControl;
  }

  ngAfterViewInit(): void {
    this.initGooglePlacesAutocomplete();
  }

  ngOnDestroy(): void {
    if (this.sirenSubscription) {
      this.sirenSubscription.unsubscribe();
    }
  }

  private setupTheme(): void {
    document.documentElement.style.setProperty('--donation-color', this.donationColor);
  }

  private setupProfessionalListener(): void {
    this.personalInfoForm.get('isProfessional')?.valueChanges.subscribe((value) => {
      const siren = this.personalInfoForm.get('siren');
      const companyName = this.personalInfoForm.get('companyName');
      if (value) {
        siren?.setValidators(Validators.required);
        companyName?.setValidators(Validators.required);
      } else {
        siren?.clearValidators();
        companyName?.clearValidators();
        siren?.setValue('');
        companyName?.setValue('');
      }
      siren?.updateValueAndValidity();
      companyName?.updateValueAndValidity();
    });
  }

  private setupSirenListener(): void {
    const sirenControl = this.personalInfoForm.get('siren');
    if (sirenControl) {
      this.sirenSubscription = sirenControl.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged()
      ).subscribe(siren => {
        if (siren && siren.length === 9) {
          this.donateursService.getLegalName(siren).subscribe({
            next: (legalName) => {
              this.personalInfoForm.patchValue({ companyName: legalName });
            },
            error: () => {}
          });
        }
      });
    }
  }

  private initGooglePlacesAutocomplete(): void {
    if (!this.addressInput) return;

    try {
      if (typeof google !== 'undefined' && google.maps && google.maps.places) {
        this.autocomplete = new google.maps.places.Autocomplete(
          this.addressInput.nativeElement,
          {
            componentRestrictions: { country: 'FR' },
            fields: ['address_components', 'formatted_address'],
            types: ['address']
          }
        );

        this.autocomplete.addListener('place_changed', () => {
          const place = this.autocomplete.getPlace();

          if (place.address_components) {
            let postalCode = '';
            let city = '';
            let streetNumber = '';
            let street = '';

            for (const component of place.address_components) {
              const componentType = component.types[0];

              if (componentType === 'postal_code') {
                postalCode = component.long_name;
              } else if (componentType === 'locality') {
                city = component.long_name;
              } else if (componentType === 'street_number') {
                streetNumber = component.long_name;
              } else if (componentType === 'route') {
                street = component.long_name;
              }
            }

            const addressLine1 = streetNumber && street ? `${streetNumber} ${street}` : street;

            this.personalInfoForm.patchValue({
              address: place.formatted_address || addressLine1,
              postalCode: postalCode,
              city: city,
              country: 'France'
            });
          }
        });
      }
    } catch (err) {
      // Ignore errors when initializing Google Places
    }
  }

  showError(fieldName: string): boolean {
    const control = this.personalInfoForm.get(fieldName);
    return control ? control.invalid && this.submitted : false;
  }

  getEmailErrorMessage(): string {
    const control = this.personalInfoForm.get('email');
    if (control?.hasError('required')) {
      return 'Ce champ est obligatoire';
    }
    return "Format d'email invalide";
  }

  onSubmit(): void {
    this.submitted = true;

    if (this.personalInfoForm.valid) {
      const formValue = this.personalInfoForm.value;
      const donationData: any = {
        name: `${formValue.firstName} ${formValue.lastName}`,
        email: formValue.email,
        firstname: formValue.firstName,
        lastname: formValue.lastName,
        address: formValue.address || '',
        city: formValue.city || '',
        country: formValue.country || 'France',
        line1: formValue.address || '',
        postal_code: formValue.postalCode || '',
        recu: false,
        raison: formValue.isProfessional ? formValue.companyName : '',
        siren: formValue.isProfessional ? formValue.siren : '',
        amount: this.donationAmount * 100,
        payment_method_types: 'card',
        campagne: this.selectedCampaign,
        asso: 'au-coeur-de-la-precarite',
        origin: '',
        treeNamesString: '',
      };
      this.stepComplete.emit(donationData);
    }
  }
}
