import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaymentFormComponent } from './payment-form.component';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DonsService } from '../../../dashboard/services/dons.service';
import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

describe('PaymentFormComponent', () => {
  let component: PaymentFormComponent;
  let fixture: ComponentFixture<PaymentFormComponent>;
  let donsServiceMock: jasmine.SpyObj<DonsService>;
  let routerMock: jasmine.SpyObj<Router>;
  let httpClientMock: jasmine.SpyObj<HttpClient>;
  let cdrMock: jasmine.SpyObj<ChangeDetectorRef>;

  beforeEach(async () => {
    // Create mocks for dependencies
    donsServiceMock = jasmine.createSpyObj('DonsService', ['getStripePublicKey']);
    donsServiceMock.getStripePublicKey.and.returnValue(of('pk_test_mock_key'));

    routerMock = jasmine.createSpyObj('Router', ['navigateByUrl']);
    httpClientMock = jasmine.createSpyObj('HttpClient', ['post']);
    cdrMock = jasmine.createSpyObj('ChangeDetectorRef', ['detectChanges']);

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        ReactiveFormsModule,
        FontAwesomeModule,
        PaymentFormComponent
      ],
      providers: [
        FormBuilder,
        { provide: DonsService, useValue: donsServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: HttpClient, useValue: httpClientMock },
        { provide: ChangeDetectorRef, useValue: cdrMock }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentFormComponent);
    component = fixture.componentInstance;
    
    // Set required inputs
    component.assoId = 'test-asso';
    component.donationAmount = 25;
    component.selectedCampaign = 'Test Campaign';
    component.associationData = {
      name_asso: 'Test Association',
      ty_link: 'https://thank-you-page.com',
      paypal_email: 'paypal@example.com',
      adresseCheque: '123 Test Street',
      bic_general: 'TESTBIC',
      iban_general: 'FR123456789'
    };
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have payment tabs initialized', () => {
    // After component initialization, paymentTabs should be populated
    expect(component.paymentTabs.length).toBeGreaterThan(0);
    expect(component.paymentTabs).toContain('CB');
  });

  it('should set active tab correctly', async () => {
    const initialTab = component.activeTab;
    await component.setActiveTab('CB');
    expect(component.activeTab).toBe('CB');
    expect(cdrMock.detectChanges).toHaveBeenCalled();
  });

  it('should have a valid form structure', () => {
    expect(component.paymentForm).toBeDefined();
    expect(component.paymentForm.get('acceptTermsCard')).toBeDefined();
    expect(component.paymentForm.get('acceptTermsPaypal')).toBeDefined();
    expect(component.paymentForm.get('acceptTermsCheque')).toBeDefined();
    expect(component.paymentForm.get('acceptTermsSepa')).toBeDefined();
  });
});
