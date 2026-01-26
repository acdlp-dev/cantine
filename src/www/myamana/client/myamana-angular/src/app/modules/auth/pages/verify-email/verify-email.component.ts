import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.scss',
})
export class VerifyEmailComponent implements OnInit {
  message: string = '';
  loading: boolean = false;
  showResendForm: boolean = false;
  verificationSuccess: boolean = false;
  resendLoading: boolean = false;
  resendMessage: string = '';
  resendSuccess: boolean = false;
  verifiedUser: any = null;
  private apiUrl = environment.apiUrl;
  private currentToken: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    const token = this.route.snapshot.paramMap.get('token');
    this.currentToken = token;
    console.log("url de l'api : ");
    console.log(this.apiUrl);

    if (token) {
      this.loading = true;
      this.message = 'Vérification en cours...';
      const url = this.apiUrl+'/verify-email/'+token;

      this.http
        .get(`${url}`)
        .subscribe({
          next: (response: any) => {
            this.loading = false;

            // Vérifier si le backend demande une création de mot de passe
            if (response.nextStep === 'set-password') {
              // Rediriger vers la page de création de mot de passe
              this.router.navigate(['/auth/set-password'], {
                queryParams: { token: response.tempToken, email: response.email }
              });
              return;
            }

            // Cas normal : compte déjà vérifié ou avec mot de passe existant
            this.verificationSuccess = true;
            this.verifiedUser = response.user;
            this.message = 'Votre compte a été vérifié avec succès. Vous pouvez désormais vous connecter :)';
          },
          error: () => {
            this.loading = false;
            this.showResendForm = true;
            this.message = 'Le lien de vérification est invalide ou expiré. Vous pouvez demander un nouveau lien de vérification en cliquant sur le bouton ci-dessous.';
          },
        });
    } else {
      this.message = 'Aucun token fourni.';
      this.showResendForm = false; // Sans token, on ne peut pas renvoyer de lien
    }
  }

  resendVerificationLink() {
    if (!this.currentToken) {
      this.resendMessage = 'Impossible de renvoyer un lien sans token.';
      this.resendSuccess = false;
      return;
    }

    this.resendLoading = true;
    this.resendMessage = '';

    this.http.post(`${this.apiUrl}/resend-verification-link`, { token: this.currentToken })
      .subscribe({
        next: (response: any) => {
          this.resendLoading = false;
          this.resendSuccess = true;
          this.resendMessage = response.message || 'Un nouveau lien de vérification a été envoyé à votre adresse email.';
        },
        error: (error) => {
          this.resendLoading = false;
          this.resendSuccess = false;
          this.resendMessage = error.error.message || 'Une erreur est survenue lors de l\'envoi du lien de vérification.';
        }
      });
  }


  getRedirectLink(): string {
    switch (this.verifiedUser.role) {
      case 'association':
        return '/backoffice-auth/sign-in';
      case 'donator':
        return '/auth/sign-in';
      default:
        return '/dashboard';
    }
  }
}
