import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { ThemeService } from 'src/app/core/services/theme.service';
import { AuthService } from 'src/app/modules/auth/services/auth.service';
import { DonsService } from 'src/app/modules/dashboard/services/dons.service';
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
 * Fournit un mock pour AuthService
 */
export const authServiceMock = {
  provide: AuthService,
  useValue: {
    signIn: jasmine.createSpy('signIn').and.returnValue(of({ message: 'Success' })),
    signUp: jasmine.createSpy('signUp').and.returnValue(of({ message: 'Success' })),
    resetPasswordWithToken: jasmine.createSpy('resetPasswordWithToken').and.returnValue(of({ message: 'Success' })),
    isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(of(true)),
    isLoggedInLocally: jasmine.createSpy('isLoggedInLocally').and.returnValue(true),
    logout: jasmine.createSpy('logout'),
    getUserData: jasmine.createSpy('getUserData').and.returnValue(of({
      prenom: 'Test',
      nom: 'User',
      email: 'test@example.com'
    }))
  }
};

/**
 * Fournit un mock pour DonsService
 */
export const donsServiceMock = {
  provide: DonsService,
  useValue: {
    getDons: jasmine.createSpy('getDons').and.returnValue(of([])),
    cancelSubscription: jasmine.createSpy('cancelSubscription').and.returnValue(of({})),
    pauseSubscription: jasmine.createSpy('pauseSubscription').and.returnValue(of({})),
    modifySubscription: jasmine.createSpy('modifySubscription').and.returnValue(of({})),
    modifyResumeDate: jasmine.createSpy('modifyResumeDate').and.returnValue(of({}))
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
  authServiceMock,
  themeServiceProvider,
  donsServiceMock,
  activatedRouteMock
];
