import { Component, OnInit, OnDestroy } from '@angular/core';
import { FooterComponent } from './components/footer/footer.component';
import { NavigationEnd, Router, RouterOutlet, Event } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
  standalone: true,
  imports: [SidebarComponent, NavbarComponent, RouterOutlet, FooterComponent],
})
export class LayoutComponent implements OnInit, OnDestroy {
  private mainContent: HTMLElement | null = null;
  private routerSubscription: Subscription | null = null;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.mainContent = document.getElementById('main-content');

    // Subscription avec cleanup
    this.routerSubscription = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(() => {
      if (this.mainContent) {
        this.mainContent.scrollTop = 0;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }
}
