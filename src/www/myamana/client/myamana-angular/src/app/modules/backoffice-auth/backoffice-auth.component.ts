import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthLayoutComponent } from '../../shared/components/auth-layout/auth-layout.component';

@Component({
  selector: 'app-backoffice-auth',
  templateUrl: './backoffice-auth.component.html',
  styleUrls: ['./backoffice-auth.component.scss'],
  standalone: true,
  imports: [RouterOutlet, AuthLayoutComponent],
})
export class BackofficeAuthComponent {
  // Configuration pour le back-office des associations (même phrase que partout)
  quote = '« Ceux qui gardent scrupuleusement ce qu\'on leur a confié en dépôt et qui respectent leurs engagements »';
  quoteReference = '[Al-Ma\'âaridj : 32]';
  typewriterWords = ['associations', 'bénévoles', 'donateurs'];
}
