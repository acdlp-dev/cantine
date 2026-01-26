import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DonHorsLigneComponent } from './don-hors-ligne.component';

describe('DonHorsLigneComponent', () => {
  let component: DonHorsLigneComponent;
  let fixture: ComponentFixture<DonHorsLigneComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DonHorsLigneComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DonHorsLigneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
