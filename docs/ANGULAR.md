# Documentation Angular - MyAmana

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture du projet](#architecture-du-projet)
3. [Configuration](#configuration)
4. [Structure des dossiers](#structure-des-dossiers)
5. [Modules principaux](#modules-principaux)
6. [Système de routing](#système-de-routing)
7. [Services et gestion d'état](#services-et-gestion-détat)
8. [Guards et sécurité](#guards-et-sécurité)
9. [Composants standalone](#composants-standalone)
10. [Communication API](#communication-api)
11. [Styling et UI](#styling-et-ui)
12. [Dépendances clés](#dépendances-clés)
13. [Exemples de code](#exemples-de-code)
14. [Tests](#tests)
15. [Build et déploiement](#build-et-déploiement)

---

## 🎯 Vue d'ensemble

MyAmana est une application Angular moderne construite avec **Angular 18** en utilisant l'approche **standalone components**. L'application est dédiée à la gestion de dons et de bénévolat pour des associations.

### Caractéristiques principales

- **Framework**: Angular 18.1.0
- **Architecture**: Standalone Components + Modules lazy-loaded
- **Styling**: Tailwind CSS 3.1.6
- **UI Components**: Composants personnalisés + Lucide Icons + FontAwesome
- **State Management**: Services avec RxJS
- **API Communication**: HttpClient avec cookies HttpOnly
- **Tests**: Karma/Jasmine (unitaires) + Playwright (E2E)

### Technologies utilisées

```json
{
  "Angular": "18.1.0",
  "TypeScript": "5.4.5",
  "Tailwind CSS": "3.1.6",
  "RxJS": "7.4.0",
  "ApexCharts": "3.35.3",
  "Quill": "2.0.2",
  "Driver.js": "1.3.6"
}
```

---

## 🏗️ Architecture du projet

Le projet suit une architecture modulaire avec une séparation claire des responsabilités:

```
src/app/
├── core/                    # Services et fonctionnalités core
│   ├── constants/          # Constantes globales
│   ├── guards/             # Guards d'authentification
│   ├── interceptor/        # Intercepteurs HTTP
│   ├── models/             # Modèles de données
│   ├── services/           # Services globaux
│   └── utils/              # Utilitaires
├── guards/                  # Guards de routes
├── modules/                 # Modules fonctionnels
│   ├── auth/               # Authentification donateurs
│   ├── backoffice/         # Administration
│   ├── backoffice-auth/    # Authentification admin
│   ├── benevolat/          # Gestion bénévolat
│   ├── cantine/            # Module cantine
│   ├── dashboard/          # Tableaux de bord
│   ├── donation/           # Formulaire de dons
│   ├── error/              # Pages d'erreur
│   ├── layout/             # Structure des pages
│   └── uikit/              # Bibliothèque de composants
└── shared/                  # Composants et ressources partagés
    ├── components/         # Composants réutilisables
    ├── directives/         # Directives personnalisées
    ├── models/             # Modèles partagés
    ├── pipes/              # Pipes personnalisés
    ├── services/           # Services partagés
    └── validators/         # Validateurs de formulaires
```

### Principes architecturaux

1. **Lazy Loading**: Les modules sont chargés à la demande pour optimiser les performances
2. **Standalone Components**: Utilisation de composants standalone pour réduire la complexité
3. **Separation of Concerns**: Séparation claire entre core, features et shared
4. **Service-based State**: Gestion d'état via services avec RxJS
5. **Type Safety**: Utilisation extensive de TypeScript pour la sécurité des types

---

## ⚙️ Configuration

### angular.json

Configuration du projet Angular:

```json
{
  "projectType": "application",
  "prefix": "app",
  "sourceRoot": "src",
  "outputPath": "dist/angular-tailwind",
  "assets": [
    "src/favicon.ico",
    "src/favicon.svg",
    "src/assets"
  ],
  "styles": ["src/styles.scss"],
  "scripts": ["node_modules/apexcharts/dist/apexcharts.min.js"]
}
```

### Environnements

**environment.ts** (développement):
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:4242/api'
};
```

**environment.prod.ts** (production):
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.myamana.fr/api'  // URL de production
};
```

### Tailwind CSS Configuration

**tailwind.config.js**:
```javascript
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        myamana: {
          primary: '#...',
          secondary: '#...'
        }
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
    require('tailwind-scrollbar')
  ]
};
```

---

## 📁 Structure des dossiers

### Module type

Chaque module fonctionnel suit cette structure:

```
modules/auth/
├── auth-routing.module.ts      # Routes du module
├── auth.component.ts           # Composant principal
├── auth.module.ts              # Déclaration du module
├── pages/                      # Pages du module
│   ├── sign-in/
│   ├── sign-up/
│   ├── forgot-password/
│   └── verify-email/
└── services/                   # Services du module
    └── auth.service.ts
```

---

## 🧩 Modules principaux

### 1. Auth Module

**Responsabilité**: Gestion de l'authentification des donateurs

**Routes**:
- `/auth/sign-in` - Connexion
- `/auth/sign-up` - Inscription
- `/auth/forgot-password` - Mot de passe oublié
- `/auth/new-password` - Nouveau mot de passe
- `/auth/verify-email` - Vérification email
- `/auth/two-steps` - Authentification à deux facteurs

**Services**:
- `AuthService` - Gestion de l'authentification

**Fichier**: `src/app/modules/auth/auth.module.ts`
```typescript
@NgModule({
  imports: [
    AuthRoutingModule, 
    AngularSvgIconModule.forRoot()
  ], 
  providers: [
    provideHttpClient(withInterceptorsFromDi())
  ] 
})
export class AuthModule { }
```

### 2. Backoffice Module

**Responsabilité**: Interface d'administration pour gérer l'association

**Fonctionnalités**:
- Gestion des dons et abonnements
- Gestion des bénévoles et actions
- Génération de reçus fiscaux
- Gestion des campagnes
- Paramètres de l'association
- Onboarding des nouveaux admins
- Tours guidés (Driver.js)

**Composants principaux**:
- `AccueilComponent` - Dashboard principal
- `DonsComponent` - Liste des dons
- `AbonnementsComponent` - Gestion des abonnements
- `BenevolatListComponent` - Liste des bénévoles
- `BenevolatActionsComponent` - Gestion des actions
- `RecuComponent` - Génération de reçus fiscaux
- `CampagnesComponent` - Gestion des campagnes
- `ParametresComponent` - Configuration

**Services**:
- `OnboardingService` - Gestion de l'onboarding
- `AutoTourService` - Tours guidés automatiques
- `BenevolatAdminService` - Gestion admin bénévolat

### 3. Backoffice Auth Module

**Responsabilité**: Authentification séparée pour les administrateurs

**Routes**:
- `/backoffice-auth/sign-in` - Connexion admin
- `/backoffice-auth/sign-up` - Inscription admin

**Service**:
- `BackofficeAuthService` - Authentification admin

### 4. Donation Module

**Responsabilité**: Formulaire de dons public avec intégration de paiement

**Caractéristiques**:
- Dons ponctuels et mensuels
- Intégration Stripe et PayPal
- Formulaire multi-étapes
- Validation de formulaires réactifs
- Génération de reçus fiscaux

**Dépendances**:
- `@stripe/stripe-js` - Intégration Stripe
- `@paypal/paypal-js` - Intégration PayPal

**Fichier**: `src/app/modules/donation/donation.module.ts`
```typescript
@NgModule({
  imports: [
    CommonModule, 
    DonationRoutingModule, 
    DonationComponent,
    FormsModule,
    ReactiveFormsModule,
    FontAwesomeModule
  ]
})
export class DonationModule {}
```

### 5. Benevolat Module

**Responsabilité**: Espace bénévole pour gérer les inscriptions et actions

**Fonctionnalités**:
- Inscription des bénévoles
- Authentification bénévole
- Tableau de bord bénévole
- Inscription aux actions
- Historique des participations

**Pages**:
- `volunteer-signin` - Connexion
- `volunteer-form` - Formulaire d'inscription
- `volunteer-dashboard` - Tableau de bord
- `volunteer-actions` - Liste des actions disponibles
- `volunteer-otp-verification` - Vérification OTP
- `volunteer-forgot-password` - Réinitialisation mot de passe

**Services**:
- `ActionService` - Gestion des actions bénévoles

**Modèles**:
```typescript
// action.model.ts
export interface Action {
  id: number;
  titre: string;
  description: string;
  date: Date;
  lieu: string;
  placesDisponibles: number;
  placesTotal: number;
}

// volunteer.model.ts
export interface Volunteer {
  id: number;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  actionsParticipees: number[];
}
```

### 6. Dashboard Module

**Responsabilité**: Tableaux de bord avec visualisation de données

**Caractéristiques**:
- Graphiques ApexCharts
- Métriques en temps réel
- Filtres et exports
- Visualisations personnalisées

### 7. Layout Module

**Responsabilité**: Structure commune des pages (navbar, sidebar, footer)

**Composants**:
- Navbar
- Sidebar avec navigation
- Footer
- Breadcrumb

### 8. Error Module

**Responsabilité**: Pages d'erreur personnalisées

**Pages**:
- 404 - Page non trouvée
- 500 - Erreur serveur
- 403 - Accès refusé

---

## 🛣️ Système de routing

### Configuration principale

**app-routing.module.ts**:
```typescript
const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./modules/layout/layout.module')
      .then((m) => m.LayoutModule),
  },
  {
    path: 'auth',
    loadChildren: () => import('./modules/auth/auth.module')
      .then((m) => m.AuthModule),
  },
  {
    path: 'donation',
    loadChildren: () => import('./modules/donation/donation.module')
      .then(m => m.DonationModule)
  },
  {
    path: 'benevolat',
    loadChildren: () => import('./modules/benevolat/benevolat.module')
      .then(m => m.BenevolatModule)
  },
  {
    path: 'backoffice-auth',
    loadChildren: () => import('./modules/backoffice-auth/backoffice-auth.module')
      .then(m => m.BackofficeAuthModule)
  },
  {
    path: 'errors',
    loadChildren: () => import('./modules/error/error.module')
      .then((m) => m.ErrorModule),
  },
  { 
    path: '**', 
    redirectTo: 'errors/404' 
  },
];
```

### Lazy Loading

Tous les modules sont chargés à la demande (lazy loaded) pour optimiser les performances:

```typescript
// Au lieu de :
import { AuthModule } from './modules/auth/auth.module';

// On utilise :
loadChildren: () => import('./modules/auth/auth.module')
  .then((m) => m.AuthModule)
```

**Avantages**:
- Réduction de la taille du bundle initial
- Chargement plus rapide de l'application
- Meilleure expérience utilisateur

---

## 🔧 Services et gestion d'état

### AuthService

**Localisation**: `src/app/modules/auth/services/auth.service.ts`

**Responsabilité**: Gestion de l'authentification avec cookies HttpOnly

```typescript
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private _isLoggedIn = false;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  // Connexion avec cookies HttpOnly
  signIn(email: string, password: string): Observable<any> {
    const body = { email, password };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post<any>(`${this.apiUrl}/signin`, body, { 
      headers,
      withCredentials: true  // Important pour les cookies
    }).pipe(
      tap(() => {
        this._isLoggedIn = true;
        this.router.navigate(['/dashboard']);
      }),
      catchError((error) => {
        console.error('Error during sign in:', error);
        return throwError(() => error);
      })
    );
  }

  // Inscription
  signUp(email: string, password: string, firstName: string, lastName: string)
    : Observable<{ message: string }> {
    const body = { email, password, firstName, lastName };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post<{ message: string }>(
      `${this.apiUrl}/signup`,
      body,
      { headers, withCredentials: true }
    );
  }

  // Demande de réinitialisation de mot de passe
  requestPasswordReset(email: string): Observable<{ message: string }> {
    const body = { email };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post<{ message: string }>(
      `${this.apiUrl}/request-password-reset`,
      body,
      { headers, withCredentials: true }
    );
  }

  // Réinitialisation avec token
  resetPasswordWithToken(
    token: string, 
    newPassword: string, 
    confirmPassword: string
  ): Observable<{ message: string }> {
    const body = { token, newPassword, confirmPassword };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post<{ message: string }>(
      `${this.apiUrl}/reset-password`,
      body,
      { headers, withCredentials: true }
    );
  }

  // Déconnexion
  logout(): void {
    this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true })
      .subscribe({
        next: () => {
          this._isLoggedIn = false;
          this.router.navigate(['/auth/sign-in']);
        },
        error: (error) => {
          console.error('Error during logout:', error);
          this.router.navigate(['/auth/sign-in']);
        }
      });
  }

  // Vérification de l'authentification
  isAuthenticated(): Observable<boolean> {
    return this.http.get(`${this.apiUrl}/protected-route`, { 
      withCredentials: true 
    }).pipe(
      map(() => {
        this._isLoggedIn = true;
        return true;
      }),
      catchError(() => {
        this._isLoggedIn = false;
        return of(false);
      })
    );
  }

  // État local (sans appel API)
  isLoggedInLocally(): boolean {
    return this._isLoggedIn;
  }

  // Récupération des données utilisateur
  getUserData(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/me`, { 
      withCredentials: true 
    });
  }
}
```

**Points clés**:
- ✅ Utilisation de `withCredentials: true` pour les cookies
- ✅ Gestion des erreurs avec `catchError`
- ✅ Navigation automatique après connexion
- ✅ Observable pour réactivité

### ThemeService

**Localisation**: `src/app/core/services/theme.service.ts`

**Responsabilité**: Gestion du thème de l'application

```typescript
@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly theme = { 
    mode: 'light', 
    color: 'myamana' 
  };

  constructor() {
    this.setTheme();
  }

  private setTheme() {
    this.setThemeClass();
  }

  private setThemeClass() {
    const htmlElement = document.querySelector('html');
    if (htmlElement) {
      htmlElement.className = this.theme.mode;
      htmlElement.setAttribute('data-theme', this.theme.color);
    }
  }
}
```

### FailedDonationsService

**Localisation**: `src/app/core/services/failed-donations.service.ts`

**Responsabilité**: Gestion des dons en échec avec affichage de notifications

```typescript
@Injectable({
  providedIn: 'root',
})
export class FailedDonationsService {
  private failedDonationsSubject = new BehaviorSubject<any[]>([]);
  public failedDonations$ = this.failedDonationsSubject.asObservable();
  
  public showDialog = false;

  setFailedDonations(donations: any[]): void {
    this.failedDonationsSubject.next(donations);
    if (donations.length > 0) {
      this.showDialog = true;
    }
  }

  closeDialog(): void {
    this.showDialog = false;
  }
}
```

---

## 🛡️ Guards et sécurité

### AuthGuard

**Localisation**: `src/app/guards/auth.guard.ts`

**Responsabilité**: Protection des routes nécessitant une authentification

```typescript
@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService, 
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.authService.isAuthenticated().pipe(
      map((isAuthenticated) => {
        if (isAuthenticated) {
          console.log("✅ Accès autorisé : utilisateur connecté");
          return true;
        } else {
          console.warn("❌ Accès refusé : redirection vers la page de connexion");
          return this.router.createUrlTree(['/auth/sign-in']);
        }
      }),
      catchError((err) => {
        console.error("Erreur lors de la vérification de l'authentification", err);
        return of(this.router.createUrlTree(['/auth/sign-in']));
      })
    );
  }
}
```

**Utilisation**:
```typescript
const routes: Routes = [
  {
    path: 'dashboard',
    loadChildren: () => import('./modules/dashboard/dashboard.module')
      .then(m => m.DashboardModule),
    canActivate: [AuthGuard]  // Protection de la route
  }
];
```

### BackofficeAuthGuard

**Localisation**: `src/app/guards/backoffice-auth.guard.ts`

**Responsabilité**: Protection des routes admin du backoffice

### FeatureAccessGuard

**Localisation**: `src/app/guards/feature-access.guard.ts`

**Responsabilité**: Contrôle d'accès basé sur les fonctionnalités

### OnboardingGuard

**Localisation**: `src/app/guards/onboarding.guard.ts`

**Responsabilité**: Redirection vers l'onboarding si nécessaire

---

## 🎨 Composants standalone

### App Component

**Localisation**: `src/app/app.component.ts`

Le composant racine de l'application utilise l'approche standalone:

```typescript
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [
    NgClass, 
    NgIf, 
    AsyncPipe, 
    RouterOutlet, 
    ResponsiveHelperComponent, 
    NgxSonnerToaster
  ],
})
export class AppComponent implements OnInit {
  title = 'My Amana';
  failedDonations: any[] = [];

  constructor(
    public themeService: ThemeService,
    public failedDonationsService: FailedDonationsService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    console.log('=== App Component Initialization ===');
    // Vérifier l'authentification au démarrage
    this.authService.isAuthenticated().subscribe((isAuth: boolean) => {
      console.log('App Component - Auth status:', isAuth);
      if (isAuth) {
        // S'abonner aux dons en échec
        this.failedDonationsService.failedDonations$.subscribe(donations => {
          console.log('App Component - Received donations:', donations);
          this.failedDonations = donations;
        });
      }
    });
  }

  get shouldShowDialog(): boolean {
    return this.failedDonationsService.showDialog && 
           this.failedDonations.length > 0;
  }

  navigateToSubscriptions(): void {
    this.failedDonationsService.closeDialog();
    this.router.navigate(['/dashboard/abonnements']);
  }
}
```

### Bootstrap de l'application

**main.ts**:
```typescript
import { enableProdMode, importProvidersFrom } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { registerLocaleData } from '@angular/common';
import { environment } from './environments/environment';
import { AppComponent } from './app/app.component';
import { AppRoutingModule } from './app/app-routing.module';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';

// Enregistrement de la locale française
registerLocaleData(localeFr, 'fr');

if (environment.production) {
  enableProdMode();
}

// Bootstrap avec standalone component
bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(BrowserModule, AppRoutingModule), 
    provideAnimations(), 
    provideHttpClient()
  ],
}).catch((err) => console.error(err));
```

---

## 🔌 Communication API

### Configuration HttpClient

L'application utilise `HttpClient` avec support des cookies:

```typescript
// Providers globaux
providers: [
  provideHttpClient(withInterceptorsFromDi())
]
```

### Appels API avec cookies

**Exemple de requête POST**:
```typescript
signIn(email: string, password: string): Observable<any> {
  const body = { email, password };
  const headers = new HttpHeaders({ 
    'Content-Type': 'application/json' 
  });

  return this.http.post<any>(
    `${this.apiUrl}/signin`, 
    body, 
    { 
      headers,
      withCredentials: true  // ⚠️ Important pour les cookies HttpOnly
    }
  );
}
```

**Exemple de requête GET**:
```typescript
getUserData(): Observable<any> {
  return this.http.get<any>(
    `${this.apiUrl}/me`, 
    { 
      withCredentials: true 
    }
  );
}
```

### Gestion des erreurs

```typescript
import { catchError, throwError } from 'rxjs';

createDonation(data: any): Observable<any> {
  return this.http.post(`${this.apiUrl}/donations`, data, {
    withCredentials: true
  }).pipe(
    catchError((error) => {
      console.error('Erreur lors de la création du don:', error);
      
      // Gestion personnalisée selon le code d'erreur
      if (error.status === 401) {
        this.router.navigate(['/auth/sign-in']);
      }
      
      return throwError(() => error);
    })
  );
}
```

### Patterns RxJS courants

**Transformation de données**:
```typescript
import { map } from 'rxjs/operators';

getDonations(): Observable<Donation[]> {
  return this.http.get<any[]>(`${this.apiUrl}/donations`, {
    withCredentials: true
  }).pipe(
    map(data => data.map(item => ({
      id: item.id,
      montant: item.amount,
      date: new Date(item.date),
      donateur: item.donor_name
    })))
  );
}
```

**Combinaison d'observables**:
```typescript
import { forkJoin } from 'rxjs';

loadDashboardData(): Observable<any> {
  return forkJoin({
    donations: this.getDonations(),
    stats: this.getStats(),
    volunteers: this.getVolunteers()
  });
}
```

---

## 🎨 Styling et UI

### Tailwind CSS

L'application utilise Tailwind CSS pour le styling avec des plugins supplémentaires:

**Plugins installés**:
- `@tailwindcss/forms` - Styles pour formulaires
- `@tailwindcss/typography` - Typographie
- `@tailwindcss/aspect-ratio` - Ratios d'aspect
- `tailwind-scrollbar` - Scrollbars personnalisées

**Exemple d'utilisation**:
```html
<div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
  <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">
    Titre
  </h2>
  <p class="text-gray-600 dark:text-gray-300">
    Contenu
  </p>
</div>
```

### Icônes

**Lucide Angular**:
```typescript
import { LucideAngularModule, Home, User, Settings } from 'lucide-angular';

@Component({
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <lucide-icon [img]="Home" class="w-5 h-5"></lucide-icon>
  `
})
export class MyComponent {
  readonly Home = Home;
}
```

**FontAwesome**:
```typescript
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faHeart, faUser } from '@fortawesome/free-solid-svg-icons';

@Component({
  standalone: true,
  imports: [FontAwesomeModule],
  template: `
    <fa-icon [icon]="faHeart"></fa-icon>
  `
})
export class MyComponent {
  faHeart = faHeart;
}
```

### Composants UI réutilisables

**ButtonComponent**:
```typescript
@Component({
  selector: 'app-button',
  standalone: true,
  template: `
    <button 
      [class]="buttonClass"
      [disabled]="disabled"
      (click)="handleClick()">
      <ng-content></ng-content>
    </button>
  `
})
export class ButtonComponent {
  @Input() variant: 'primary' | 'secondary' | 'danger' = 'primary';
  @Input() disabled = false;
  @Output() clicked = new EventEmitter<void>();

  get buttonClass(): string {
    const base = 'px-4 py-2 rounded-lg font-medium transition-colors';
    const variants = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white',
      secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
      danger: 'bg-red-600 hover:bg-red-700 text-white'
    };
    return `${base} ${variants[this.variant]}`;
  }

  handleClick(): void {
    if (!this.disabled) {
      this.clicked.emit();
    }
  }
}
```

### Notifications (ngx-sonner)

```typescript
import { toast } from 'ngx-sonner';

// Succès
toast.success('Don créé avec succès !');

// Erreur
toast.error('Une erreur est survenue');

// Information
toast.info('Traitement en cours...');

// Avertissement
toast.warning('Attention, action irréversible');
```

---

## 📦 Dépendances clés

### Dépendances de production

```json
{
  "@angular/core": "^18.1.0",
  "@angular/common": "^18.1.0",
  "@angular/router": "^18.1.0",
  "@angular/forms": "^18.1.0",
  "@angular/platform-browser": "^18.1.0",
  "@angular/platform-browser-dynamic": "^18.1.0",
  "@angular/animations": "^18.1.0",
  
  // UI & Styling
  "tailwindcss": "^3.1.6",
  "@tailwindcss/forms": "^0.5.2",
  "@tailwindcss/typography": "^0.5.4",
  "@tailwindcss/aspect-ratio": "^0.4.0",
  "tailwind-scrollbar": "^1.3.1",
  
  // Icônes
  "lucide-angular": "^0.503.0",
  "@fortawesome/angular-fontawesome": "^0.14.1",
  "@fortawesome/fontawesome-svg-core": "^6.5.1",
  "@fortawesome/free-solid-svg-icons": "^6.5.1",
  "@fortawesome/free-brands-svg-icons": "^6.5.1",
  "angular-svg-icon": "^13.0.0",
  
  // Charts & Visualisation
  "apexcharts": "^3.35.3",
  "ng-apexcharts": "^1.7.1",
  
  // Éditeurs
  "ngx-quill": "^26.0.6",
  "quill": "^2.0.2",
  
  // Paiements
  "@stripe/stripe-js": "^2.4.0",
  "@paypal/paypal-js": "^8.2.0",
  
  // UI Components & Utilities
  "ngx-sonner": "^2.0.1",
  "driver.js": "^1.3.6",
  
  // Core
  "rxjs": "~7.4.0",
  "tslib": "^2.3.0",
  "zone.js": "~0.14.2"
}
```

### Dépendances de développement

```json
{
  "@angular-devkit/build-angular": "^18.1.0",
  "@angular/cli": "^18.1.0",
  "@angular/compiler-cli": "^18.1.0",
  
  // Tests
  "@playwright/test": "^1.42.1",
  "jasmine-core": "~3.10.0",
  "karma": "~6.3.0",
  "karma-chrome-launcher": "~3.1.0",
  "karma-coverage": "~2.0.3",
  "karma-jasmine": "~4.0.0",
  "karma-jasmine-html-reporter": "~1.7.0",
  
  // Build & Styling
  "autoprefixer": "^10.4.7",
  "postcss": "^8.4.14",
  
  // Code Quality
  "prettier": "^2.7.1",
  "prettier-plugin-tailwindcss": "^0.1.12",
  
  // Types
  "@types/jasmine": "~3.10.0",
  "@types/node": "^12.11.1",
  
  // Autres
  "typescript": "~5.4.5",
  "cz-conventional-changelog": "^3.3.0"
}
```

### Dépendances clés expliquées

#### ApexCharts (`apexcharts`, `ng-apexcharts`)
Bibliothèque de graphiques interactive pour visualiser les données de dons, statistiques, etc.

```typescript
import { NgApexchartsModule } from 'ng-apexcharts';

// Configuration d'un graphique
chartOptions = {
  series: [{
    name: "Dons",
    data: [10, 41, 35, 51, 49, 62, 69]
  }],
  chart: {
    type: "line",
    height: 350
  },
  xaxis: {
    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']
  }
};
```

#### Driver.js (`driver.js`)
Création de tours guidés pour l'onboarding des utilisateurs.

```typescript
import { driver } from 'driver.js';

const driverObj = driver({
  showProgress: true,
  steps: [
    { element: '#create-donation', popover: { title: 'Créer un don', description: 'Cliquez ici pour créer un nouveau don' } },
    { element: '#donations-list', popover: { title: 'Liste des dons', description: 'Consultez tous vos dons ici' } }
  ]
});

driverObj.drive();
```

#### Quill (`quill`, `ngx-quill`)
Éditeur de texte riche pour la création de contenus.

```typescript
import { QuillModule } from 'ngx-quill';

@Component({
  template: `
    <quill-editor 
      [(ngModel)]="content"
      [modules]="quillModules">
    </quill-editor>
  `
})
export class MyComponent {
  content = '';
  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      ['link', 'image']
    ]
  };
}
```

---

## 💡 Exemples de code

### 1. Créer un nouveau composant standalone

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container mx-auto p-4">
      <h1 class="text-2xl font-bold">{{ title }}</h1>
      <p>{{ description }}</p>
      <a routerLink="/home" class="text-blue-600 hover:underline">
        Retour à l'accueil
      </a>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class MyComponent {
  title = 'Mon Composant';
  description = 'Description du composant';
}
```

### 2. Créer un service avec appels API

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface Donation {
  id: number;
  montant: number;
  date: Date;
  donateurNom: string;
  donateurEmail: string;
  type: 'ponctuel' | 'mensuel';
  statut: 'success' | 'pending' | 'failed';
}

@Injectable({
  providedIn: 'root'
})
export class DonationService {
  private apiUrl = `${environment.apiUrl}/donations`;

  constructor(private http: HttpClient) {}

  // Récupérer toutes les donations
  getDonations(): Observable<Donation[]> {
    return this.http.get<any[]>(this.apiUrl, {
      withCredentials: true
    }).pipe(
      map(data => data.map(item => this.mapToDonation(item))),
      catchError(this.handleError)
    );
  }

  // Récupérer une donation par ID
  getDonationById(id: number): Observable<Donation> {
    return this.http.get<any>(`${this.apiUrl}/${id}`, {
      withCredentials: true
    }).pipe(
      map(data => this.mapToDonation(data)),
      catchError(this.handleError)
    );
  }

  // Créer une nouvelle donation
  createDonation(donation: Partial<Donation>): Observable<Donation> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    
    return this.http.post<any>(this.apiUrl, donation, {
      headers,
      withCredentials: true
    }).pipe(
      map(data => this.mapToDonation(data)),
      tap(() => console.log('Donation créée avec succès')),
      catchError(this.handleError)
    );
  }

  // Mettre à jour une donation
  updateDonation(id: number, donation: Partial<Donation>): Observable<Donation> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    
    return this.http.put<any>(`${this.apiUrl}/${id}`, donation, {
      headers,
      withCredentials: true
    }).pipe(
      map(data => this.mapToDonation(data)),
      catchError(this.handleError)
    );
  }

  // Supprimer une donation
  deleteDonation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      withCredentials: true
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Mapper les données de l'API vers notre modèle
  private mapToDonation(data: any): Donation {
    return {
      id: data.id,
      montant: parseFloat(data.montant),
      date: new Date(data.date),
      donateurNom: data.donateur_nom,
      donateurEmail: data.donateur_email,
      type: data.type,
      statut: data.statut
    };
  }

  // Gestion des erreurs
  private handleError(error: any): Observable<never> {
    console.error('Erreur API:', error);
    let errorMessage = 'Une erreur est survenue';
    
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      errorMessage = `Code: ${error.status}\nMessage: ${error.message}`;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}
```

### 3. Formulaire réactif avec validation

```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { DonationService } from '../services/donation.service';
import { toast } from 'ngx-sonner';

@Component({
  selector: 'app-donation-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 class="text-2xl font-bold mb-6">Faire un don</h2>
      
      <form [formGroup]="donationForm" (ngSubmit)="onSubmit()">
        <!-- Montant -->
        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">
            Montant (€)
          </label>
          <input 
            type="number" 
            formControlName="montant"
            class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            [class.border-red-500]="montant?.invalid && montant?.touched"
          />
          <div *ngIf="montant?.invalid && montant?.touched" class="text-red-500 text-sm mt-1">
            <span *ngIf="montant?.errors?.['required']">Le montant est requis</span>
            <span *ngIf="montant?.errors?.['min']">Le montant minimum est de 5€</span>
          </div>
        </div>

        <!-- Type de don -->
        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">
            Type de don
          </label>
          <select 
            formControlName="type"
            class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="ponctuel">Don ponctuel</option>
            <option value="mensuel">Don mensuel</option>
          </select>
        </div>

        <!-- Nom -->
        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">
            Nom complet
          </label>
          <input 
            type="text" 
            formControlName="donateurNom"
            class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            [class.border-red-500]="donateurNom?.invalid && donateurNom?.touched"
          />
          <div *ngIf="donateurNom?.invalid && donateurNom?.touched" class="text-red-500 text-sm mt-1">
            Le nom est requis
          </div>
        </div>

        <!-- Email -->
        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">
            Email
          </label>
          <input 
            type="email" 
            formControlName="donateurEmail"
            class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            [class.border-red-500]="donateurEmail?.invalid && donateurEmail?.touched"
          />
          <div *ngIf="donateurEmail?.invalid && donateurEmail?.touched" class="text-red-500 text-sm mt-1">
            <span *ngIf="donateurEmail?.errors?.['required']">L'email est requis</span>
            <span *ngIf="donateurEmail?.errors?.['email']">Email invalide</span>
          </div>
        </div>

        <!-- Bouton de soumission -->
        <button 
          type="submit"
          [disabled]="donationForm.invalid || isSubmitting"
          class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <span *ngIf="!isSubmitting">Faire un don</span>
          <span *ngIf="isSubmitting">Traitement en cours...</span>
        </button>
      </form>
    </div>
  `
})
export class DonationFormComponent implements OnInit {
  donationForm!: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private donationService: DonationService
  ) {}

  ngOnInit(): void {
    this.donationForm = this.fb.group({
      montant: [null, [Validators.required, Validators.min(5)]],
      type: ['ponctuel', Validators.required],
      donateurNom: ['', Validators.required],
      donateurEmail: ['', [Validators.required, Validators.email]]
    });
  }

  // Getters pour accéder facilement aux contrôles
  get montant() { return this.donationForm.get('montant'); }
  get type() { return this.donationForm.get('type'); }
  get donateurNom() { return this.donationForm.get('donateurNom'); }
  get donateurEmail() { return this.donationForm.get('donateurEmail'); }

  onSubmit(): void {
    if (this.donationForm.valid) {
      this.isSubmitting = true;
      
      this.donationService.createDonation(this.donationForm.value).subscribe({
        next: (donation) => {
          console.log('Donation créée:', donation);
          toast.success('Don créé avec succès !');
          this.donationForm.reset({ type: 'ponctuel' });
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('Erreur:', error);
          toast.error('Erreur lors de la création du don');
          this.isSubmitting = false;
        }
      });
    }
  }
}
```

### 4. Utiliser un Guard pour protéger une route

```typescript
// Définition de la route avec guard
const routes: Routes = [
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard],  // Protection avec le guard
    children: [
      {
        path: 'donations',
        component: DonationsComponent
      },
      {
        path: 'volunteers',
        component: VolunteersComponent,
        canActivate: [FeatureAccessGuard],  // Protection supplémentaire
        data: { feature: 'volunteers' }
      }
    ]
  }
];
```

### 5. Intercepteur HTTP (exemple pour logging)

```typescript
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const startTime = Date.now();
    
    console.log(`[HTTP] ${req.method} ${req.url}`);
    
    return next.handle(req).pipe(
      tap({
        next: (event) => {
          const elapsed = Date.now() - startTime;
          console.log(`[HTTP] ${req.method} ${req.url} - ${elapsed}ms`);
        },
        error: (error) => {
          const elapsed = Date.now() - startTime;
          console.error(`[HTTP ERROR] ${req.method} ${req.url} - ${elapsed}ms`, error);
        }
      })
    );
  }
}

// Enregistrement dans les providers
providers: [
  {
    provide: HTTP_INTERCEPTORS,
    useClass: LoggingInterceptor,
    multi: true
  }
]
```

### 6. Directive personnalisée

```typescript
import { Directive, ElementRef, HostListener, Input } from '@angular/core';

@Directive({
  selector: '[appHighlight]',
  standalone: true
})
export class HighlightDirective {
  @Input() appHighlight = 'yellow';

  constructor(private el: ElementRef) {}

  @HostListener('mouseenter') onMouseEnter() {
    this.highlight(this.appHighlight);
  }

  @HostListener('mouseleave') onMouseLeave() {
    this.highlight('');
  }

  private highlight(color: string) {
    this.el.nativeElement.style.backgroundColor = color;
  }
}

// Utilisation
@Component({
  template: `
    <p appHighlight="lightblue">
      Survolez ce texte
    </p>
  `,
  imports: [HighlightDirective]
})
```

---

## 🧪 Tests

### Tests unitaires avec Karma/Jasmine

**Exemple de test de composant**:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DonationFormComponent } from './donation-form.component';
import { ReactiveFormsModule } from '@angular/forms';
import { DonationService } from '../services/donation.service';
import { of, throwError } from 'rxjs';

describe('DonationFormComponent', () => {
  let component: DonationFormComponent;
  let fixture: ComponentFixture<DonationFormComponent>;
  let donationService: jasmine.SpyObj<DonationService>;

  beforeEach(async () => {
    const donationServiceSpy = jasmine.createSpyObj('DonationService', ['createDonation']);

    await TestBed.configureTestingModule({
      imports: [DonationFormComponent, ReactiveFormsModule],
      providers: [
        { provide: DonationService, useValue: donationServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DonationFormComponent);
    component = fixture.componentInstance;
    donationService = TestBed.inject(DonationService) as jasmine.SpyObj<DonationService>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    expect(component.donationForm.get('type')?.value).toBe('ponctuel');
    expect(component.donationForm.get('montant')?.value).toBeNull();
  });

  it('should mark form as invalid when montant is less than 5', () => {
    component.donationForm.patchValue({ montant: 3 });
    expect(component.donationForm.get('montant')?.valid).toBeFalse();
  });

  it('should mark form as valid when all fields are filled correctly', () => {
    component.donationForm.patchValue({
      montant: 10,
      type: 'ponctuel',
      donateurNom: 'Jean Dupont',
      donateurEmail: 'jean@example.com'
    });
    expect(component.donationForm.valid).toBeTrue();
  });

  it('should call donationService.createDonation on submit', () => {
    const mockDonation = { id: 1, montant: 10, type: 'ponctuel' };
    donationService.createDonation.and.returnValue(of(mockDonation as any));

    component.donationForm.patchValue({
      montant: 10,
      type: 'ponctuel',
      donateurNom: 'Jean Dupont',
      donateurEmail: 'jean@example.com'
    });

    component.onSubmit();

    expect(donationService.createDonation).toHaveBeenCalled();
  });
});
```

**Exemple de test de service**:

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DonationService } from './donation.service';
import { environment } from 'src/environments/environment';

describe('DonationService', () => {
  let service: DonationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DonationService]
    });
    service = TestBed.inject(DonationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch donations', () => {
    const mockDonations = [
      { id: 1, montant: 10, date: '2024-01-01', donateur_nom: 'Test', donateur_email: 'test@test.com', type: 'ponctuel', statut: 'success' }
    ];

    service.getDonations().subscribe(donations => {
      expect(donations.length).toBe(1);
      expect(donations[0].montant).toBe(10);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/donations`);
    expect(req.request.method).toBe('GET');
    req.flush(mockDonations);
  });

  it('should create a donation', () => {
    const newDonation = {
      montant: 50,
      type: 'mensuel' as const,
      donateurNom: 'Test User',
      donateurEmail: 'test@test.com'
    };

    const mockResponse = { id: 1, ...newDonation };

    service.createDonation(newDonation).subscribe(donation => {
      expect(donation.id).toBe(1);
      expect(donation.montant).toBe(50);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/donations`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newDonation);
    req.flush(mockResponse);
  });
});
```

### Tests E2E avec Playwright

**playwright.config.ts**:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests-e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Exemple de test E2E**:

```typescript
// tests-e2e/donation.e2e.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Donation Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/donation');
  });

  test('should display donation form', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('Faire un don');
    await expect(page.locator('input[formControlName="montant"]')).toBeVisible();
  });

  test('should submit donation successfully', async ({ page }) => {
    await page.fill('input[formControlName="montant"]', '50');
    await page.selectOption('select[formControlName="type"]', 'ponctuel');
    await page.fill('input[formControlName="donateurNom"]', 'Jean Dupont');
    await page.fill('input[formControlName="donateurEmail"]', 'jean@example.com');
    
    await page.click('button[type="submit"]');
    
    // Attendre le message de succès
    await expect(page.locator('text=Don créé avec succès')).toBeVisible();
  });

  test('should show validation errors', async ({ page }) => {
    await page.fill('input[formControlName="montant"]', '2');
    await page.fill('input[formControlName="donateurEmail"]', 'invalid-email');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Le montant minimum est de 5€')).toBeVisible();
    await expect(page.locator('text=Email invalide')).toBeVisible();
  });
});
```

**Commandes de test**:

```bash
# Tests unitaires
npm run test

# Tests E2E
npm run test:e2e

# Tests E2E en mode UI
npx playwright test --ui
```

---

## 🚀 Build et déploiement

### Scripts NPM

```json
{
  "scripts": {
    "ng": "ng",
    "start": "ng serve --open",
    "build": "ng build",
    "prod": "ng build --configuration production",
    "watch": "ng build --watch --configuration development",
    "test": "ng test",
    "test:e2e": "npx playwright test --ui",
    "lint": "ng lint",
    "prettier": "prettier --config ./.prettierrc --write \"src/{app,environments}/**/*{.ts,.html,.scss,.json}\"",
    "prettier:verify": "prettier --config ./.prettierrc --check \"src/{app,environments}/**/*{.ts,.html,.scss,.json}\"",
    "prettier:staged": "pretty-quick --staged"
  }
}
```

### Build de développement

```bash
# Serveur de développement
npm start
# ou
ng serve

# L'application sera accessible sur http://localhost:4200
```

### Build de production

```bash
# Build de production
npm run prod
# ou
ng build --configuration production

# Les fichiers sont générés dans dist/angular-tailwind/
```

**Optimisations de production**:
- Minification du code
- Tree-shaking pour éliminer le code inutilisé
- Ahead-of-Time (AOT) compilation
- Lazy loading des modules
- Optimisation des images
- Budgets de taille configurés

### Configuration des budgets

Dans `angular.json`:

```json
{
  "budgets": [
    {
      "type": "initial",
      "maximumWarning": "4mb",
      "maximumError": "5mb"
    },
    {
      "type": "anyComponentStyle",
      "maximumWarning": "150kb",
      "maximumError": "150kb"
    }
  ]
}
```

### Déploiement

**Avec Docker** (voir docker-compose.yml dans le projet):

```yaml
services:
  angular:
    build:
      context: ./src/www/myamana/client/myamana-angular
      dockerfile: Dockerfile
    ports:
      - "4200:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
```

**Déploiement sur serveur statique**:

```bash
# Build de production
npm run prod

# Les fichiers dans dist/angular-tailwind/ peuvent être déployés sur:
# - Nginx
# - Apache
# - Netlify
# - Vercel
# - Firebase Hosting
# etc.
```

**Configuration Nginx**:

```nginx
server {
    listen 80;
    server_name myamana.fr;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache des assets
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Compression gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

---

## 📚 Ressources et références

### Documentation officielle

- **Angular**: https://angular.dev/
- **RxJS**: https://rxjs.dev/
