import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TableRowComponent } from './table-row.component';
import { standardTestingModules, standardTestingProviders } from 'src/app/shared/testing/test-helpers';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('TableRowComponent', () => {
  let component: TableRowComponent;
  let fixture: ComponentFixture<TableRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TableRowComponent,
        ...standardTestingModules
      ],
      providers: [
        ...standardTestingProviders
      ],
      schemas: [NO_ERRORS_SCHEMA] // Pour ignorer les erreurs liées aux composants enfants
    }).compileComponents();

    fixture = TestBed.createComponent(TableRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
