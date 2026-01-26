import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pause-dialog',
  template: `
    <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <!-- Loader -->
      <div *ngIf="isSubmitting" class="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
        <div class="flex flex-col items-center">
          <div class="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p class="mt-4 text-white">Traitement en cours...</p>
        </div>
      </div>
      
      <div class="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <h2 class="text-xl font-semibold mb-4">{{ title }}</h2>
        
        <p class="text-gray-600 mb-2">
          {{ message }}
        </p>
        
        <p *ngIf="showMaxDateWarning" class="text-orange-600 text-sm mb-6">
          <strong>Note :</strong> En raison des délais interbancaires, la date de reprise ou de suspension peut prendre quelques jours pour être effective.
        </p>

        <div class="mb-6">
          <input
            type="date"
            [(ngModel)]="selectedDate"
            class="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            [min]="minDate"
            [max]="useMaxDateLimit ? maxDate : null"
          />
        </div>

        <div class="flex justify-end space-x-4">
          <button
            (click)="onCancel.emit()"
            class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
            [disabled]="isSubmitting"
          >
            Annuler
          </button>
          <button
            (click)="confirmPause()"
            class="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-600 rounded-md"
            [disabled]="!selectedDate || isSubmitting"
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  `,
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class PauseDialogComponent implements OnInit {
  @Input() title: string = 'Suspension du don';
  @Input() message: string = 'Veuillez sélectionner la date à laquelle vous souhaitez reprendre votre don :';
  @Input() showMaxDateWarning: boolean = false;
  @Input() useMaxDateLimit: boolean = false;
  
  @Output() onConfirm = new EventEmitter<string>();
  @Output() onCancel = new EventEmitter<void>();

  selectedDate: string = '';
  minDate: string;
  maxDate: string;
  isSubmitting: boolean = false;

  constructor() {
    // Date minimum par défaut = demain
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.minDate = tomorrow.toISOString().split('T')[0];
    
    // Date maximum (non utilisée dans ce cas)
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30); // Valeur arbitraire
    this.maxDate = maxDate.toISOString().split('T')[0];
  }
  
  ngOnInit() {
    // Nous n'imposons plus la limite de date minimale à J+5
    // La date minimale reste à demain (définie dans le constructeur)
  }

  confirmPause() {
    if (this.selectedDate) {
      this.isSubmitting = true; // Activer le loader
      this.onConfirm.emit(this.selectedDate);
      // Le parent est responsable de fermer le dialogue lorsque la requête est terminée
    }
  }
}
