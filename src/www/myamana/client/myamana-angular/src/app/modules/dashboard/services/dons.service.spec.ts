import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DonsService } from './dons.service';

describe('DonsService', () => {
  let service: DonsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DonsService]
    });
    service = TestBed.inject(DonsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
