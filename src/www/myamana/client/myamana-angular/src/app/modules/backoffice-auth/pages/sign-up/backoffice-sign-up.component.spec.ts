import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BackofficeSignUpComponent } from './backoffice-sign-up.component';
import { standardTestingModules, standardTestingProviders } from 'src/app/shared/testing/test-helpers';
import { AngularSvgIconModule } from 'angular-svg-icon';

describe('BackofficeSignUpComponent', () => {
  let component: BackofficeSignUpComponent;
  let fixture: ComponentFixture<BackofficeSignUpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BackofficeSignUpComponent,
        ...standardTestingModules
      ],
      providers: [
        ...standardTestingProviders
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BackofficeSignUpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
