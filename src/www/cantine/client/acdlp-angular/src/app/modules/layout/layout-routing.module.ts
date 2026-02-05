import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LayoutComponent } from './layout.component';
import { BackofficeAuthGuard } from 'src/app/guards/backoffice-auth.guard';
// TODO: Authentification cantine à implémenter plus tard
// import { CantineAuthGuard } from 'src/app/guards/cantine-auth.guard';

const routes: Routes = [
  {
    path: 'backoffice',
    // component: LayoutComponent,
    loadChildren: () => import('../backoffice/backoffice.module').then((m) => m.BackofficeModule),
    canActivate: [BackofficeAuthGuard], // Protection par le guard
  },
  {
    path: 'cantine',
    loadChildren: () => import('../cantine/cantine.module').then((m) => m.CantineModule),
    // TODO: Authentification cantine à implémenter plus tard
    // canActivate: [CantineAuthGuard], // Protection par le guard
  },
  {
    path: 'components',
    component: LayoutComponent,
    loadChildren: () => import('../uikit/uikit.module').then((m) => m.UikitModule),
  },
  { path: '', redirectTo: 'backoffice', pathMatch: 'full' },
  { path: '**', redirectTo: 'error/404' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LayoutRoutingModule {}
