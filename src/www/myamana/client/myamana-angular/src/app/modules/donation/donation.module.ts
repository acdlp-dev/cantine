import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DonationRoutingModule } from './donation-routing.module';
import { DonationComponent } from './donation.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@NgModule({
  imports: [
    CommonModule, 
    DonationRoutingModule, 
    DonationComponent,
    FormsModule,
    ReactiveFormsModule,
    FontAwesomeModule
  ],
})
export class DonationModule {}
