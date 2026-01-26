import { Component, OnInit } from '@angular/core';
import { NftSingleCardComponent } from '../../components/nft/nft-single-card/nft-single-card.component';
import { NftAuctionsTableComponent } from '../../components/nft/nft-auctions-table/nft-auctions-table.component';
import { DonsService } from '../../services/dons.service';
import { AuthService } from 'src/app/modules/auth/services/auth.service';
import { NgFor, NgIf } from '@angular/common';

@Component({
  selector: 'app-nft',
  templateUrl: './nft.component.html',
  standalone: true,
  imports: [
    NftSingleCardComponent,
    NftAuctionsTableComponent,
    NgFor,
    NgIf
  ],
})
export class NftComponent implements OnInit {
  nfts: any[] = []; // Contiendra les données récupérées
  userData: {
    email: string;
    firstName: string;
    lastName: string;
  } = {
    email: '',
    firstName: '',
    lastName: ''
  };

  get inactiveNfts(): any[] {
    return this.nfts.filter(nft => nft.statut === 'inactif');
  }

  get activeNfts(): any[] {
    return this.nfts.filter(nft => nft.statut !== 'inactif');
  }


  constructor(private donsService: DonsService, private authService: AuthService) { }
  ngOnInit(): void {
    this.authService.getUserData().subscribe({
      next: (response) => {
        this.userData = {
          email: response.email,
          firstName: response.firstName,
          lastName: response.lastName
        };
        this.loadNfts(); // Appelle l'API pour les dons
      },
      error: (err) => {
        console.error('Nous ne trouvons pas l email:', err);
      },
    });
  }
  loadNfts(): void {
    this.donsService.getSubscriptionsByEmail(this.userData.email).subscribe(
      (response) => {
        console.log('Réponse API complète:', response.results);
        this.nfts = response.results.map((item: any) => {

          // Calcul du prochain jour de "recurrence"
          const today = new Date();
          const nextMonth = today.getMonth() === 11 ? 0 : today.getMonth() + 1; // Si décembre, on passe à janvier
          const nextYear = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();

          // Création de la date pour le prochain mois
          const nextRecurrenceDate = new Date(nextYear, nextMonth, Number(item.recurrence));

          // Formatage de la date
          const formattedRecurrence = `${nextRecurrenceDate.getDate().toString().padStart(2, '0')}/${
            (nextRecurrenceDate.getMonth() + 1).toString().padStart(2, '0')
          }/${nextRecurrenceDate.getFullYear()}`;

          return {
            id: item.id,
            asso: item.asso
              ? item.asso.replace(/-/g, ' ').replace(/\b\w/g, (match: string) => match.toUpperCase())
              : 'Association inconnue',
            montant: item.montant,
            email: item.email,
            firstName: item.prenom,
            lastName: item.nom,
            image: `./assets/images/asso/${item.asso || 'unknown'}.png`,
            link: `https://www.myamana.fr/mensuel/${item.asso || 'unknown'}?oldSubId=${item.stripe_sub_id}`,
            statut: item.statut || 'actif', // Ajout d'un statut par défaut si absent
            recurrence: formattedRecurrence, // Date du prochain mois
            uri: item.asso,
            stripeSubId: item.stripe_sub_id,
            resumeDate: item.resumeDate
              ? new Date(item.resumeDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
              : null,
            date: new Date(item.ajout).toLocaleDateString('fr-FR'),
            moyen: item.moyen,
            last4: item.last4,
            brand: item.brand?.toLowerCase(),
            expirationCB: item.expirationCB,
            error_mail_sent: item.error_mail_sent
          };
        });
        console.log('NFTs après mapping:', this.nfts);
      },
      (error) => {
        console.error('Erreur lors du chargement des NFTs:', error);
      }
    );
  }
}
