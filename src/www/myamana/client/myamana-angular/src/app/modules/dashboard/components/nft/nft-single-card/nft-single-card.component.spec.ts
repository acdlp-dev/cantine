import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NftSingleCardComponent } from './nft-single-card.component';
import { DonsService } from '../../../services/dons.service';
import { of } from 'rxjs';

describe('NftSingleCardComponent', () => {
  let component: NftSingleCardComponent;
  let fixture: ComponentFixture<NftSingleCardComponent>;
  let donsServiceMock: Partial<DonsService>;

  beforeEach(async () => {
    donsServiceMock = {
      cancelSubscription: jasmine.createSpy('cancelSubscription').and.returnValue(of({})),
      pauseSubscription: jasmine.createSpy('pauseSubscription').and.returnValue(of({})),
      modifySubscription: jasmine.createSpy('modifySubscription').and.returnValue(of({})),
      modifyResumeDate: jasmine.createSpy('modifyResumeDate').and.returnValue(of({}))
    };

    await TestBed.configureTestingModule({
      imports: [
        NftSingleCardComponent,
        HttpClientTestingModule,
        RouterTestingModule,
        FontAwesomeModule
      ],
      providers: [
        { provide: DonsService, useValue: donsServiceMock }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NftSingleCardComponent);
    component = fixture.componentInstance;
    component.nft = {
      id: 1,
      uri: 'test-asso',
      stripeSubId: 'sub_123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      occurence: 'mensuel',
      asso: 'test-asso',
      image: 'test-image.jpg',
      link: 'test-link',
      date: '2023-01-01',
      statut: 'active',
      recurrence: 'mensuelle',
      resumeDate: ''
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
