import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DonationComponent } from './donation.component';
import { OneTimeDonationComponent } from './pages/one-time-donation/one-time-donation.component';

const routes: Routes = [
  {
    path: '',
    component: DonationComponent,
  },
  {
    path: 'one-time-donation/',
    loadComponent: () =>
      import('./pages/one-time-donation/one-time-donation.component').then(
        (m) => m.OneTimeDonationComponent
      ),
  },
  {
    path: 'one-time-donation/:id',
    loadComponent: () =>
      import('./pages/one-time-donation/one-time-donation.component').then(
        (m) => m.OneTimeDonationComponent
      ),
  },
  {
    path: 'one-time-donation/:id/campagne/:campaign',
    loadComponent: () =>
      import('./pages/one-time-donation/one-time-donation.component').then(
        (m) => m.OneTimeDonationComponent
      ),
  },
  {
    path: 'monthly-donation',
    loadComponent: () =>
      import('./pages/one-time-donation/one-time-donation.component').then(
        (m) => m.OneTimeDonationComponent
      ),
  },
  {
    path: 'monthly-donation/:id',
    loadComponent: () =>
      import('./pages/one-time-donation/one-time-donation.component').then(
        (m) => m.OneTimeDonationComponent
      ),
  },
  {
    path: 'monthly-donation/:id/campagne/:campaign',
    loadComponent: () =>
      import('./pages/one-time-donation/one-time-donation.component').then(
        (m) => m.OneTimeDonationComponent
      ),
  },
  {
    path: 'payment-failure',
    loadComponent: () =>
      import('./pages/payment-failure/payment-failure.component').then(
        (m) => m.PaymentFailureComponent
      ),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DonationRoutingModule { }
