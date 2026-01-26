import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { VolunteerService } from '../../services/volunteer.service';

@Component({
  selector: 'app-volunteer-profile',
  templateUrl: './volunteer-profile.component.html',
  styleUrls: ['./volunteer-profile.component.scss']
})
export class VolunteerProfileComponent implements OnInit {
  profileForm!: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';
  isEditing = false;

  // Properties for password change functionality
  passwordChangeSuccess = '';
  passwordChangeError = '';
  passwordChangeLoading = false;
  passwordChangeCompleted = false;

  constructor(
    private fb: FormBuilder,
    private volunteerService: VolunteerService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadProfile();
  }

  initForm(): void {
    this.profileForm = this.fb.group({
      nom: [{ value: '', disabled: true }],
      prenom: [{ value: '', disabled: true }],
      adresse: ['', [Validators.required]],
      ville: ['', [Validators.required]],
      code_postal: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
      pays: ['France', [Validators.required]],
      telephone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      vehicule: ['non', [Validators.required]]
    });
  }

  loadProfile(): void {
    this.loading = true;
    this.errorMessage = '';

    this.volunteerService.getProfile().subscribe({
      next: (response) => {
        console.log('✅ Profil récupéré:', response);
        
        if (response.success && response.profile) {
          this.profileForm.patchValue({
            nom: response.profile.nom,
            prenom: response.profile.prenom,
            adresse: response.profile.adresse || '',
            ville: response.profile.ville || '',
            code_postal: response.profile.code_postal || '',
            pays: response.profile.pays || 'France',
            telephone: response.profile.telephone || '',
            vehicule: response.profile.vehicule || 'non'
          });
        }
        
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Erreur chargement profil:', error);
        this.errorMessage = error.error?.message || 'Erreur lors du chargement du profil';
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      this.markFormGroupTouched(this.profileForm);
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Ne récupérer que les champs modifiables
    const profileData = {
      adresse: this.profileForm.get('adresse')?.value,
      ville: this.profileForm.get('ville')?.value,
      code_postal: this.profileForm.get('code_postal')?.value,
      pays: this.profileForm.get('pays')?.value,
      telephone: this.profileForm.get('telephone')?.value,
      vehicule: this.profileForm.get('vehicule')?.value
    };

    this.volunteerService.updateProfile(profileData).subscribe({
      next: (response) => {
        console.log('✅ Profil mis à jour:', response);
        this.successMessage = 'Profil mis à jour avec succès';
        this.loading = false;
        this.isEditing = false;
        
        // Masquer le message après 3 secondes
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        console.error('❌ Erreur mise à jour profil:', error);
        this.errorMessage = error.error?.message || 'Erreur lors de la mise à jour du profil';
        this.loading = false;
      }
    });
  }

  onCancel(): void {
    this.loadProfile();
    this.isEditing = false;
    this.errorMessage = '';
    this.successMessage = '';
  }

  startEditing(): void {
    this.isEditing = true;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.profileForm.get(fieldName);
    
    if (control?.hasError('required')) {
      return 'Ce champ est requis';
    }
    
    if (control?.hasError('pattern')) {
      if (fieldName === 'code_postal') {
        return 'Code postal invalide (5 chiffres)';
      }
      if (fieldName === 'telephone') {
        return 'Téléphone invalide (10 chiffres)';
      }
    }
    
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.profileForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  /**
   * Demande un changement de mot de passe via email
   */
  requestPasswordChange(): void {
    this.passwordChangeLoading = true;
    this.passwordChangeError = '';
    this.passwordChangeSuccess = '';

    console.log('🔑 [volunteer-profile] Demande de changement de mot de passe initiée');

    // Utiliser la nouvelle méthode du service qui gère automatiquement l'email de l'utilisateur connecté
    this.volunteerService.requestPasswordResetForCurrentUser().subscribe({
      next: (response) => {
        console.log('✅ [volunteer-profile] Demande de changement de mot de passe envoyée:', response);
        this.passwordChangeSuccess = 'Un email de réinitialisation de mot de passe a été envoyé à votre adresse email. Veuillez vérifier votre boîte de réception.';
        this.passwordChangeLoading = false;
        this.passwordChangeCompleted = true;

        // Masquer le message après 10 secondes
        setTimeout(() => {
          this.passwordChangeSuccess = '';
        }, 10000);
      },
      error: (error) => {
        console.error('❌ [volunteer-profile] Erreur demande de changement de mot de passe:', error);
        this.passwordChangeError = error.error?.message || 'Erreur lors de la demande de changement de mot de passe. Veuillez réessayer.';
        this.passwordChangeLoading = false;
      }
    });
  }

  /**
   * Réinitialise l'état du changement de mot de passe
   */
  resetPasswordChangeState(): void {
    this.passwordChangeSuccess = '';
    this.passwordChangeError = '';
    this.passwordChangeCompleted = false;
  }
}
