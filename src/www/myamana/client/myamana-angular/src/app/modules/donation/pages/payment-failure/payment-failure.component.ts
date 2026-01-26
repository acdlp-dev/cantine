import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-payment-failure',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100">
      <div class="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        <h1 class="text-4xl font-bold text-red-600 mb-4">Echec du paiment</h1>
      </div>
    </div>
  `,
  styles: []
})
export class PaymentFailureComponent {
}
