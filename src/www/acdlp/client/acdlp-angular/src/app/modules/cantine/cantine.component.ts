import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../backoffice/components/sidebar/sidebar.component';

@Component({
  selector: 'app-cantine',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    SidebarComponent
  ],
  template: `
    <div class="flex h-screen">
      <!-- Sidebar réutilisée du backoffice -->
      <app-sidebar [moduleType]="'cantine'"></app-sidebar>
      
      <!-- Content area -->
      <main class="flex-1 p-6 overflow-auto">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
})
export class CantineComponent {}
