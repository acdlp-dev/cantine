import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NftDualCardComponent } from './nft-dual-card.component';
import { standardTestingModules, standardTestingProviders } from 'src/app/shared/testing/test-helpers';

describe('NftDualCardComponent', () => {
  let component: NftDualCardComponent;
  let fixture: ComponentFixture<NftDualCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NftDualCardComponent,
        ...standardTestingModules
      ],
      providers: [
        ...standardTestingProviders
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NftDualCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
