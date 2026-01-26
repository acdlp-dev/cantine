import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CantineComponent } from './cantine.component';
import { HistoriqueCommandesComponent } from './components/accueil/historique_commandes.component';
import { CommandeComponent } from './components/commande/commande.component';
import { InfosComponent } from '../backoffice/components/infos/infos.component';
import { CantineBlockedComponent } from './components/blocked/cantine-blocked.component';
import { MenuComponent } from './components/menu/menu.component';
import { Info } from 'lucide-angular';

const routes: Routes = [
  {
    path: '',
    component: CantineComponent,
    children: [
      { path: '', component: HistoriqueCommandesComponent },
      { path: 'accueil', component: HistoriqueCommandesComponent },
      { path: 'commande', component: CommandeComponent },
      { path: 'infos', component: InfosComponent },
      { path: 'blocked', component: CantineBlockedComponent },
      { path: 'menu', component: MenuComponent },
      { path: '**', redirectTo: '' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CantineRoutingModule { }
