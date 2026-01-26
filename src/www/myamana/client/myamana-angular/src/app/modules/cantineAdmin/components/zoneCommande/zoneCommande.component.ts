import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ZoneCommandeService, ZoneCommande } from './services/zoneCommande.service';


@Component({
  selector: 'app-menus-week',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './zoneCommande.component.html',
  styleUrls: ['./zoneCommande.component.scss']
})
export class ZoneCommandeComponent implements OnInit {
  zones: ZoneCommande[] = [];
  showSavedAlert = false;
  // date filter
  dateFrom: string | null = null;
  dateTo: string | null = null;
  isLoading = true;
  error: string | null = null;
  // aggregated view: { zoneName: { count, commandes[], _open? } }
  zoneSummaries: { [zone: string]: { count: number; commandes: any[]; _open?: boolean } } = {};
  totalCommandes = 0;
  // static map url (OpenStreet static image with markers)
  staticMapUrl: string | null = null;
  // expose global Object to template (for Object.keys)
  Object = Object;
  // construction banner visibility
  showConstructionBanner = true;

  constructor(private zoneCommandeService: ZoneCommandeService) {}

  // Toggle edit mode for a zone row
  toggleEdit(zone: ZoneCommande): void {
    zone._editing = !zone._editing;
  }

  ngOnInit(): void {
    // default to current week
    const rng = this.zoneCommandeService.currentWeekRange();
    this.dateFrom = rng.from;
    this.dateTo = rng.to;
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.error = null;
    this.zoneCommandeService.getCommandesForRange(this.dateFrom || undefined, this.dateTo || undefined, 5000).subscribe({
      next: resp => {
        this.isLoading = false;
        const rows = resp.results || [];
        this.totalCommandes = resp.total || rows.length;
        const map: any = {};
        for (const r of rows) {
          const z = (r.zone || 'Non renseigné').trim();
          if (!map[z]) map[z] = { count: 0, commandes: [], _open: false };
          map[z].count += (r.repas_quantite || 0) || 1;
          map[z].commandes.push(r);
        }
  this.zoneSummaries = map;
  // kick off geocoding for each zone and build static map
  this.buildStaticMap();
      },
      error: err => {
        this.isLoading = false;
        this.error = err?.error?.message || err.message || 'Erreur lors du chargement';
      }
    });
  }

  private async buildStaticMap(): Promise<void> {
    
  }

}
