import { Component, Input } from '@angular/core';
import { NgFor, NgIf, NgStyle } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { 
  faCcVisa, 
  faCcAmex,
  faCcPaypal
} from '@fortawesome/free-brands-svg-icons';
import { 
  faUniversity, 
  faCreditCard, 
  faMoneyBillWave,
  faMoneyCheck
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: '[nft-auctions-table]',
  templateUrl: './nft-auctions-table.component.html',
  standalone: true,
  imports: [NgFor, NgIf, NgStyle, FontAwesomeModule],
})
export class NftAuctionsTableComponent {
  @Input() nfts: any[] = [];
  @Input() showReceiptColumn: boolean = true;
  @Input() showPaymentColumn: boolean = false; // Par défaut, la colonne des moyens de paiement est masquée
  @Input() tableTitle: string = 'Historique';

  // Icônes pour les moyens de paiement
  faVisa = faCcVisa;
  faAmex = faCcAmex;
  faPaypal = faCcPaypal;
  faIban = faUniversity;
  faCard = faCreditCard;
  faCash = faMoneyBillWave;
  faCheck = faMoneyCheck;
  faTransfer = faUniversity;

  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = 'assets/images/asso/demo.png';
    }
  }
}
