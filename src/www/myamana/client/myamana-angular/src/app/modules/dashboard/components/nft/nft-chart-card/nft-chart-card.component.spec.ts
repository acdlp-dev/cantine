import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NftChartCardComponent } from './nft-chart-card.component';
import { standardTestingModules, standardTestingProviders } from 'src/app/shared/testing/test-helpers';
import { ThemeService } from 'src/app/core/services/theme.service';

describe('NftChartCardComponent', () => {
  let component: NftChartCardComponent;
  let fixture: ComponentFixture<NftChartCardComponent>;
  let themeServiceMock: Partial<ThemeService>;

  beforeEach(async () => {
    // Mock pour ThemeService
    themeServiceMock = {
      // Fournir un objet simple au lieu d'une fonction
      theme: jasmine.createSpy('theme').and.returnValue({
        mode: 'light',
        color: '#ff8264'
      })
    };

    await TestBed.configureTestingModule({
      imports: [
        NftChartCardComponent,
        ...standardTestingModules
      ],
      providers: [
        ...standardTestingProviders,
        { provide: ThemeService, useValue: themeServiceMock }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NftChartCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
