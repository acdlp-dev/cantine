import { NgModule } from '@angular/core';

import { DashboardRoutingModule } from './dashboard-routing.module';
import { TutorielComponent } from './pages/tutoriel/tutoriel.component';

@NgModule({
  imports: [DashboardRoutingModule, TutorielComponent],
})
export class DashboardModule {}
