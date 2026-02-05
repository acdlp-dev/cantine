import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { ThemeService } from 'src/app/core/services/theme.service';
import { CommonModule } from '@angular/common';

/**
 * Configuration standard pour les tests de composants Angular
 * Inclut les modules et services les plus couramment utilisés
 */
export const standardTestingModules = [
  HttpClientTestingModule,
  RouterTestingModule,
  AngularSvgIconModule.forRoot(),
  BrowserAnimationsModule,
  FormsModule,
  ReactiveFormsModule,
  CommonModule
];

/**
 * Fournit un mock pour ActivatedRoute avec un token de test
 */
export const activatedRouteMock = {
  provide: ActivatedRoute,
  useValue: {
    snapshot: {
      params: {
        token: 'test-token'
      }
    }
  }
};

/**
 * Fournit le service ThemeService
 */
export const themeServiceProvider = {
  provide: ThemeService,
  useClass: ThemeService
};

/**
 * Fournisseurs standard pour les tests
 */
export const standardTestingProviders = [
  themeServiceProvider,
  activatedRouteMock
];
