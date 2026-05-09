import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideIconsModule } from '../../../../shared/modules/lucide-icons.module';
import { ZonesService, Zone, ZoneAddress } from './services/zones.service';

interface DraftAddress {
    line1: string;
    postal_code: string;
    city: string;
    country: string;
}

@Component({
    selector: 'app-mes-zones',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideIconsModule],
    templateUrl: './mes-zones.component.html'
})
export class MesZonesComponent implements OnInit {
    zones: Zone[] = [];
    loading = true;
    error: string | null = null;

    // Mode édition : null = liste, 'create' = nouveau, number = id zone éditée
    editingId: 'create' | number | null = null;
    draftNom = '';
    draftAddresses: DraftAddress[] = [];
    saving = false;
    formError: string | null = null;

    constructor(private zonesService: ZonesService) { }

    ngOnInit(): void {
        this.loadZones();
    }

    loadZones(): void {
        this.loading = true;
        this.error = null;
        this.zonesService.list().subscribe({
            next: (resp) => {
                this.zones = resp.zones || [];
                this.loading = false;
            },
            error: (err) => {
                console.error('[MesZones] Erreur chargement:', err);
                this.error = 'Impossible de charger les zones.';
                this.loading = false;
            }
        });
    }

    openCreate(): void {
        this.editingId = 'create';
        this.draftNom = '';
        this.draftAddresses = [this.emptyAddress()];
        this.formError = null;
    }

    openEdit(zone: Zone): void {
        this.editingId = zone.id;
        this.draftNom = zone.nom;
        this.draftAddresses = zone.addresses.length > 0
            ? zone.addresses.map(a => ({
                line1: a.line1 || '',
                postal_code: a.postal_code || '',
                city: a.city || '',
                country: a.country || 'France'
            }))
            : [this.emptyAddress()];
        this.formError = null;
    }

    cancelEdit(): void {
        this.editingId = null;
        this.draftNom = '';
        this.draftAddresses = [];
        this.formError = null;
    }

    addAddressLine(): void {
        this.draftAddresses.push(this.emptyAddress());
    }

    removeAddressLine(index: number): void {
        if (this.draftAddresses.length > 1) {
            this.draftAddresses.splice(index, 1);
        }
    }

    save(): void {
        this.formError = null;
        const nom = (this.draftNom || '').trim();
        if (!nom) {
            this.formError = 'Donne un nom à la zone (ex. Zone A).';
            return;
        }
        const valid = this.draftAddresses
            .map(a => ({
                line1: (a.line1 || '').trim(),
                postal_code: (a.postal_code || '').trim() || null,
                city: (a.city || '').trim() || null,
                country: (a.country || 'France').trim() || 'France'
            }))
            .filter(a => a.line1.length > 0);
        if (valid.length === 0) {
            this.formError = 'Renseigne au moins une adresse avec une rue.';
            return;
        }

        this.saving = true;
        const payload = { nom, addresses: valid };
        const obs = this.editingId === 'create'
            ? this.zonesService.create(payload)
            : this.zonesService.update(this.editingId as number, payload);

        obs.subscribe({
            next: () => {
                this.saving = false;
                this.cancelEdit();
                this.loadZones();
            },
            error: (err) => {
                console.error('[MesZones] Erreur sauvegarde:', err);
                this.formError = err?.error?.message || 'Erreur lors de l\'enregistrement.';
                this.saving = false;
            }
        });
    }

    archive(zone: Zone): void {
        const ok = confirm(`Archiver la zone "${zone.nom}" ? Elle ne sera plus proposée à la commande mais les commandes existantes restent intactes.`);
        if (!ok) return;
        this.zonesService.archive(zone.id).subscribe({
            next: () => this.loadZones(),
            error: (err) => {
                console.error('[MesZones] Erreur archivage:', err);
                alert(err?.error?.message || 'Erreur lors de l\'archivage.');
            }
        });
    }

    formatAddress(a: ZoneAddress): string {
        return [a.line1, [a.postal_code, a.city].filter(Boolean).join(' '), a.country].filter(Boolean).join(', ');
    }

    /**
     * Initialise Google Places Autocomplete sur le champ rue d'une adresse donnée.
     * À l'ajout, remplit automatiquement line1, code postal, ville et pays.
     */
    initGooglePlacesForInput(inputElement: EventTarget | null, index: number): void {
        if (!inputElement || !(inputElement instanceof HTMLInputElement)) return;
        const target = inputElement as HTMLInputElement & { _gpInited?: boolean };
        if (target._gpInited) return;
        try {
            const googleAny: any = (window as any).google;
            if (typeof googleAny === 'undefined' || !googleAny?.maps?.places) return;

            const autocomplete = new googleAny.maps.places.Autocomplete(target, {
                fields: ['address_components', 'formatted_address', 'name', 'types'],
                componentRestrictions: { country: 'fr' }
            });

            autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace();
                if (!place || !place.address_components) return;

                let streetNumber = '';
                let street = '';
                let city = '';
                let postalCode = '';
                let country = '';

                for (const component of place.address_components) {
                    const componentType = component.types[0];
                    switch (componentType) {
                        case 'street_number': streetNumber = component.long_name; break;
                        case 'route': street = component.long_name; break;
                        case 'locality': city = component.long_name; break;
                        case 'postal_code': postalCode = component.long_name; break;
                        case 'country': country = component.long_name; break;
                    }
                }

                const streetAddr = streetNumber && street ? `${streetNumber} ${street}` : street;
                const placeName = (place.name || '').trim();
                const isPoi = placeName && placeName !== streetAddr.trim();
                const line1 = isPoi
                    ? (streetAddr ? `${placeName}, ${streetAddr}` : placeName)
                    : streetAddr;

                const addr = this.draftAddresses[index];
                if (!addr) return;
                addr.line1 = line1 || addr.line1;
                addr.postal_code = postalCode || addr.postal_code;
                addr.city = city || addr.city;
                addr.country = country || addr.country || 'France';
            });

            target._gpInited = true;
        } catch (err) {
            console.error('Google Places API non disponible pour mes-zones', err);
        }
    }

    private emptyAddress(): DraftAddress {
        return { line1: '', postal_code: '', city: '', country: 'France' };
    }
}
