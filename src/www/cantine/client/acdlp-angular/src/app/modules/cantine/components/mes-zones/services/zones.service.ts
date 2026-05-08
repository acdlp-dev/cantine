import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ZoneAddress {
    id?: number;
    line1: string;
    postal_code: string | null;
    city: string | null;
    country: string;
    ordre?: number;
}

export interface Zone {
    id: number;
    nom: string;
    archived: number;
    created_at?: string;
    addresses: ZoneAddress[];
}

export interface ZonesResponse {
    zones: Zone[];
}

export interface ZonePayload {
    nom: string;
    addresses: Array<Pick<ZoneAddress, 'line1' | 'postal_code' | 'city' | 'country'>>;
}

@Injectable({ providedIn: 'root' })
export class ZonesService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    list(includeArchived = false): Observable<ZonesResponse> {
        const url = `${this.apiUrl}/zones${includeArchived ? '?archived=1' : ''}`;
        return this.http.get<ZonesResponse>(url, { withCredentials: true });
    }

    create(payload: ZonePayload): Observable<{ message: string; success: boolean; id: number }> {
        return this.http.post<{ message: string; success: boolean; id: number }>(
            `${this.apiUrl}/zones`, payload, { withCredentials: true }
        );
    }

    update(id: number, payload: ZonePayload): Observable<{ message: string; success: boolean }> {
        return this.http.put<{ message: string; success: boolean }>(
            `${this.apiUrl}/zones/${id}`, payload, { withCredentials: true }
        );
    }

    archive(id: number): Observable<{ message: string; success: boolean }> {
        return this.http.delete<{ message: string; success: boolean }>(
            `${this.apiUrl}/zones/${id}`, { withCredentials: true }
        );
    }
}
