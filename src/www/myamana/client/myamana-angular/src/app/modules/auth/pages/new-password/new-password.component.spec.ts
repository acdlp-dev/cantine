import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { NewPasswordComponent } from './new-password.component';
import { AuthService } from '../../services/auth.service';

describe('NewPasswordComponent', () => {
  let component: NewPasswordComponent;
  let fixture: ComponentFixture<NewPasswordComponent>;
  let authServiceMock: Partial<AuthService>;

  beforeEach(async () => {
    authServiceMock = {
      resetPasswordWithToken: jasmine.createSpy('resetPasswordWithToken').and.returnValue(of({ message: 'Success' }))
    };

    await TestBed.configureTestingModule({
      imports: [
        NewPasswordComponent,
        HttpClientTestingModule,
        RouterTestingModule,
        FormsModule,
        AngularSvgIconModule.forRoot()
      ],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              params: {
                token: 'test-token'
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NewPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
