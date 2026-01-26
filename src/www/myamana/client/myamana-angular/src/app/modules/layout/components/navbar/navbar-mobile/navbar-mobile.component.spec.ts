import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavbarMobileComponent } from './navbar-mobilecomponent';
import { standardTestingModules, standardTestingProviders } from 'src/app/shared/testing/test-helpers';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('NavbarMobileComponent', () => {
  let component: NavbarMobileComponent;
  let fixture: ComponentFixture<NavbarMobileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NavbarMobileComponent,
        ...standardTestingModules,
        AngularSvgIconModule.forRoot()
      ],
      providers: [
        ...standardTestingProviders
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NavbarMobileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
