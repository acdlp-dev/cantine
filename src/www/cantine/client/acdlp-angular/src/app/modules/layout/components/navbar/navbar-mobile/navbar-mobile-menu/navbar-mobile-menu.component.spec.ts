import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavbarMobileMenuComponent } from './navbar-mobile-menu.component';
import { standardTestingModules, standardTestingProviders } from 'src/app/shared/testing/test-helpers';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('NavbarMobileMenuComponent', () => {
  let component: NavbarMobileMenuComponent;
  let fixture: ComponentFixture<NavbarMobileMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NavbarMobileMenuComponent,
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
    fixture = TestBed.createComponent(NavbarMobileMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
