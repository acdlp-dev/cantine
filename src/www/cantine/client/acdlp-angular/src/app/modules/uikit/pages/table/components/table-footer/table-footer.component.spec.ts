import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TableFooterComponent } from './table-footer.component';
import { standardTestingModules, standardTestingProviders } from 'src/app/shared/testing/test-helpers';

describe('TableFooterComponent', () => {
  let component: TableFooterComponent;
  let fixture: ComponentFixture<TableFooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TableFooterComponent,
        ...standardTestingModules
      ],
      providers: [
        ...standardTestingProviders
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TableFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
