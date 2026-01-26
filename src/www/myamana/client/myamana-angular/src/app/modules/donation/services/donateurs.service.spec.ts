import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DonateursService } from './donateurs.service';
import { DonationFormData } from '../models/donation.model';
import { environment } from 'src/environments/environment';

describe('DonateursService', () => {
  let service: DonateursService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DonateursService]
    });
    service = TestBed.inject(DonateursService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('saveDonationData', () => {
    it('should send donation data to the correct endpoint', () => {
      // Arrange
      const mockDonationData: any = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        firstname: 'John',
        lastname: 'Doe',
        raison: '',
        siren: '',
        amount: 50,
        payment_method_types: 'card',
        campagne: 'Fonds Généraux',
        asso: 'Test Association',
        origin: 'ponctuel',
        treeNamesString: ''
      };

      const mockResponse = {
        success: true,
        donationId: 'test-donation-id'
      };

      // Act
      service.saveDonationData(mockDonationData).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      // Assert
      const req = httpMock.expectOne(`${environment.apiUrl}/donations/save`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockDonationData);
      
      // Respond with mock data
      req.flush(mockResponse);
    });

    it('should handle error response', () => {
      // Arrange
      const mockDonationData: any = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        firstname: 'John',
        lastname: 'Doe',
        raison: '',
        siren: '',
        amount: 50,
        payment_method_types: 'card',
        campagne: 'Fonds Généraux',
        asso: 'Test Association',
        origin: 'ponctuel',
        treeNamesString: ''
      };

      const mockErrorResponse = {
        success: false,
        message: 'Error saving donation data'
      };

      // Act
      service.saveDonationData(mockDonationData).subscribe({
        next: () => fail('Should have failed with an error'),
        error: (error) => {
          expect(error.statusText).toBe('Server Error');
        }
      });

      // Assert
      const req = httpMock.expectOne(`${environment.apiUrl}/donations/save`);
      expect(req.request.method).toBe('POST');
      
      // Respond with mock error
      req.flush(mockErrorResponse, { status: 500, statusText: 'Server Error' });
    });
  });
});
