import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BackofficeAuthComponent } from 'src/app/modules/backoffice-auth/backoffice-auth.component';

@Component({
  selector: 'app-cantine-blocked',
  template: `
    <div class="max-w-lg mx-auto p-6 bg-white rounded shadow">
      <h2 class="text-xl font-semibold mb-4">Accès restreint</h2>
      <p class="mb-4">
        Votre compte est actuellement bloqué car des commandes n'ont pas été récupérées.
      </p>
      <p class="mb-4">Montant dû : <strong>{{debt}} €</strong></p>
      <div class="flex space-x-3">
        <button (click)="onPay()" class="bg-blue-600 text-white px-4 py-2 rounded">Payer maintenant</button>
        <button (click)="onContact()" class="bg-gray-100 px-4 py-2 rounded">Contact</button>
      </div>
      <p *ngIf="error" class="text-red-600 mt-4">{{error}}</p>
    </div>
  `,
  standalone: true,
  imports: [CommonModule]
})
export class CantineBlockedComponent implements OnInit {
  debt = 0;
  error = '';

  constructor(private BackofficeAuthComponent: BackofficeAuthComponent, private router: Router) {}

  ngOnInit(): void {
    // this.debt = this.BackofficeAuthComponent.debt;
  }

  onPay(): void {
    // this.error = '';
    // this.BackofficeAuthComponent.payDebt().subscribe({
    //   next: (resp) => {
    //     if (resp.success) {
    //       this.BackofficeAuthComponent.setBlockedLocally(false, 0);
    //       if (resp.redirectUrl) {
    //         window.location.href = resp.redirectUrl;
    //       } else {
    //         this.router.navigate(['/cantine']);
    //       }
    //     } else {
    //       this.error = 'Paiement impossible — réessayez plus tard.';
    //     }
    //   },
    //   error: () => this.error = 'Erreur réseau lors du paiement.'
    // });
  }

  onContact(): void {
    this.router.navigate(['/cantine/contact']);
  }
}
