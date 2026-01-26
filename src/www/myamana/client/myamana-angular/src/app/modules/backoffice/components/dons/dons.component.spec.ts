import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DonsBackOffice } from './dons.component';

describe('DonsBackOffice', () => {
  let component: DonsBackOffice;
  let fixture: ComponentFixture<DonsBackOffice>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DonsBackOffice]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DonsBackOffice);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
