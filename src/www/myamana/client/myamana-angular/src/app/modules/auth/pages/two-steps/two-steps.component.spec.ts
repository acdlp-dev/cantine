import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TwoStepsComponent } from './two-steps.component';
import { standardTestingModules, standardTestingProviders, activatedRouteMock } from 'src/app/shared/testing/test-helpers';

describe('TwoStepsComponent', () => {
  let component: TwoStepsComponent;
  let fixture: ComponentFixture<TwoStepsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TwoStepsComponent,
        ...standardTestingModules
      ],
      providers: [
        ...standardTestingProviders,
        activatedRouteMock
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TwoStepsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
