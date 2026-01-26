import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { AutoTourService } from './services/auto-tour.service';
import { SupportWidgetComponent } from '../../shared/components/support-widget/support-widget.component';

@Component({
  selector: 'app-backoffice',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    SidebarComponent,
    SupportWidgetComponent
  ],
  templateUrl: './backoffice.component.html',
})
export class BackofficeComponent implements OnInit {
  constructor(
    // Injecter le service pour qu'il soit initialisé
    private autoTourService: AutoTourService
  ) {}
  
  ngOnInit(): void {
    // Le service s'auto-initialise et surveille les changements de route
  }
}