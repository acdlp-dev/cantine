import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { BackofficeAuthService } from './backoffice-auth.service';

describe('AuthService', () => {
    let service: BackofficeAuthService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                HttpClientTestingModule,
                RouterTestingModule
            ],
            providers: [BackofficeAuthService]
        });
        service = TestBed.inject(BackofficeAuthService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
