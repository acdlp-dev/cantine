import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule, NgClass, NgIf } from '@angular/common';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { ConfirmationComponent } from 'src/app/shared/components/confirmation/confirmation.component';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.scss'],
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

export class SignUpComponent implements OnInit {
  submitted = false;
  form!: FormGroup;
  isMailSent = false;

  constructor(
    private readonly _formBuilder: FormBuilder,
    private readonly _router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    // Nouveau formulaire simplifié - uniquement l'email
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
        ],
        acceptTerm: [false, Validators.requiredTrue],
      }
    );
  }

  onSubmit(): void {
    this.submitted = true;

    if (this.form.invalid) {
      console.log("Invalid Signup Submission");

      Object.keys(this.form.controls).forEach((key) => {
        const control = this.form.get(key);
        if (control?.invalid) {
          console.error(`Field '${key}' is invalid. Errors:`, control.errors);
        }
      });

      console.error('Form-level errors:', this.form.errors);
      return;
    }

    const { email } = this.form.value;

    // Nouveau flux : uniquement l'email est envoyé
    this.authService.signUp(email).subscribe({
      next: () => {
        this.isMailSent = true;
      },
      error: (err) => {
        console.error('Sign-up error:', err);
      },
    });
  }
}
