import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SidebarMenuComponent } from './sidebar-menu.component';
import { standardTestingModules, standardTestingProviders } from 'src/app/shared/testing/test-helpers';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('SidebarMenuComponent', () => {
  let component: SidebarMenuComponent;
  let fixture: ComponentFixture<SidebarMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SidebarMenuComponent,
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
    fixture = TestBed.createComponent(SidebarMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
