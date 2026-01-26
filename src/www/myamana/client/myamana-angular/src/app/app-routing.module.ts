import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./modules/layout/layout.module').then((m) => m.LayoutModule),
  },
  {
    path: 'auth',
    loadChildren: () => import('./modules/auth/auth.module').then((m) => m.AuthModule),
  },
  {
    path: 'errors',
    loadChildren: () => import('./modules/error/error.module').then((m) => m.ErrorModule),
  },
  {
    path: 'donation',
    loadChildren: () => import('./modules/donation/donation.module').then(m => m.DonationModule)
  },
  {
    path: 'benevolat',
    loadChildren: () => import('./modules/benevolat/benevolat.module').then(m => m.BenevolatModule)
  },
  {
    path: 'backoffice-auth',
    loadChildren: () => import('./modules/backoffice-auth/backoffice-auth.module').then(m => m.BackofficeAuthModule)
  },
  { path: '**', redirectTo: 'errors/404' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
