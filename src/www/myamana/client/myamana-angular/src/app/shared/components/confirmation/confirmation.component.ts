import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-confirmation',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './confirmation.component.html',
  styleUrl: './confirmation.component.scss'
})
export class ConfirmationComponent {
  
  @Input() message: string = '';

  // Le message d'erreur
  @Input() secondMessage: string = '';

  @Input() redirectMessage: string = '';
}
