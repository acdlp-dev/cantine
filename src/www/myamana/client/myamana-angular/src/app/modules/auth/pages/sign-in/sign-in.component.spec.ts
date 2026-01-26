import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SignInComponent } from './sign-in.component';
import { standardTestingModules, standardTestingProviders } from 'src/app/shared/testing/test-helpers';
import { of } from 'rxjs';
import { AuthService } from '../../services/auth.service';

describe('LoginComponent', () => {
  let component: SignInComponent;
  let fixture: ComponentFixture<SignInComponent>;
  let authServiceMock: Partial<AuthService>;

  beforeEach(async () => {
    authServiceMock = {
      signIn: jasmine.createSpy('signIn').and.returnValue(of({ message: 'Success' })),
      isLoggedInLocally: jasmine.createSpy('isLoggedInLocally').and.returnValue(false),
      isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(of(false))
    };

    await TestBed.configureTestingModule({
      imports: [
        SignInComponent,
        ...standardTestingModules
      ],
      providers: [
        ...standardTestingProviders,
        { provide: AuthService, useValue: authServiceMock }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SignInComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
