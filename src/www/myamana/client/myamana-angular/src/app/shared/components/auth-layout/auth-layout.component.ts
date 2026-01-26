import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auth-layout',
  templateUrl: './auth-layout.component.html',
  styleUrls: ['./auth-layout.component.scss'],
  standalone: true,
  imports: [RouterOutlet, CommonModule],
})
export class AuthLayoutComponent implements OnInit, OnDestroy {
  // Configuration inputs
  @Input() quote: string = '« Ceux qui gardent scrupuleusement ce qu\'on leur a confié en dépôt et qui respectent leurs engagements »';
  @Input() quoteReference: string = '[Al-Ma\'âaridj : 32]';
  @Input() typewriterWords: string[] = ['associations', 'bénévoles', 'donateurs'];
  @Input() logoSrc: string = 'assets/images/myamana_logo.png';
  @Input() logoAlt: string = 'Logo Myamana';

  // Typewriter state
  currentWord = '';
  private wordIndex = 0;
  private charIndex = 0;
  private isDeleting = false;
  private typingSpeed = 100;
  private deletingSpeed = 50;
  private pauseTime = 2000;
  private timeoutId: any;

  constructor() {}

  ngOnInit(): void {
    this.typeWriter();
  }

  ngOnDestroy(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  private typeWriter(): void {
    const currentFullWord = this.typewriterWords[this.wordIndex];
    
    if (this.isDeleting) {
      // Suppression des caractères
      this.currentWord = currentFullWord.substring(0, this.charIndex - 1);
      this.charIndex--;
    } else {
      // Ajout des caractères
      this.currentWord = currentFullWord.substring(0, this.charIndex + 1);
      this.charIndex++;
    }

    let delay = this.isDeleting ? this.deletingSpeed : this.typingSpeed;

    // Si le mot est complet
    if (!this.isDeleting && this.charIndex === currentFullWord.length) {
      delay = this.pauseTime;
      this.isDeleting = true;
    }
    // Si le mot est entièrement supprimé
    else if (this.isDeleting && this.charIndex === 0) {
      this.isDeleting = false;
      this.wordIndex = (this.wordIndex + 1) % this.typewriterWords.length;
      delay = 500;
    }

    this.timeoutId = setTimeout(() => this.typeWriter(), delay);
  }
}

