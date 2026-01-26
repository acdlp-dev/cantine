import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/services/auth.service';
import { AdminViewerComponent } from './components/admin-viewer/admin-viewer.component';

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    standalone: true,
    imports: [RouterOutlet, CommonModule, AdminViewerComponent],
})
export class DashboardComponent implements OnInit {
  isAdmin$: Observable<boolean>;

  constructor(private authService: AuthService) {
    this.isAdmin$ = this.authService.isAdmin();
  }

  ngOnInit(): void {}
}
