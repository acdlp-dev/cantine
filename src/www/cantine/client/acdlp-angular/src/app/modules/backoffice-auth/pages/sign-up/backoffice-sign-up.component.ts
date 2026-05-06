import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule, NgClass, NgIf, NgFor } from '@angular/common';
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
    NgClass,
    NgIf,
    NgFor,
  ],
})

export class BackofficeSignUpComponent implements OnInit {
  submitted = false;
  form!: FormGroup;
  passwordTextType = false;
  isCompleted = false;
  passwordStrength = 0;
  currentYear: number = new Date().getFullYear();
  raisonSociale = '';
  isLoadingRaisonSociale = false;
  rnaError = '';
  step = 1;

  // Token et email reçus depuis l'étape OTP
  completionToken = '';
  email = '';

  // Variables pour l'upload de document
  selectedFile: File | null = null;
  documentError = '';
  isDragging = false;

  constructor(
    private readonly _formBuilder: FormBuilder,
    private readonly _router: Router,
    private backofficeAuthService: BackofficeAuthService
  ) {}

  ngOnInit(): void {
    // Récupérer token et email depuis history.state (persistant après lazy-loading)
    const state = history.state;
    if (state?.token) {
      this.completionToken = state.token;
    }
    if (state?.email) {
      this.email = state.email;
    }

    if (!this.completionToken || !this.email) {
      this._router.navigate(['/signup']);
      return;
    }

    this.form = this._formBuilder.group(
      {
        password: [
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
        rna: ['', [Validators.required, Validators.pattern(/^W[0-9A-Z]{9}$/)]],
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

  validateRna(): void {
    const rnaControl = this.form.get('rna');
    if (rnaControl) {
      const value = rnaControl.value;
      if (!value || !/^W[0-9A-Z]{9}$/.test(value)) {
        rnaControl.setErrors({
          invalidRna: true,
          message: value ? `Le RNA doit commencer par W suivi de 9 caractères (actuellement: ${value.length} caractères)` : 'Le RNA est requis'
        });
      }
    }
  }

  formatRnaInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.toUpperCase();

    let filtered = '';
    for (let i = 0; i < value.length && filtered.length < 10; i++) {
      if (i === 0 && value[i] === 'W') {
        filtered += 'W';
      } else if (filtered.length > 0 && filtered[0] === 'W' && /[0-9A-Z]/.test(value[i])) {
        filtered += value[i];
      } else if (i === 0 && /[0-9A-Z]/.test(value[i])) {
        filtered = 'W' + value[i];
      }
    }

    if (filtered !== input.value) {
      input.value = filtered;
      this.form.get('rna')?.setValue(filtered);
    }

    const rnaControl = this.form.get('rna');
    if (rnaControl && filtered.length !== 10 && filtered.length > 0) {
      rnaControl.setErrors({
        pattern: true,
        message: `Le RNA doit contenir W + 9 caractères (actuellement: ${filtered.length} caractères)`
      });
      this.raisonSociale = '';
      this.rnaError = '';
    }

    if (filtered.length === 10 && /^W[0-9A-Z]{9}$/.test(filtered)) {
      this.fetchAssociationName(filtered);
    }
  }

  fetchAssociationName(rna: string): void {
    this.isLoadingRaisonSociale = true;
    this.rnaError = '';
    this.raisonSociale = '';

    this.backofficeAuthService.getRaisonSocialeByRna(rna).subscribe({
      next: (response) => {
        this.isLoadingRaisonSociale = false;
        if (response.success && response.denomination) {
          this.raisonSociale = response.denomination;
          this.rnaError = '';
        } else {
          this.rnaError = response.error || 'Impossible de récupérer le nom de l\'association';
        }
      },
      error: (err) => {
        this.isLoadingRaisonSociale = false;
        this.rnaError = 'RNA introuvable dans le répertoire';
        console.error('Erreur lors de la récupération du nom:', err);
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
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

  nextStep(): void {
    const step1Controls = ['firstName', 'lastName', 'password', 'confirmPassword'];
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

  onSubmit(): void {
    this.submitted = true;

    this.validateRna();

    if (!this.selectedFile) {
      this.documentError = 'Veuillez sélectionner votre document justificatif avant de continuer';
      return;
    }

    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach((key) => {
        const control = this.form.get(key);
        if (control?.invalid) {
          console.error(`Field '${key}' is invalid. Errors:`, control.errors);
        }
      });
      return;
    }

    const { password, firstName, lastName, rna } = this.form.value;

    this.backofficeAuthService.completeSignup(
      this.completionToken, this.email, password, password, firstName, lastName, rna, this.selectedFile
    ).subscribe({
      next: () => {
        this.isCompleted = true;
      },
      error: (err) => {
        console.error('Complete signup error:', err);
      },
    });
  }
}
