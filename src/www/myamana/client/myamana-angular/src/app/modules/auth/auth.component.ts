import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthLayoutComponent } from '../../shared/components/auth-layout/auth-layout.component';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss'],
  standalone: true,
  imports: [RouterOutlet, AuthLayoutComponent],
})
export class AuthComponent {
  // Configuration spécifique pour l'espace donateur
  quote = '« Ceux qui gardent scrupuleusement ce qu\'on leur a confié en dépôt et qui respectent leurs engagements »';
  quoteReference = '[Al-Ma\'âaridj : 32]';
  typewriterWords = ['associations', 'bénévoles', 'donateurs'];
}
