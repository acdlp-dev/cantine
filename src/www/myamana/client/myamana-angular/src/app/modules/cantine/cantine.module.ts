import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { CantineComponent } from './cantine.component';
import { CantineRoutingModule } from './cantine-routing.module';
import { SidebarComponent } from '../backoffice/components/sidebar/sidebar.component';
import { HistoriqueCommandesComponent } from './components/accueil/historique_commandes.component';
import { CommandeComponent } from './components/commande/commande.component';
import { InfosComponent } from '../backoffice/components/infos/infos.component';
import { Menu } from 'lucide-angular';
import { MenuComponent } from './components/menu/menu.component';

@NgModule({
  declarations: [
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    CantineRoutingModule,
    CantineComponent,
    SidebarComponent,
    HistoriqueCommandesComponent,
    CommandeComponent,
    InfosComponent,
    MenuComponent
  ]
})
export class CantineModule { }
