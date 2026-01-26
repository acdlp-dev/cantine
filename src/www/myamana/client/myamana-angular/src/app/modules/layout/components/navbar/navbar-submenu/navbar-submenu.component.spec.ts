import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavbarSubmenuComponent } from './navbar-submenu.component';
import { standardTestingModules, standardTestingProviders } from 'src/app/shared/testing/test-helpers';
import { SubMenuItem } from 'src/app/core/models/menu.model';

describe('NavbarSubmenuComponent', () => {
  let component: NavbarSubmenuComponent;
  let fixture: ComponentFixture<NavbarSubmenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NavbarSubmenuComponent,
        ...standardTestingModules
      ],
      providers: [
        ...standardTestingProviders
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NavbarSubmenuComponent);
    component = fixture.componentInstance;
    // Fournir un tableau pour submenu au lieu d'un objet
    component.submenu = [
      {
        label: 'Test Item',
        route: '/test',
        icon: 'test-icon.svg'
      }
    ] as SubMenuItem[];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
