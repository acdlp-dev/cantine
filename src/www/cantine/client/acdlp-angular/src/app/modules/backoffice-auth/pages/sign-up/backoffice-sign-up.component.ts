import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule, NgClass, NgIf } from '@angular/common';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { ConfirmationComponent } from 'src/app/shared/components/confirmation/confirmation.component';
import { BackofficeAuthService } from '../../services/backoffice-auth.service';

@Component({
  selector: 'app-backoffice-sign-up',
  templateUrl: './backoffice-sign-up.component.html',
  styleUrls: ['./backoffice-sign-up.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    AngularSvgIconModule,
    NgClass,
    NgIf,
    ButtonComponent,
    ConfirmationComponent,
  ],
})

export class BackofficeSignUpComponent implements OnInit {
  submitted = false;
  form!: FormGroup;
  passwordTextType = false;
  isMailSent = false;
  passwordStrength = 0;
  raisonSociale = '';
  isLoadingRaisonSociale = false;
  sirenError = '';
  step = 1; // Étape du formulaire (1 ou 2)
  
  // Variables pour l'upload de document
  selectedFile: File | null = null;
  documentError = '';
  isDragging = false;

  constructor(
    private readonly _formBuilder: FormBuilder,
    private readonly _router: Router,
    private backofficeAuthService: BackofficeAuthService
  ) { }

  ngOnInit(): void {
    this.form = this._formBuilder.group(
      {
        email: [
          '',
          [
            Validators.required,
            Validators.pattern(
              /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
            ),
          ],
        ], password: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&_-])[A-Za-z\d@$!%*?&_-]{8,}$/),
          ],
        ],
        confirmPassword: ['', Validators.required],
        acceptTerm: [false, Validators.requiredTrue],
        firstName: ['', Validators.required],
        lastName: ['', Validators.required],
        siren: ['', [Validators.required, Validators.pattern(/^\d{9}$/)]], // SIREN must be 9 digits
      },
      {
        validator: this.passwordMatchValidator,
      }
    );

    this.form.get('password')?.valueChanges.subscribe((password) => {
      this.updatePasswordStrength(password);
    });
  }

  updatePasswordStrength(password: string): void {
    let strength = 0;

    if (password.length >= 8) strength++;
    if (/[A-Za-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[@$!%*?&_-]/.test(password)) strength++;

    this.passwordStrength = strength;
  }

  passwordMatchValidator(form: FormGroup): null | object {
    return form.get('password')?.value === form.get('confirmPassword')?.value
      ? null
      : { mismatch: true };
  }

  togglePasswordTextType(): void {
    this.passwordTextType = !this.passwordTextType;
  }

  // Méthode de validation pour le SIREN
  validateSiren(): void {
    const sirenControl = this.form.get('siren');
    if (sirenControl) {
      const value = sirenControl.value;
      
      // Si la valeur n'est pas un nombre à 9 chiffres exactement
      if (!value || !/^\d{9}$/.test(value)) {
        sirenControl.setErrors({ 
          invalidSiren: true,
          message: value ? `Le SIREN doit contenir exactement 9 chiffres (actuellement: ${value.length})` : 'Le SIREN est requis'
        });
      }
    }
  }

  // Méthode pour filtrer les entrées non numériques et appeler l'API SIREN
  formatSirenInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    
    // Ne garder que les chiffres
    const filteredValue = value.replace(/\D/g, '');
    
    // Mettre à jour la valeur si elle a changé
    if (filteredValue !== value) {
      input.value = filteredValue;
      this.form.get('siren')?.setValue(filteredValue);
    }
    
    // Vérifier la longueur à chaque saisie
    const sirenControl = this.form.get('siren');
    if (sirenControl && filteredValue.length !== 9 && filteredValue.length > 0) {
      sirenControl.setErrors({ 
        pattern: true, 
        message: `Le SIREN doit contenir exactement 9 chiffres (actuellement: ${filteredValue.length})` 
      });
      // Réinitialiser la raison sociale si le SIREN n'est pas complet
      this.raisonSociale = '';
      this.sirenError = '';
    }

    // Si le SIREN a exactement 9 chiffres, appeler l'API INSEE
    if (filteredValue.length === 9) {
      this.fetchRaisonSociale(filteredValue);
    }
  }

  // Appeler l'API pour récupérer la raison sociale
  fetchRaisonSociale(siren: string): void {
    this.isLoadingRaisonSociale = true;
    this.sirenError = '';
    this.raisonSociale = '';

    this.backofficeAuthService.getRaisonSocialeBySiren(siren).subscribe({
      next: (response) => {
        this.isLoadingRaisonSociale = false;
        if (response.success && response.denomination) {
          this.raisonSociale = response.denomination;
          this.sirenError = '';
        } else {
          this.sirenError = 'Impossible de récupérer la raison sociale';
        }
      },
      error: (err) => {
        this.isLoadingRaisonSociale = false;
        this.sirenError = 'SIREN introuvable';
        console.error('Erreur lors de la récupération de la raison sociale:', err);
      }
    });
  }

  // Gestion du fichier sélectionné
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Validation du type de fichier
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        this.documentError = 'Seuls les fichiers PDF, JPG et PNG sont acceptés';
        this.selectedFile = null;
        return;
      }

      // Validation de la taille (10 MB max)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        this.documentError = 'Le fichier ne doit pas dépasser 10 MB';
        this.selectedFile = null;
        return;
      }

      this.selectedFile = file;
      this.documentError = '';
    }
  }

  // Drag & Drop handlers
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];

      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        this.documentError = 'Seuls les fichiers PDF, JPG et PNG sont acceptés';
        this.selectedFile = null;
        return;
      }

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        this.documentError = 'Le fichier ne doit pas dépasser 10 MB';
        this.selectedFile = null;
        return;
      }

      this.selectedFile = file;
      this.documentError = '';
    }
  }

  removeSelectedFile(): void {
    this.selectedFile = null;
    this.documentError = '';
  }

  // Navigation entre les étapes
  nextStep(): void {
    // Valider les champs de l'étape 1 avant de passer à l'étape 2
    const step1Controls = ['firstName', 'lastName', 'email', 'password', 'confirmPassword'];
    let step1Valid = true;
    
    step1Controls.forEach(controlName => {
      const control = this.form.get(controlName);
      if (control) {
        control.markAsTouched();
        if (control.invalid) {
          step1Valid = false;
        }
      }
    });

    if (step1Valid && !this.form.errors?.['mismatch']) {
      this.step = 2;
    }
  }

  previousStep(): void {
    this.step = 1;
  }

  // L'upload se fera lors de la soumission du formulaire

  debugClick(): void {
    console.log('>>> BUTTON CLICK EVENT fired');
  }

  onSubmit(): void {
    console.log('>>> onSubmit() CALLED');
    console.log('>>> form valid:', this.form.valid);
    console.log('>>> selectedFile:', this.selectedFile);
    this.submitted = true;

    // Valider le SIREN explicitement avant la soumission
    this.validateSiren();

    // Vérifier que le document est bien sélectionné
    if (!this.selectedFile) {
      this.documentError = 'Veuillez sélectionner votre document justificatif avant de continuer';
      return;
    }

    if (this.form.invalid) {
      console.log("Invalid Backoffice Signup Submission");

      Object.keys(this.form.controls).forEach((key) => {
        const control = this.form.get(key);
        if (control?.invalid) {
          console.error(`Field '${key}' is invalid. Errors:`, control.errors);
        }
      });

      console.error('Form-level errors:', this.form.errors);
      console.log('Form values:', this.form.value);
      return;
    }

    const { email, password, firstName, lastName, siren } = this.form.value;

    this.backofficeAuthService.signUp(email, password, firstName, lastName, siren, this.selectedFile).subscribe({
      next: () => {
        this.isMailSent = true;
      },
      error: (err) => {
        console.error('Backoffice Sign-up error:', err);
      },
    });
  }
}