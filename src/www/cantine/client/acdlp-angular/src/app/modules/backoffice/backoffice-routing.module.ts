import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BackofficeComponent } from './backoffice.component';
import { InfosComponent } from './components/infos/infos.component';
import { ParametresComponent } from './components/parametres/parametres.component';

const routes: Routes = [
  {
    path: '',
    component: BackofficeComponent,
    children: [
      {
        path: '',
        redirectTo: 'cantine',
        pathMatch: 'full'
      },

      // Routes pour les informations générales et paramètres
      { path: 'infos', component: InfosComponent },

      { path: 'parametres', component: ParametresComponent },

      // Routes pour la cantine intégrée au backoffice
      {
        path: 'cantine',
        loadComponent: () => import('../cantine/components/accueil/historique_commandes.component').then(c => c.HistoriqueCommandesComponent),
      },
      {
        path: 'cantine/commande',
        loadComponent: () => import('../cantine/components/commande/commande.component').then(c => c.CommandeComponent),
      },
      {
        path: 'cantine/menu',
        loadComponent: () => import('../cantine/components/menu/menu.component').then(c => c.MenuComponent),
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
