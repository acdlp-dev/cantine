# Documentation Angular - ACDLP

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

ACDLP est une application Angular moderne construite avec **Angular 18** en utilisant l'approche **standalone components**. L'application est dédiée à la gestion de bénévoles, de la cantine solidaire et du suivi de véhicules pour l'association "Au Cœur de la Précarité".

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
│   ├── backoffice/         # Administration ACDLP
│   ├── backoffice-auth/    # Authentification admin
│   ├── benevolat/          # Gestion bénévolat
│   ├── cantine/            # Module cantine publique
│   ├── cantineAdmin/       # Admin distribution repas
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
  apiUrl: 'https://api.acdlp.fr/api'
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
        acdlp: {
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
modules/benevolat/
├── benevolat-routing.module.ts      # Routes du module
├── benevolat.component.ts           # Composant principal
├── benevolat.module.ts              # Déclaration du module
├── pages/                           # Pages du module
│   ├── volunteer-signin/
│   ├── volunteer-form/
│   ├── volunteer-dashboard/
│   └── volunteer-actions/
└── services/                        # Services du module
    └── action.service.ts
```

---

## 🧩 Modules principaux

### 1. Backoffice Module

**Responsabilité**: Interface d'administration pour gérer l'association ACDLP

**Fonctionnalités**:
- Gestion des bénévoles et actions
- Gestion de la cantine solidaire
- Gestion des commandes et quotas
- Suivi véhicules
- Paramètres de l'association
- Onboarding des nouveaux admins
- Tours guidés (Driver.js)

**Composants principaux**:
- `BenevolatListComponent` - Liste des bénévoles
- `BenevolatActionsComponent` - Gestion des actions
- `BenevolatCalendrierComponent` - Calendrier des actions
- `CantineCommandesComponent` - Gestion commandes repas
- `CantineQuotasComponent` - Gestion quotas journaliers
- `BeneficiairesCartesComponent` - Gestion cartes repas
- `VehiculeComponent` - Suivi véhicules
- `InfosComponent` - Paramètres association

**Services**:
- `OnboardingService` - Gestion de l'onboarding
- `AutoTourService` - Tours guidés automatiques
- `BenevolatAdminService` - Gestion admin bénévolat

### 2. Backoffice Auth Module

**Responsabilité**: Authentification pour les administrateurs ACDLP

**Routes**:
- `/backoffice-auth/sign-in` - Connexion admin
- `/backoffice-auth/sign-up` - Inscription admin

**Service**:
- `BackofficeAuthService` - Authentification admin

**Sécurité**:
- JWT stocké dans cookies HttpOnly
- Validation email obligatoire
- Vérification SIREN via API INSEE

### 3. Benevolat Module

**Responsabilité**: Espace bénévole pour gérer les inscriptions et actions

**Fonctionnalités**:
- Inscription des bénévoles avec OTP
- Authentification bénévole
- Tableau de bord bénévole
- Inscription aux actions
- Historique des participations
- Génération et scan cartes repas QR Code

**Pages**:
- `volunteer-signin` - Connexion
- `volunteer-form` - Formulaire d'inscription
- `volunteer-dashboard` - Tableau de bord
- `volunteer-actions` - Liste des actions disponibles
- `volunteer-otp-verification` - Vérification OTP (6 chiffres)
- `volunteer-qrcode-generate` - Génération cartes repas
- `volunteer-qrcode-scan` - Scan cartes repas
- `volunteer-qrcode-list` - Liste des distributions

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
  responsable_email: string;
  recurrence: 'Aucune' | 'Quotidienne' | 'Hebdomadaire';
}

// volunteer.model.ts
export interface Volunteer {
  id: number;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  statut: 'restreint' | 'confirmé' | 'responsable';
  actionsParticipees: number[];
}
```

### 4. Cantine Module

**Responsabilité**: Interface publique pour commander des repas

**Caractéristiques**:
- Affichage du menu du jour
- Formulaire de commande
- Planification de livraison
- Gestion des zones

### 5. CantineAdmin Module

**Responsabilité**: Gestion de la distribution des repas (backoffice)

**Fonctionnalités**:
- Gestion des commandes (validation, annulation)
- Gestion des quotas journaliers
- Tracking des distributions
- Génération de rapports
- Gestion des menus
- Gestion des zones de livraison

### 6. Layout Module

**Responsabilité**: Structure commune des pages (navbar, sidebar, footer)

**Composants**:
- Navbar
- Sidebar avec navigation
- Footer
- Breadcrumb

### 7. Error Module

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

### Layout Routing

**layout-routing.module.ts**:
```typescript
const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'backoffice', pathMatch: 'full' },
      {
        path: 'backoffice',
        loadChildren: () => import('../backoffice/backoffice.module')
          .then(m => m.BackofficeModule)
      }
    ]
  }
];
```

### Backoffice Routing

**backoffice-routing.module.ts**:
```typescript
const routes: Routes = [
  {
    path: '',
    component: BackofficeComponent,
    canActivate: [BackofficeAuthGuard],
    children: [
      { path: '', redirectTo: 'benevolat/benevoles', pathMatch: 'full' },
      // Bénévoles
      { path: 'benevolat/benevoles', component: BenevolatListComponent },
      { path: 'benevolat/actions', component: BenevolatActionsComponent },
      { path: 'benevolat/calendrier', component: BenevolatCalendrierComponent },
      // Cantine
      { path: 'cantine/commandes', component: CantineCommandesComponent },
      { path: 'cantine/quotas', component: CantineQuotasComponent },
      // Bénéficiaires
      { path: 'beneficiaires/cartes', component: BeneficiairesCartesComponent },
      // Véhicule
      { path: 'vehicule', component: VehiculeComponent },
      // Paramètres
      { path: 'infos', component: InfosComponent }
    ]
  }
];
```

### Lazy Loading

Tous les modules sont chargés à la demande (lazy loaded) pour optimiser les performances:

```typescript
// Au lieu de :
import { BenevolatModule } from './modules/benevolat/benevolat.module';

// On utilise :
loadChildren: () => import('./modules/benevolat/benevolat.module')
  .then((m) => m.BenevolatModule)
```

**Avantages**:
- Réduction de la taille du bundle initial
- Chargement plus rapide de l'application
- Meilleure expérience utilisateur

---

## 🔧 Services et gestion d'état

### BackofficeAuthService

**Localisation**: `src/app/modules/backoffice-auth/services/backoffice-auth.service.ts`

**Responsabilité**: Gestion de l'authentification admin avec cookies HttpOnly

```typescript
@Injectable({
  providedIn: 'root',
})
export class BackofficeAuthService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  // Connexion admin
  signIn(email: string, password: string): Observable<any> {
    const body = { email, password };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post<any>(`${this.apiUrl}/backoffice/signin`, body, {
      headers,
      withCredentials: true  // Important pour les cookies
    }).pipe(
      tap(() => {
        this.router.navigate(['/backoffice']);
      }),
      catchError((error) => {
        console.error('Error during sign in:', error);
        return throwError(() => error);
      })
    );
  }

  // Inscription admin
  signUp(userData: any): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post<any>(
      `${this.apiUrl}/backoffice/signup`,
      userData,
      { headers, withCredentials: true }
    );
  }

  // Déconnexion
  logout(): void {
    this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true })
      .subscribe({
        next: () => {
          this.router.navigate(['/backoffice-auth/sign-in']);
        },
        error: (error) => {
          console.error('Error during logout:', error);
          this.router.navigate(['/backoffice-auth/sign-in']);
        }
      });
  }

  // Récupération des données admin
  getAdminData(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/backoffice/me`, {
      withCredentials: true
    });
  }
}
```

### ActionService

**Localisation**: `src/app/modules/benevolat/services/action.service.ts`

**Responsabilité**: Gestion des actions bénévoles

```typescript
@Injectable({
  providedIn: 'root'
})
export class ActionService {
  private apiUrl = `${environment.apiUrl}/benevolat`;

  constructor(private http: HttpClient) {}

  // Récupérer les actions d'une association
  getActions(associationName: string): Observable<Action[]> {
    return this.http.get<Action[]>(
      `${this.apiUrl}/actions/${associationName}`,
      { withCredentials: true }
    );
  }

  // Inscription à une action
  registerToAction(actionId: number, benevolId: number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/actions/${actionId}/register`,
      { benevolId },
      { withCredentials: true }
    );
  }

  // Récupérer mes inscriptions
  getMyRegistrations(): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/my-registrations`,
      { withCredentials: true }
    );
  }
}
```

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
    color: 'acdlp'
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

### SupportService

**Localisation**: `src/app/shared/services/support.service.ts`

**Responsabilité**: Gestion du système de tickets support (Trello)

```typescript
@Injectable({
  providedIn: 'root'
})
export class SupportService {
  private apiUrl = `${environment.apiUrl}/support`;

  constructor(private http: HttpClient) {}

  // Créer un ticket
  createTicket(ticket: any): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/tickets`,
      ticket,
      { withCredentials: true }
    );
  }

  // Récupérer mes tickets
  getMyTickets(): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/my-tickets`,
      { withCredentials: true }
    );
  }
}
```

---

## 🛡️ Guards et sécurité

### BackofficeAuthGuard

**Localisation**: `src/app/guards/backoffice-auth.guard.ts`

**Responsabilité**: Protection des routes admin du backoffice

```typescript
@Injectable({
  providedIn: 'root',
})
export class BackofficeAuthGuard implements CanActivate {
  constructor(
    private backofficeAuthService: BackofficeAuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.backofficeAuthService.isAuthenticated().pipe(
      map((isAuthenticated) => {
        if (isAuthenticated) {
          return true;
        } else {
          return this.router.createUrlTree(['/backoffice-auth/sign-in']);
        }
      }),
      catchError((err) => {
        console.error("Erreur lors de la vérification de l'authentification", err);
        return of(this.router.createUrlTree(['/backoffice-auth/sign-in']));
      })
    );
  }
}
```

**Utilisation**:
```typescript
const routes: Routes = [
  {
    path: 'backoffice',
    loadChildren: () => import('./modules/backoffice/backoffice.module')
      .then(m => m.BackofficeModule),
    canActivate: [BackofficeAuthGuard]  // Protection de la route
  }
];
```

### FeatureAccessGuard

**Localisation**: `src/app/guards/feature-access.guard.ts`

**Responsabilité**: Contrôle d'accès basé sur les fonctionnalités activées (cantine, bénévoles)

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
    NgxSonnerToaster,
    SupportWidgetComponent
  ],
})
export class AppComponent implements OnInit {
  title = 'ACDLP';

  constructor(
    public themeService: ThemeService,
    private backofficeAuthService: BackofficeAuthService,
    private router: Router
  ) {}

  ngOnInit() {
    console.log('=== ACDLP App Initialization ===');
    // Vérifier l'authentification au démarrage
    this.backofficeAuthService.isAuthenticated().subscribe((isAuth: boolean) => {
      console.log('App Component - Auth status:', isAuth);
    });
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
registerToAction(actionId: number): Observable<any> {
  const body = { actionId };
  const headers = new HttpHeaders({
    'Content-Type': 'application/json'
  });

  return this.http.post<any>(
    `${this.apiUrl}/benevolat/actions/${actionId}/register`,
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
getVolunteers(): Observable<any[]> {
  return this.http.get<any[]>(
    `${this.apiUrl}/backoffice/benevolat/benevoles`,
    {
      withCredentials: true
    }
  );
}
```

### Gestion des erreurs

```typescript
import { catchError, throwError } from 'rxjs';

createAction(data: any): Observable<any> {
  return this.http.post(`${this.apiUrl}/benevolat/actions`, data, {
    withCredentials: true
  }).pipe(
    catchError((error) => {
      console.error('Erreur lors de la création de l\'action:', error);

      // Gestion personnalisée selon le code d'erreur
      if (error.status === 401) {
        this.router.navigate(['/backoffice-auth/sign-in']);
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

getActions(): Observable<Action[]> {
  return this.http.get<any[]>(`${this.apiUrl}/benevolat/actions/acdlp`, {
    withCredentials: true
  }).pipe(
    map(data => data.map(item => ({
      id: item.id,
      nom: item.nom,
      date: new Date(item.date_action),
      lieu: item.ville
    })))
  );
}
```

**Combinaison d'observables**:
```typescript
import { forkJoin } from 'rxjs';

loadDashboardData(): Observable<any> {
  return forkJoin({
    volunteers: this.getVolunteers(),
    actions: this.getActions(),
    orders: this.getOrders()
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
    Gestion Bénévoles
  </h2>
  <p class="text-gray-600 dark:text-gray-300">
    Liste des bénévoles inscrits
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
import { faUsers, faCalendar } from '@fortawesome/free-solid-svg-icons';

@Component({
  standalone: true,
  imports: [FontAwesomeModule],
  template: `
    <fa-icon [icon]="faUsers"></fa-icon>
  `
})
export class MyComponent {
  faUsers = faUsers;
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
toast.success('Inscription à l\'action réussie !');

// Erreur
toast.error('Une erreur est survenue');

// Information
toast.info('Traitement en cours...');

// Avertissement
toast.warning('Attention, cette action est irréversible');
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
  "angular-svg-icon": "^13.0.0",

  // Charts & Visualisation
  "apexcharts": "^3.35.3",
  "ng-apexcharts": "^1.7.1",

  // Éditeurs
  "ngx-quill": "^26.0.6",
  "quill": "^2.0.2",

  // UI Components & Utilities
  "ngx-sonner": "^2.0.1",
  "driver.js": "^1.3.6",

  // Core
  "rxjs": "~7.4.0",
  "tslib": "^2.3.0",
  "zone.js": "~0.14.2"
}
```

### Dépendances expliquées

#### ApexCharts (`apexcharts`, `ng-apexcharts`)
Bibliothèque de graphiques interactive pour visualiser les statistiques bénévoles, commandes cantine, etc.

```typescript
import { NgApexchartsModule } from 'ng-apexcharts';

// Configuration d'un graphique
chartOptions = {
  series: [{
    name: "Inscriptions",
    data: [10, 41, 35, 51, 49, 62, 69]
  }],
  chart: {
    type: "line",
    height: 350
  },
  xaxis: {
    categories: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  }
};
```

#### Driver.js (`driver.js`)
Création de tours guidés pour l'onboarding des administrateurs.

```typescript
import { driver } from 'driver.js';

const driverObj = driver({
  showProgress: true,
  steps: [
    {
      element: '#benevoles-menu',
      popover: {
        title: 'Gestion Bénévoles',
        description: 'Gérez vos bénévoles et leurs inscriptions'
      }
    },
    {
      element: '#cantine-menu',
      popover: {
        title: 'Cantine Solidaire',
        description: 'Gérez les commandes et la distribution de repas'
      }
    }
  ]
});

driverObj.drive();
```

#### Quill (`quill`, `ngx-quill`)
Éditeur de texte riche pour la création de descriptions d'actions.

```typescript
import { QuillModule } from 'ngx-quill';

@Component({
  template: `
    <quill-editor
      [(ngModel)]="description"
      [modules]="quillModules">
    </quill-editor>
  `
})
export class ActionFormComponent {
  description = '';
  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      ['link']
    ]
  };
}
```

---

## 💡 Exemples de code

### 1. Service pour gérer les actions bénévoles

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface Action {
  id: number;
  nom: string;
  description: string;
  date: Date;
  lieu: string;
  nb_participants: number;
  responsable_email: string;
}

@Injectable({
  providedIn: 'root'
})
export class ActionService {
  private apiUrl = `${environment.apiUrl}/benevolat`;

  constructor(private http: HttpClient) {}

  // Récupérer toutes les actions
  getActions(associationName: string): Observable<Action[]> {
    return this.http.get<any[]>(`${this.apiUrl}/actions/${associationName}`, {
      withCredentials: true
    }).pipe(
      map(data => data.map(item => this.mapToAction(item))),
      catchError(this.handleError)
    );
  }

  // Créer une nouvelle action
  createAction(action: Partial<Action>): Observable<Action> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post<any>(`${this.apiUrl}/actions`, action, {
      headers,
      withCredentials: true
    }).pipe(
      map(data => this.mapToAction(data)),
      tap(() => console.log('Action créée avec succès')),
      catchError(this.handleError)
    );
  }

  // Inscription à une action
  registerToAction(actionId: number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/actions/${actionId}/register`,
      {},
      { withCredentials: true }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Mapper les données de l'API vers notre modèle
  private mapToAction(data: any): Action {
    return {
      id: data.id,
      nom: data.nom,
      description: data.description,
      date: new Date(data.date_action),
      lieu: data.ville,
      nb_participants: data.nb_participants,
      responsable_email: data.responsable_email
    };
  }

  // Gestion des erreurs
  private handleError(error: any): Observable<never> {
    console.error('Erreur API:', error);
    let errorMessage = 'Une erreur est survenue';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      errorMessage = `Code: ${error.status}\nMessage: ${error.message}`;
    }

    return throwError(() => new Error(errorMessage));
  }
}
```

### 2. Formulaire réactif pour inscription bénévole

```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { toast } from 'ngx-sonner';

@Component({
  selector: 'app-volunteer-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 class="text-2xl font-bold mb-6">Inscription Bénévole</h2>

      <form [formGroup]="volunteerForm" (ngSubmit)="onSubmit()">
        <!-- Nom -->
        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">Nom</label>
          <input
            type="text"
            formControlName="nom"
            class="w-full px-4 py-2 border rounded-lg"
            [class.border-red-500]="nom?.invalid && nom?.touched"
          />
          <div *ngIf="nom?.invalid && nom?.touched" class="text-red-500 text-sm mt-1">
            Le nom est requis
          </div>
        </div>

        <!-- Prénom -->
        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">Prénom</label>
          <input
            type="text"
            formControlName="prenom"
            class="w-full px-4 py-2 border rounded-lg"
            [class.border-red-500]="prenom?.invalid && prenom?.touched"
          />
        </div>

        <!-- Email -->
        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">Email</label>
          <input
            type="email"
            formControlName="email"
            class="w-full px-4 py-2 border rounded-lg"
            [class.border-red-500]="email?.invalid && email?.touched"
          />
          <div *ngIf="email?.invalid && email?.touched" class="text-red-500 text-sm mt-1">
            <span *ngIf="email?.errors?.['required']">L'email est requis</span>
            <span *ngIf="email?.errors?.['email']">Email invalide</span>
          </div>
        </div>

        <!-- Téléphone -->
        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">Téléphone</label>
          <input
            type="tel"
            formControlName="telephone"
            class="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <button
          type="submit"
          [disabled]="volunteerForm.invalid || isSubmitting"
          class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          <span *ngIf="!isSubmitting">S'inscrire</span>
          <span *ngIf="isSubmitting">Traitement en cours...</span>
        </button>
      </form>
    </div>
  `
})
export class VolunteerFormComponent implements OnInit {
  volunteerForm!: FormGroup;
  isSubmitting = false;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.volunteerForm = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', Validators.required]
    });
  }

  get nom() { return this.volunteerForm.get('nom'); }
  get prenom() { return this.volunteerForm.get('prenom'); }
  get email() { return this.volunteerForm.get('email'); }
  get telephone() { return this.volunteerForm.get('telephone'); }

  onSubmit(): void {
    if (this.volunteerForm.valid) {
      this.isSubmitting = true;
      console.log('Inscription:', this.volunteerForm.value);

      // Simuler l'envoi
      setTimeout(() => {
        toast.success('Inscription réussie !');
        this.volunteerForm.reset();
        this.isSubmitting = false;
      }, 1500);
    }
  }
}
```

### 3. Guard pour protéger les routes backoffice

```typescript
import { Injectable } from '@angular/core';
import { Router, CanActivate, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BackofficeAuthService } from '../modules/backoffice-auth/services/backoffice-auth.service';

@Injectable({
  providedIn: 'root',
})
export class BackofficeAuthGuard implements CanActivate {
  constructor(
    private backofficeAuthService: BackofficeAuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.backofficeAuthService.isAuthenticated().pipe(
      map((isAuthenticated) => {
        if (isAuthenticated) {
          console.log("✅ Accès backoffice autorisé");
          return true;
        } else {
          console.warn("❌ Accès backoffice refusé : redirection connexion");
          return this.router.createUrlTree(['/backoffice-auth/sign-in']);
        }
      }),
      catchError((err) => {
        console.error("Erreur vérification authentification", err);
        return of(this.router.createUrlTree(['/backoffice-auth/sign-in']));
      })
    );
  }
}
```

---

## 🧪 Tests

### Tests unitaires avec Karma/Jasmine

**Exemple de test de composant**:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VolunteerFormComponent } from './volunteer-form.component';
import { ReactiveFormsModule } from '@angular/forms';

describe('VolunteerFormComponent', () => {
  let component: VolunteerFormComponent;
  let fixture: ComponentFixture<VolunteerFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VolunteerFormComponent, ReactiveFormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(VolunteerFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty values', () => {
    expect(component.volunteerForm.get('nom')?.value).toBe('');
    expect(component.volunteerForm.get('email')?.value).toBe('');
  });

  it('should mark form as invalid when email is invalid', () => {
    component.volunteerForm.patchValue({ email: 'invalid-email' });
    expect(component.volunteerForm.get('email')?.valid).toBeFalse();
  });

  it('should mark form as valid when all fields are filled correctly', () => {
    component.volunteerForm.patchValue({
      nom: 'Dupont',
      prenom: 'Jean',
      email: 'jean@example.com',
      telephone: '0612345678'
    });
    expect(component.volunteerForm.valid).toBeTrue();
  });
});
```

**Exemple de test de service**:

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ActionService } from './action.service';
import { environment } from 'src/environments/environment';

describe('ActionService', () => {
  let service: ActionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ActionService]
    });
    service = TestBed.inject(ActionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch actions', () => {
    const mockActions = [
      {
        id: 1,
        nom: 'Distribution alimentaire',
        date_action: '2024-01-01',
        ville: 'Paris'
      }
    ];

    service.getActions('acdlp').subscribe(actions => {
      expect(actions.length).toBe(1);
      expect(actions[0].nom).toBe('Distribution alimentaire');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/benevolat/actions/acdlp`);
    expect(req.request.method).toBe('GET');
    req.flush(mockActions);
  });
});
```

### Tests E2E avec Playwright

**Exemple de test E2E**:

```typescript
// tests-e2e/volunteer.e2e.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Volunteer Registration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/benevolat/form');
  });

  test('should display registration form', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('Inscription Bénévole');
    await expect(page.locator('input[formControlName="nom"]')).toBeVisible();
  });

  test('should submit registration successfully', async ({ page }) => {
    await page.fill('input[formControlName="nom"]', 'Dupont');
    await page.fill('input[formControlName="prenom"]', 'Jean');
    await page.fill('input[formControlName="email"]', 'jean@example.com');
    await page.fill('input[formControlName="telephone"]', '0612345678');

    await page.click('button[type="submit"]');

    await expect(page.locator('text=Inscription réussie')).toBeVisible();
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
    "test:e2e": "npx playwright test --ui"
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
- Budgets de taille configurés

### Configuration des budgets

Dans `angular.json`:

```json
{
  "budgets": [
    {
      "type": "initial",
      "maximumWarning": "3mb",
      "maximumError": "4mb"
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

**Avec Docker** (voir docker-compose.yml):

```yaml
services:
  angular:
    build:
      context: ./src/www/acdlp/client/acdlp-angular
      dockerfile: Dockerfile
    ports:
      - "4200:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
```

**Configuration Nginx**:

```nginx
server {
    listen 80;
    server_name acdlp.fr;
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
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```

---

## 📚 Ressources et références

### Documentation officielle

- **Angular**: https://angular.dev/
- **RxJS**: https://rxjs.dev/
- **Tailwind CSS**: https://tailwindcss.com/
- **Driver.js**: https://driverjs.com/
- **ApexCharts**: https://apexcharts.com/

---

**Dernière mise à jour**: 2026-01-26
