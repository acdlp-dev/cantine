import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BackofficeComponent } from './backoffice.component';
import { BackofficeRoutingModule } from './backoffice-routing.module';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { InfosComponent } from './components/infos/infos.component';

@NgModule({
  declarations: [
  ],
  imports: [
    CommonModule,
    BackofficeRoutingModule,
    BackofficeComponent,
    SidebarComponent,
    InfosComponent
  ]
})
export class BackofficeModule { }