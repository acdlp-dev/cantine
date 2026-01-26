import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { QuotasService, Quota } from './services/quotas.service';

@Component({
  selector: 'app-quotas',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './quotas.component.html',
  styleUrls: ['./quotas.component.scss']
})
export class QuotasComponent implements OnInit {
  quotas: Quota[] = [];
  isLoading: boolean = true;
  error: string | null = null;
  selectedDate: string = '';
  dateFrom: string | null = null;
  dateTo: string | null = null;

  constructor(private quotasService: QuotasService) {}

  ngOnInit(): void {
    // default to current week
    const today = new Date();
    this.selectedDate = this.toIso(today);
    this.setWeekFromSelected();
    this.loadQuotas();
  }

  loadQuotas(): void {
    this.isLoading = true;
    this.error = null;
    this.quotasService.getQuotas(this.dateFrom || undefined, this.dateTo || undefined).subscribe({
      next: (res) => {
        this.quotas = res || [];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur chargement quotas', err);
        this.error = 'Impossible de charger les quotas';
        this.isLoading = false;
      }
    });
  }

  // UI events
  onDateChange(): void {
    if (!this.selectedDate) return;
    this.setWeekFromSelected();
    this.loadQuotas();
  }

  prevWeek(): void {
    const d = this.parseIso(this.selectedDate);
    d.setDate(d.getDate() - 7);
    this.selectedDate = this.toIso(d);
    this.setWeekFromSelected();
    this.loadQuotas();
  }

  nextWeek(): void {
    const d = this.parseIso(this.selectedDate);
    d.setDate(d.getDate() + 7);
    this.selectedDate = this.toIso(d);
    this.setWeekFromSelected();
    this.loadQuotas();
  }

  thisWeek(): void {
    const today = new Date();
    this.selectedDate = this.toIso(today);
    this.setWeekFromSelected();
    this.loadQuotas();
  }

  applyDateFilter(): void {
    // If both dates provided, use them; if only one, keep current other bound
    if (!this.dateFrom && !this.dateTo) return;
    // Ensure from <= to
    if (this.dateFrom && this.dateTo && this.dateFrom > this.dateTo) {
      const tmp = this.dateFrom;
      this.dateFrom = this.dateTo;
      this.dateTo = tmp;
    }
    // Align selectedDate to new range center (or start)
    if (this.dateFrom) this.selectedDate = this.dateFrom;
    this.loadQuotas();
  }

  resetFilter(): void {
    this.thisWeek();
  }

  // helpers
  private setWeekFromSelected(): void {
    const ref = this.parseIso(this.selectedDate);
    const day = ref.getDay(); // 0..6 (0 dim)
    const daysSinceMonday = (day + 6) % 7; // 0..6
    const monday = new Date(ref);
    monday.setDate(ref.getDate() - daysSinceMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    this.dateFrom = this.toIso(monday);
    this.dateTo = this.toIso(sunday);
  }

  private toIso(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  private parseIso(s: string): Date {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }

  // UI formatter: accept ISO string or null and return yyyy-mm-dd
  formatDate(value?: string | null): string {
    if (!value) return '-';
    // If value contains 'T', split to keep only date part
    if (value.includes('T')) {
      return value.split('T')[0];
    }
    // Already a date string yyyy-mm-dd
    return value;
  }

  saveQuota(q: Quota): void {
    q._saving = true;
    this.quotasService.updateQuota(q.id, q).subscribe({
      next: () => {
        q._saving = false;
        q._saved = true;
        setTimeout(() => (q._saved = false), 1500);
      },
      error: (err) => {
        console.error('Erreur save quota', err);
        q._saving = false;
        this.error = 'Echec de la sauvegarde';
      }
    });
  }

  saveAll(): void {
    // Bulk update: naive sequential saves
    for (const q of this.quotas) {
      this.saveQuota(q);
    }
  }
}
