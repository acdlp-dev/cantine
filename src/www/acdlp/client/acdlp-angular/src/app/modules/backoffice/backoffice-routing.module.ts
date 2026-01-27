import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BackofficeComponent } from './backoffice.component';
import { InfosComponent } from './components/infos/infos.component';
import { OnboardingComponent } from './components/onboarding/onboarding.component';
import { OnboardingGuard } from '../../guards/onboarding.guard';
import { FeatureAccessGuard } from '../../guards/feature-access.guard';
import { ParametresComponent } from './components/parametres/parametres.component';
import { ResetOnboardingComponent } from './components/reset-onboarding/reset-onboarding.component';

const routes: Routes = [
  {
    path: 'onboarding',
    component: OnboardingComponent
  },
  {
    path: 'reset-onboarding',
  component: ResetOnboardingComponent
  },
  {
    path: '',
    component: BackofficeComponent,
    children: [
      { 
        path: '', 
        redirectTo: 'benevolat/benevoles', 
        pathMatch: 'full'
      },

      // Routes pour les informations générales et paramètres
      { path: 'infos', component: InfosComponent },
      
      // Support tickets (admin MyAmana)
      {
        path: 'support',
        loadComponent: () => import('./components/support-tickets/support-tickets.component').then(c => c.SupportTicketsComponent)
      },
      { path: 'parametres', component: ParametresComponent },
      
      // Assistance (page de suivi des tickets pour les associations)
      {
        path: 'assistance',
        loadComponent: () => import('./components/assistance/assistance.component').then(c => c.AssistanceComponent)
      },
      
      // Routes pour la cantine intégrée au backoffice
      { 
        path: 'cantine', 
        loadComponent: () => import('../cantine/components/accueil/historique_commandes.component').then(c => c.HistoriqueCommandesComponent),
        canActivate: [FeatureAccessGuard],
        data: { requiredFeature: 'cantine' }
      },
      { 
        path: 'cantine/commande', 
        loadComponent: () => import('../cantine/components/commande/commande.component').then(c => c.CommandeComponent),
        canActivate: [FeatureAccessGuard],
        data: { requiredFeature: 'cantine' }
      },
      { 
        path: 'cantine/menu', 
        loadComponent: () => import('../cantine/components/menu/menu.component').then(c => c.MenuComponent),
        canActivate: [FeatureAccessGuard],
        data: { requiredFeature: 'cantine' }
      },
      // Cantine admin (spécifique pour certaines associations)
      { 
        path: 'cantine-admin/quotas',
        loadComponent: () => import('../cantineAdmin/components/quotas/quotas.component').then(c => c.QuotasComponent),
        // accès contrôlé via flag spécial géré côté sidebar / feature logic
      },
      {
        path: 'cantine-admin/zones',
        loadComponent: () => import('../cantineAdmin/components/zoneCommande/zoneCommande.component').then(c => c.ZoneCommandeComponent)
      },
      { 
        path: 'cantine-admin/associations',
        loadComponent: () => import('../cantineAdmin/components/associations/associations.component').then(c => c.AssociationsComponent)
      },
      {
        path: 'cantine-admin/commandes',
        loadComponent: () => import('../cantineAdmin/components/historiqueCommandeAdmin/historique_commandes_admin.component').then(c => c.HistoriqueCommandesAdminComponent)
      },
        {
          path: 'cantine-admin/menus',
          loadComponent: () => import('../cantineAdmin/components/menusAdmin/menusAdmin.component').then(c => c.MenusAdminComponent)
        },
      
      // Routes pour le suivi de véhicule
      { 
        path: 'vehicule', 
        loadComponent: () => import('./components/vehicule/vehicule.component').then(c => c.VehiculeComponent),
        canActivate: [FeatureAccessGuard],
        data: { requiredFeature: 'suiviVehicule' }
      },
      
      // Routes pour le bénévolat
      { 
        path: 'benevolat/benevoles',
        loadComponent: () => import('./components/benevolat-list/benevolat-list.component').then(c => c.BenevolatListComponent),
        canActivate: [FeatureAccessGuard],
        data: { requiredFeature: 'benevolat' }
      },
      { 
        path: 'benevolat/actions',
        loadComponent: () => import('./components/benevolat-actions/benevolat-actions.component').then(c => c.BenevolatActionsComponent),
        canActivate: [FeatureAccessGuard],
        data: { requiredFeature: 'benevolat' }
      },
      { 
        path: 'benevolat/actions-list',
        loadComponent: () => import('./components/benevolat-actions-list/benevolat-actions-list.component').then(c => c.BenevolatActionsListComponent),
        canActivate: [FeatureAccessGuard],
        data: { requiredFeature: 'benevolat' }
      },
      { 
        path: 'benevolat/attestations',
        loadComponent: () => import('./components/benevolat-attestations/benevolat-attestations.component').then(c => c.BenevolatAttestationsComponent),
        canActivate: [FeatureAccessGuard],
        data: { requiredFeature: 'benevolat' }
      },
      { 
        path: 'benevolat/calendar',
        loadComponent: () => import('./components/benevolat-calendar/benevolat-calendar.component').then(c => c.BenevolatCalendarComponent),
        canActivate: [FeatureAccessGuard],
        data: { requiredFeature: 'benevolat' }
      },

      // Bénéficiaires / Cartes repas
      {
        path: 'beneficiaires/cartes-repas',
        loadComponent: () => import('../benevolat/pages/qrcode-generate/qrcode-generate.component').then(c => c.QrcodeGenerateComponent)
      },
      {
        path: 'beneficiaires/cartes-liste',
        loadComponent: () => import('./components/beneficiaires-cartes/beneficiaires-cartes.component').then(c => c.BeneficiairesCartesComponent)
      },
      {
        path: 'beneficiaires/recuperations',
        loadComponent: () => import('../benevolat/pages/qrcode-list/qrcode-list.component').then(c => c.QrcodeListComponent)
      },
      
      { path: '**', redirectTo: '' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BackofficeRoutingModule { }
