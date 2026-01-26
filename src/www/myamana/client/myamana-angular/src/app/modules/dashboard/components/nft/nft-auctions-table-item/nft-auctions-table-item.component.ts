import { Component, Input, OnInit } from '@angular/core';
import { Nft } from '../../../models/nft';
import { CurrencyPipe, NgIf, NgStyle } from '@angular/common';
import { AngularSvgIconModule } from 'angular-svg-icon';

@Component({
  selector: '[nft-auctions-table-item]',
  templateUrl: './nft-auctions-table-item.component.html',
  styleUrl:'./nft-auctions-table-item.component.scss',
  standalone: true,
  imports: [AngularSvgIconModule, CurrencyPipe, NgIf, NgStyle],
})
export class NftAuctionsTableItemComponent implements OnInit {
  @Input() auction: Nft = <Nft>{};

  constructor() {}

  ngOnInit(): void {}
}
