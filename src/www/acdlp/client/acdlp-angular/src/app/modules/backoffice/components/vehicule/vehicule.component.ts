import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-vehicule',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6">
      <h2 class="text-2xl font-bold mb-4">Suivi des véhicules</h2>
      <p class="mb-4">Bienvenue dans le module de suivi des véhicules.</p>
      <div class="bg-amber-100 p-4 rounded-lg border border-amber-300">
        <p>Ce module est en cours de développement.</p>
      </div>
    </div>
  `,
  styles: []
})
export class VehiculeComponent implements OnInit {
  constructor() { }

  ngOnInit(): void {
    console.log('Composant de suivi des véhicules initialisé');
  }
}
