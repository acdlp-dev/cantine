import { Component, OnInit } from '@angular/core';
import { ThemeService } from './core/services/theme.service';
import { Router, RouterOutlet } from '@angular/router';
import { NgClass, NgIf, AsyncPipe } from '@angular/common';
import { ResponsiveHelperComponent } from './shared/components/responsive-helper/responsive-helper.component';
import { NgxSonnerToaster } from 'ngx-sonner';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [NgClass, NgIf, AsyncPipe, RouterOutlet, ResponsiveHelperComponent, NgxSonnerToaster],
})
export class AppComponent implements OnInit {
  title = 'ACDLP';
  shouldShowDialog = false;
  failedDonations: any[] = [];

  constructor(
    public themeService: ThemeService,
    private router: Router
  ) {}

  ngOnInit() {
    console.log('=== ACDLP App Component Initialization ===');
  }

  navigateToSubscriptions() {
    this.router.navigate(['/subscriptions']);
    this.shouldShowDialog = false;
  }
}
