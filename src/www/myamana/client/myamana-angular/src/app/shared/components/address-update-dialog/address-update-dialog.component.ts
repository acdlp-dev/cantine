declare const google: any;

import { Component, EventEmitter, Input, Output, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-address-update-dialog',
  standalone: true,
  templateUrl: './address-update-dialog.component.html',
  styleUrls: ['./address-update-dialog.component.scss'],
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
})
export class AddressUpdateDialogComponent implements AfterViewInit {
  @ViewChild('addressInput') addressInput!: ElementRef;
  
  @Input() title: string = 'Mise à jour des informations';
  @Input() initialData: { adresse: string, ville: string, codePostal: string } = { adresse: '', ville: '', codePostal: '' };
  
  @Output() onConfirm = new EventEmitter<{adresse: string, ville: string, codePostal: string}>();
  @Output() onCancel = new EventEmitter<void>();

  addressForm = new FormGroup({
    adresse: new FormControl('', [Validators.required]),
    ville: new FormControl('', [Validators.required]),
    codePostal: new FormControl('', [Validators.required])
  });

  submitted = false;

  ngAfterViewInit(): void {
    // Initialiser le formulaire avec les données existantes
    this.addressForm.patchValue({
      adresse: this.initialData.adresse,
      ville: this.initialData.ville,
      codePostal: this.initialData.codePostal
    });
    
    // Initialiser l'autocomplétion d'adresse
    this.initGooglePlacesAutocomplete();
  }

  private initGooglePlacesAutocomplete(): void {
    if (!this.addressInput) return;

    const autocomplete = new google.maps.places.Autocomplete(
      this.addressInput.nativeElement,
      {
        componentRestrictions: { country: 'FR' },
        fields: ['address_components', 'formatted_address'],
        types: ['address']
      }
    );

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.address_components) {
        let postalCode = '';
        let city = '';

        for (const component of place.address_components) {
          if (component.types.includes('postal_code')) {
            postalCode = component.long_name;
          }
          if (component.types.includes('locality')) {
            city = component.long_name;
          }
        }

        this.addressForm.patchValue({
          adresse: place.formatted_address,
          codePostal: postalCode,
          ville: city
        });
      }
    });
  }

  showError(fieldName: string): boolean {
    const control = this.addressForm.get(fieldName);
    return control ? control.invalid && this.submitted : false;
  }

  confirm(): void {
    this.submitted = true;
    
    if (this.addressForm.valid) {
      const formValue = this.addressForm.value;
      this.onConfirm.emit({
        adresse: formValue.adresse || '',
        ville: formValue.ville || '',
        codePostal: formValue.codePostal || ''
      });
    }
  }

  cancel(): void {
    this.onCancel.emit();
  }
}
