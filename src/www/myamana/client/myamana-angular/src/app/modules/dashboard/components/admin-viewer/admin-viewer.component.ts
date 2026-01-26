import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AdminViewerService } from '../../services/admin-viewer.service';

@Component({
  selector: 'app-admin-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-viewer-container bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg shadow-md mb-6 border-2 border-blue-200">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-bold text-blue-800 flex items-center">
          <svg class="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
            <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
          </svg>
          Mode Administrateur
        </h3>
        <span class="text-xs bg-blue-600 text-white px-3 py-1 rounded-full font-semibold">
          Admin
        </span>
      </div>
      
      <div *ngIf="!viewedEmail" class="space-y-3">
        <p class="text-sm text-gray-700 mb-3">
          Entrez l'adresse email d'un donateur pour visualiser son espace.
        </p>
        <div class="flex gap-3">
          <input 
            type="email"
            [(ngModel)]="searchEmail"
            (keydown.enter)="viewDonator()"
            placeholder="email@donateur.com"
            class="flex-1 px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
          <button 
            (click)="viewDonator()"
            [disabled]="!searchEmail"
            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-semibold shadow-md hover:shadow-lg"
          >
            Voir le profil
          </button>
        </div>
      </div>
      
      <div *ngIf="viewedEmail" class="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-lg flex justify-between items-center border-2 border-orange-300">
        <div class="flex items-center">
          <svg class="w-5 h-5 text-orange-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
          </svg>
          <span class="font-semibold text-gray-800">
            Vous consultez l'espace de : 
            <span class="text-orange-700 font-bold">{{ viewedEmail }}</span>
          </span>
        </div>
        <button 
          (click)="resetView()"
          class="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-800 transition font-semibold shadow hover:shadow-md flex items-center"
        >
          <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/>
          </svg>
          Revenir à mon compte
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class AdminViewerComponent implements OnInit {
  searchEmail = '';
  viewedEmail: string | null = null;
  
  constructor(private adminViewer: AdminViewerService) {}
  
  ngOnInit(): void {
    // S'abonner aux changements de donateur visualisé
    this.adminViewer.currentViewedDonator$.subscribe(
      email => {
        this.viewedEmail = email;
        if (email) {
          this.searchEmail = '';
        }
      }
    );
  }
  
  viewDonator(): void {
    if (this.searchEmail && this.searchEmail.trim()) {
      this.adminViewer.viewDonator(this.searchEmail.trim());
      // Recharger la page pour appliquer les nouveaux filtres
      window.location.reload();
    }
  }
  
  resetView(): void {
    this.adminViewer.resetView();
    // Recharger la page pour revenir à la vue normale
    window.location.reload();
  }
}
