import { Injectable, signal } from '@angular/core';
import { Theme } from '../models/theme.model';
import { effect } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly theme = { mode: 'light', color: 'acdlp' }; // Thème fixé

  constructor() {
    this.setTheme();
  }

  private setTheme() {
    this.setThemeClass();
  }

  private setThemeClass() {
    const htmlElement = document.querySelector('html');
    if (htmlElement) {
      htmlElement.className = this.theme.mode;
      htmlElement.setAttribute('data-theme', this.theme.color);
    }
  }
}
