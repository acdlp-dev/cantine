import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { BackofficeAuthService } from '../../../../modules/backoffice-auth/services/backoffice-auth.service';
// TODO: Authentification cantine à implémenter plus tard
// import { CantineAuthService } from '../../../../modules/cantine-auth/services/cantine-auth.service';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { LucideIconsModule } from '../../../../shared/modules/lucide-icons.module';
import { Subject, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';

interface TabItem {
  key: string;
  label: string;
  icon: string;
  route: string;
  badge?: boolean;
}

interface TabSection {
  key: string;
  label: string;
  items: TabItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    LucideIconsModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() moduleType: 'backoffice' | 'cantine' = 'backoffice';

  isSidebarOpen: boolean = false;

  // Tabs de navigation
  tabs: TabItem[] = [];
  // Sections regroupées pour l'affichage (Backoffice, Cantine, Suivi Véhicule)
  sections: TabSection[] = [];

  activeTab: string = 'backoffice'; // Onglet actif par défaut
  // État d'ouverture des sections (par défaut toutes ouvertes)
  openSections: { [key: string]: boolean } = {};
  // Flag pour l'association spéciale qui doit voir uniquement le flow Cantine admin
  isSpecialCantineAdmin: boolean = false;

  // Gestion des subscriptions
  private destroy$ = new Subject<void>();
  private resizeHandler: (() => void) | null = null;

  constructor(
    private router: Router,
    private backofficeAuthService: BackofficeAuthService,
    // TODO: Authentification cantine à implémenter plus tard
    // private cantineAuthService: CantineAuthService
  ) { }

  ngOnInit(): void {
    if (this.moduleType === 'backoffice') {
      this.backofficeAuthService.getAssoData().pipe(
        takeUntil(this.destroy$),
        catchError(() => of(null))
      ).subscribe({
        next: (asso) => {
          if (asso?.nameAsso?.includes('Au Coeur De La Précarité')) {
            this.isSpecialCantineAdmin = true;
          }
          this.setTabsForModule();
        },
        error: () => {
          this.setTabsForModule();
        }
      });
    } else {
      this.setTabsForModule();
    }

    // Initialiser la sidebar ouverte sur desktop, fermée sur mobile
    this.isSidebarOpen = window.innerWidth >= 768;

    // Écouter les changements de taille d'écran avec cleanup
    this.resizeHandler = () => {
      if (window.innerWidth >= 768) {
        this.isSidebarOpen = true;
      }
    };
    window.addEventListener('resize', this.resizeHandler);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
  }

  private addCantineAdminSection(): void {
    // Ajoute une section dédiée "Cantine admin" réservée à l'association ciblée
    const cantineAdminItems: TabItem[] = [
      { key: 'cantine-admin-voir-commandes', label: 'Voir les commandes', icon: 'shopping-cart', route: '/backoffice/cantine-admin/commandes' },
      { key: 'cantine-admin-zone-distribution', label: 'Zone de distribution', icon: 'map-pin', route: '/backoffice/cantine-admin/zones' },
      { key: 'cantine-admin-quotas', label: 'Quotas', icon: 'bar-chart-2', route: '/backoffice/cantine-admin/quotas' },
      { key: 'cantine-admin-associations', label: 'Associations', icon: 'users', route: '/backoffice/cantine-admin/associations' },
      { key: 'cantine-admin-menus', label: 'Renseigner les Menus', icon: 'square-menu', route: '/backoffice/cantine-admin/menus' }
    ];

    this.sections.push({ key: 'cantine-admin', label: 'Cantine admin', items: cantineAdminItems });

    // Marquer la section comme ouverte par défaut
    this.openSections['cantine-admin'] = true;
  }

  toggleSection(key: string): void {
    this.openSections[key] = !this.openSections[key];
  }

  private setTabsForModule(): void {
    // Réinitialiser les tabs
    this.tabs = [];
    this.sections = [];

    if (this.moduleType === 'cantine') {
      // Cantine standalone : seule la section Cantine est affichée
      const cantineItems: TabItem[] = [
        { key: 'historique-commande', label: 'Historique des Commandes', icon: 'shopping-cart', route: '/cantine' },
        { key: 'commande', label: 'Commande', icon: 'plus-circle', route: '/cantine/commande' },
        { key: 'menu', label: 'Menu', icon: 'square-menu', route: '/cantine/menu' }
      ];

      this.sections.push({ key: 'cantine', label: 'Cantine', items: cantineItems });

  // Compte: Mes infos / Paramètres / Déconnexion
  const accountItems: TabItem[] = [];
  accountItems.push({ key: 'infos', label: 'Mes infos', icon: 'id-card', route: '/backoffice/infos' });
  accountItems.push({ key: 'parametres', label: 'Paramètres', icon: 'settings', route: '/backoffice/parametres' });
  accountItems.push({ key: 'logout', label: 'Déconnexion', icon: 'log-out', route: '/backoffice-auth/sign-in' });
  this.sections.push({ key: 'account', label: 'Compte', items: accountItems });
      return;
    }

    // Cantine integrated section
    if (this.isSpecialCantineAdmin) {
      // Pour l'association spéciale, n'afficher que le flow Cantine admin
      const cantineAdminItems: TabItem[] = [
        { key: 'cantine-admin-voir-commandes', label: 'Voir les commandes', icon: 'shopping-cart', route: '/backoffice/cantine-admin/commandes' },
        { key: 'cantine-admin-zone-distribution', label: 'Zone de distribution', icon: 'map-pin', route: '/backoffice/cantine-admin/zones' },
        { key: 'cantine-admin-quotas', label: 'Quotas', icon: 'bar-chart-2', route: '/backoffice/cantine-admin/quotas' },
        { key: 'cantine-admin-associations', label: 'Associations', icon: 'users', route: '/backoffice/cantine-admin/associations' },
        { key: 'cantine-admin-menus', label: 'Renseigner les Menus', icon: 'square-menu', route: '/backoffice/cantine-admin/menus' }
      ];
      this.sections.push({ key: 'cantine-admin', label: 'Cantine admin', items: cantineAdminItems });
    } else {
      const cantineItems: TabItem[] = [
        { key: 'cantine', label: 'Commandes Cantine', icon: 'shopping-cart', route: '/backoffice/cantine' },
        { key: 'cantine/commande', label: 'Nouvelle Commande', icon: 'plus-circle', route: '/backoffice/cantine/commande' },
        { key: 'cantine/menu', label: 'Menu Cantine', icon: 'square-menu', route: '/backoffice/cantine/menu' }
      ];
      this.sections.push({ key: 'cantine', label: 'Cantine', items: cantineItems });
    }

    // Suivi véhicule section
    this.sections.push({ key: 'vehicule', label: 'Suivi Véhicule', items: [{ key: 'vehicule', label: 'Suivi Véhicule', icon: 'car', route: '/backoffice/vehicule' }] });

    // Bénévolat section
    const benevolatItems: TabItem[] = [
      { key: 'benevolat-benevoles', label: 'Bénévoles', icon: 'users', route: '/backoffice/benevolat/benevoles' },
      { key: 'benevolat-actions', label: 'Créer une action', icon: 'plus-circle', route: '/backoffice/benevolat/actions' },
      { key: 'benevolat-actions-list', label: 'Liste des actions', icon: 'list', route: '/backoffice/benevolat/actions-list' },
      { key: 'benevolat-calendar', label: 'Calendrier', icon: 'calendar', route: '/backoffice/benevolat/calendar' },
      { key: 'benevolat-attestations', label: 'Attestations', icon: 'file-text', route: '/backoffice/benevolat/attestations' }
    ];
    this.sections.push({ key: 'benevolat', label: 'Bénévolat', items: benevolatItems });

    // Bénéficiaires section
    const beneficiariesItems: TabItem[] = [
      { key: 'beneficiaires/cartes-repas', label: 'Cartes Repas', icon: 'qr-code', route: '/backoffice/beneficiaires/cartes-repas' },
      { key: 'beneficiaires/cartes-liste', label: 'Cartes générées', icon: 'list', route: '/backoffice/beneficiaires/cartes-liste' },
      { key: 'beneficiaires/recuperations', label: 'Récupérations', icon: 'list', route: '/backoffice/beneficiaires/recuperations' }
    ];
    this.sections.push({ key: 'beneficiaires', label: 'Bénéficiaires', items: beneficiariesItems });

    // Account / Logout section at the end
    const accountItems: TabItem[] = [];
    accountItems.push({ key: 'infos', label: 'Mes infos', icon: 'id-card', route: '/backoffice/infos' });
    accountItems.push({ key: 'parametres', label: 'Paramètres', icon: 'settings', route: '/backoffice/parametres' });
    accountItems.push({ key: 'logout', label: 'Déconnexion', icon: 'log-out', route: '/backoffice-auth/sign-in' });
    this.sections.push({ key: 'account', label: 'Compte', items: accountItems });

    // Initialiser l'état d'ouverture pour chaque section (par défaut ouvert)
    this.sections.forEach(s => {
      if (this.openSections[s.key] === undefined) {
        this.openSections[s.key] = true;
      }
    });
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebarOnMobile(): void {
    if (window.innerWidth < 768) {
      this.isSidebarOpen = false;
    }
  }

  // Vérifier si un onglet est actif
  isActiveTab(key: string): boolean {
    if (this.moduleType === 'cantine') {
      // Pour le module cantine standalone
      if (key === 'historique-commande') {
        return this.router.url.endsWith('/cantine') || this.router.url.endsWith('/cantine/');
      }
      if (key === 'backoffice') {
        return false; // Le lien vers le backoffice n'est jamais "actif" dans ce contexte
      }
      return this.router.url.includes(`/cantine/${key}`);
    } else {
      // Pour le module backoffice
      if (key === 'dashboard') {
        return this.router.url.endsWith('/backoffice/accueil') || this.router.url.endsWith('/backoffice/accueil/');
      }

      // Gestion des routes de la cantine intégrée
      if (key === 'cantine') {
        return this.router.url.endsWith('/backoffice/cantine') || this.router.url.endsWith('/backoffice/cantine/');
      }

      // Pour les autres routes de cantine comme "cantine/menu"
      if (key.includes('/')) {
        return this.router.url.endsWith('/backoffice/' + key);
      }

      // Gestion standard pour les autres routes
      return this.router.url.includes(`/backoffice/${key}`);
    }
  }

  // Méthodes manquantes dans votre composant
  onTabClick(tabKey: string): void {
    this.activeTab = tabKey;
    // Logique supplémentaire lors du clic sur un onglet
  }

  getInitials(): string {
    // Supposons que nous retournions les initiales de l'utilisateur connecté
    // Cette méthode pourrait récupérer les données depuis un service d'authentification
    return 'YA'; // Exemple d'initiales
  }

  onLogout(): void {
    if (this.moduleType === 'cantine') {
      this.router.navigate(['/']);
    } else {
      this.backofficeAuthService.logout();
    }
  }
}
