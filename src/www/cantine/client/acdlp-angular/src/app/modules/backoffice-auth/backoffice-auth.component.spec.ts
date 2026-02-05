import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BackofficeAuthComponent } from './backoffice-auth.component';

describe('BackofficeAuthComponent', () => {
  let component: BackofficeAuthComponent;
  let fixture: ComponentFixture<BackofficeAuthComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [BackofficeAuthComponent],
}).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BackofficeAuthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
