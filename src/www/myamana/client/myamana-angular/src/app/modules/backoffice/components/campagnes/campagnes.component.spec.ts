import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CampagnesComponent } from './campagnes.component';

describe('CampagnesComponent', () => {
  let component: CampagnesComponent;
  let fixture: ComponentFixture<CampagnesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampagnesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CampagnesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
