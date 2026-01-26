import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { NftComponent } from './pages/nft/nft.component';
import { NftAuctionsTableComponent } from './components/nft/nft-auctions-table/nft-auctions-table.component';
import { MesDonsComponent } from './pages/mesDons/mesDons.component';
import { TutorielComponent } from './pages/tutoriel/tutoriel.component';

const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    children: [
      { path: '', component: MesDonsComponent },
      { path: 'abonnements', component: NftComponent },
      { path: 'dons', component: MesDonsComponent },
      { path: 'tutoriel', component: TutorielComponent },
      { path: '**', redirectTo: 'errors/404' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DashboardRoutingModule {}
