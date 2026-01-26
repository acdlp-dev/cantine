import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Nft } from '../../../models/nft';
import { DonsService } from '../../../services/dons.service';
import { CommonModule, CurrencyPipe, NgClass, NgStyle } from '@angular/common';
import { ConfirmationDialogComponent } from 'src/app/shared/components/confirmation-dialog/confirmation-dialog.component';
import { PauseDialogComponent } from 'src/app/shared/components/pause-dialog/pause-dialog.component';
import { ModifySubscriptionDialogComponent } from 'src/app/shared/components/modify-subscription-dialog/modify-subscription-dialog.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { 
  faCcVisa, 
  faCcAmex 
} from '@fortawesome/free-brands-svg-icons';
import { faUniversity, faCreditCard } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: '[nft-single-card]',
  templateUrl: './nft-single-card.component.html',
  standalone: true,
  imports: [
    NgStyle,
    CurrencyPipe,
    NgClass,
    CommonModule,
    FontAwesomeModule,
    ConfirmationDialogComponent,
    PauseDialogComponent,
    ModifySubscriptionDialogComponent
  ],
})
export class NftSingleCardComponent implements OnInit {
  @Input() nft: Nft = <Nft>{};
  showDialog: boolean = false;
  showPauseDialog: boolean = false;
  showModifyDialog: boolean = false;
  showModifyResumeDialog: boolean = false;
  resultMessage: string | null = null;
  resumeDate: string = '';

  @ViewChild('pauseDialog') pauseDialog!: PauseDialogComponent;
  @ViewChild('modifyResumeDialog') modifyResumeDialog!: PauseDialogComponent;

  constructor(private donsService: DonsService, private router: Router) {
    this.faVisa = faCcVisa;
    this.faAmex = faCcAmex;
    this.faIban = faUniversity;
    this.faCard = faCreditCard;
  }

  faVisa = faCcVisa;
  faAmex = faCcAmex;
  faIban = faUniversity;
  faCard = faCreditCard;

  ngOnInit(): void {}

  cancelSubscription(subscriptionId: string, asso: string): void {
    this.showDialog = true; // Afficher le dialogue
  }

  onConfirmCancel(subscriptionId: string, asso: string): void {
    this.donsService.cancelSubscription(subscriptionId, asso).subscribe({
      next: () => {
        this.resultMessage = 'Votre don récurrent a bien été annulé.';
        this.showDialog = true; // Afficher le dialogue de confirmation
      },
      error: () => {
        this.resultMessage = 'Une erreur est survenue lors de l\'annulation.';
        this.showDialog = true; // Afficher le dialogue d'erreur
      }
    });
  }

  onCancelDialog(): void {
    this.showDialog = false; // Fermer le dialogue si l'utilisateur annule
  }

  onCloseDialog(): void {
    this.showDialog = false; // Fermer le dialogue après avoir cliqué sur "C'est compris"
    if (this.resultMessage === 'Votre don récurrent a bien été annulé.' || 
        this.resultMessage === 'Votre don a bien été suspendu.' ||
        this.resultMessage === 'Votre don récurrent a bien été modifié.' ||
        this.resultMessage === 'La date de reprise a bien été modifiée.') {
      setTimeout(() => {
        window.location.reload(); // Rafraîchir la page après confirmation de succès
      }, 100); // Attente pour s'assurer que l'utilisateur voit le message
    }
    this.resultMessage = null; // Réinitialiser le message
  }

  pauseSubscription(subscriptionId: string, asso: string): void {
    this.showPauseDialog = true;
  }

  onConfirmPause(date: string): void {
    // Le loader est déjà activé par le composant PauseDialogComponent
    this.donsService.pauseSubscription(this.nft.stripeSubId, this.nft.uri, date).subscribe({
      next: () => {
        this.resultMessage = 'Votre don a bien été suspendu.';
        // Fermer le dialogue de pause et afficher le dialogue de confirmation
        // immédiatement après la réception de la réponse du serveur
        this.showPauseDialog = false;
        this.showDialog = true;
      },
      error: () => {
        this.resultMessage = 'Une erreur est survenue lors de la suspension.';
        // Fermer le dialogue de pause et afficher le dialogue d'erreur
        this.showPauseDialog = false;
        this.showDialog = true;
      }
    });
  }

  onCancelPauseDialog(): void {
    this.showPauseDialog = false;
    this.resumeDate = '';
  }

  modifySubscription(): void {
    this.showModifyDialog = true;
  }

  onConfirmModify(data: { 
    amount: number; 
    billingDay: number;
    paymentMethod?: string;
    paymentType?: string;
  }): void {
    this.donsService.modifySubscription({
      subscriptionId: this.nft.stripeSubId,
      asso: this.nft.uri,
      ...(data.amount && { amount: data.amount }),
      ...(data.billingDay && { billingDay: data.billingDay.toString() }),
      ...(data.paymentMethod && { paymentMethod: data.paymentMethod }),
      email: this.nft.email,
      firstName: this.nft.firstName,
      lastName: this.nft.lastName,
      occurrence: this.nft.occurence // Ajout de l'occurrence
    }).subscribe({
      next: () => {
        this.resultMessage = 'Votre don récurrent a bien été modifié.';
        // Fermer le dialogue de modification et afficher le dialogue de confirmation
        // immédiatement après la réception de la réponse du serveur
        this.showModifyDialog = false;
        this.showDialog = true;
      },
      error: () => {
        this.resultMessage = 'Une erreur est survenue lors de la modification.';
        // Fermer le dialogue de modification et afficher le dialogue d'erreur
        this.showModifyDialog = false;
        this.showDialog = true;
      }
    });
  }

  onCancelModify(): void {
    this.showModifyDialog = false;
  }

  modifyResumeDate(): void {
    this.showModifyResumeDialog = true;
  }

  onConfirmModifyResume(date: string): void {
    // Le loader est déjà activé par le composant PauseDialogComponent
    this.donsService.modifyResumeDate(this.nft.stripeSubId, this.nft.uri, date).subscribe({
      next: () => {
        this.resultMessage = 'La date de reprise a bien été modifiée.';
        // Fermer le dialogue de modification et afficher le dialogue de confirmation
        // immédiatement après la réception de la réponse du serveur
        this.showModifyResumeDialog = false;
        this.showDialog = true;
      },
      error: () => {
        this.resultMessage = 'Une erreur est survenue lors de la modification de la date de reprise.';
        // Fermer le dialogue de modification et afficher le dialogue d'erreur
        this.showModifyResumeDialog = false;
        this.showDialog = true;
      }
    });
  }

  onCancelModifyResumeDialog(): void {
    this.showModifyResumeDialog = false;
    this.resumeDate = '';
  }
}
