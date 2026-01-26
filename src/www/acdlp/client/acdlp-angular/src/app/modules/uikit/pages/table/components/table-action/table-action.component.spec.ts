import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TableActionComponent } from './table-action.component';
import { standardTestingModules, standardTestingProviders } from 'src/app/shared/testing/test-helpers';

describe('TableActionComponent', () => {
  let component: TableActionComponent;
  let fixture: ComponentFixture<TableActionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TableActionComponent,
        ...standardTestingModules
      ],
      providers: [
        ...standardTestingProviders
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TableActionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
