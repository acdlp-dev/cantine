import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AssociationService } from './association.service';
import { environment } from 'src/environments/environment';

describe('AssociationService', () => {
  let service: AssociationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AssociationService]
    });
    service = TestBed.inject(AssociationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAssociationConfig', () => {
    it('should replace "acdlp" ID with "au-coeur-de-la-precarite"', () => {
      // Arrange
      const mockResponse = { 
        nom: 'Association Test',
        campagnes: []
      };
      
      // Act
      service.getAssociationConfig('acdlp').subscribe();
      
      // Assert
      const req = httpMock.expectOne(`${environment.apiUrl}/assos/config/au-coeur-de-la-precarite`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should correctly separate campaigns by type', () => {
      // Arrange
      const mockResponse = { 
        nom: 'Association Test',
        campagnes: [
          { nom: 'Campaign 1', type: 'ponctuel', statut: 'active' },
          { nom: 'Campaign 2', type: 'mensuel', statut: 'active' },
          { nom: 'Campaign 3', type: 'ponctuel', statut: 'active' }
        ]
      };
      
      // Act
      service.getAssociationConfig('test-asso').subscribe(result => {
        // Assert
        expect(result.campagnes_ponctuel.length).toBe(2);
        expect(result.campagnes_mensuel.length).toBe(1);
        expect(result.campagnes_ponctuel[0].nom).toBe('Campaign 1');
        expect(result.campagnes_ponctuel[1].nom).toBe('Campaign 3');
        expect(result.campagnes_mensuel[0].nom).toBe('Campaign 2');
      });
      
      const req = httpMock.expectOne(`${environment.apiUrl}/assos/config/test-asso`);
      req.flush(mockResponse);
    });

    it('should handle campaigns without type (default to ponctuel)', () => {
      // Arrange
      const mockResponse = { 
        nom: 'Association Test',
        campagnes: [
          { nom: 'Campaign 1', statut: 'active' }, // No type
          { nom: 'Campaign 2', type: 'mensuel', statut: 'active' },
          { nom: 'Campaign 3', type: 'ponctuel', statut: 'active' }
        ]
      };
      
      // Act
      service.getAssociationConfig('test-asso').subscribe(result => {
        // Assert
        expect(result.campagnes_ponctuel.length).toBe(2);
        expect(result.campagnes_mensuel.length).toBe(1);
        expect(result.campagnes_ponctuel[0].nom).toBe('Campaign 1'); 
        expect(result.campagnes_ponctuel[1].nom).toBe('Campaign 3');
      });
      
      const req = httpMock.expectOne(`${environment.apiUrl}/assos/config/test-asso`);
      req.flush(mockResponse);
    });

    it('should handle missing campagnes array in API response', () => {
      // Arrange
      const mockResponse = { 
        nom: 'Association Test'
        // No campagnes array
      };
      
      // Act
      service.getAssociationConfig('test-asso').subscribe(result => {
        // Assert
        expect(result.campagnes_ponctuel).toEqual([]);
        expect(result.campagnes_mensuel).toEqual([]);
      });
      
      const req = httpMock.expectOne(`${environment.apiUrl}/assos/config/test-asso`);
      req.flush(mockResponse);
    });

    it('should set default step1 value for campaigns without it', () => {
      // Arrange
      const mockResponse = { 
        nom: 'Association Test',
        campagnes: [
          { nom: 'Campaign 1', type: 'ponctuel', statut: 'active' } // No step1
        ]
      };
      
      // Act
      service.getAssociationConfig('test-asso').subscribe(result => {
        // Assert
        expect(result.campagnes_ponctuel[0].step1).toBe('libre'); // Default value
      });
      
      const req = httpMock.expectOne(`${environment.apiUrl}/assos/config/test-asso`);
      req.flush(mockResponse);
    });
  });
});
