import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecusComponent } from './recu.component';

describe('RecusComponent', () => {
  let component: RecusComponent;
  let fixture: ComponentFixture<RecusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecusComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
