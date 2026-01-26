import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BackofficeComponent } from './backoffice.component';
import { BackofficeRoutingModule } from './backoffice-routing.module';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { AccueilComponent } from './components/accueil/accueil.component';
import { DonsBackOffice } from './components/dons/dons.component';
import { AbonnementsComponent } from './components/abonnements/abonnements.component';
import { CampagnesComponent } from './components/campagnes/campagnes.component';
import { RecusComponent } from './components/recu/recu.component';
import { InfosComponent } from './components/infos/infos.component';

@NgModule({
  declarations: [
  ],
  imports: [
    CommonModule,
    BackofficeRoutingModule,
    BackofficeComponent,
    SidebarComponent,
    AccueilComponent,
    DonsBackOffice,
    AbonnementsComponent,
    CampagnesComponent,
    RecusComponent,
    InfosComponent
  ]
})
export class BackofficeModule { }