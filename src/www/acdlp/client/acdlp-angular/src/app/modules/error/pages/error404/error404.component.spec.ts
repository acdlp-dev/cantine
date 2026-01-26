import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Error404Component } from './error404.component';
import { standardTestingModules, standardTestingProviders } from 'src/app/shared/testing/test-helpers';

describe('Error404Component', () => {
  let component: Error404Component;
  let fixture: ComponentFixture<Error404Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        Error404Component,
        ...standardTestingModules
      ],
      providers: [
        ...standardTestingProviders
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(Error404Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
