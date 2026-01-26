import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AssociationsService, AssociationRow } from './services/associations.service';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideIconsModule } from '../../../../shared/modules/lucide-icons.module';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-associations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideIconsModule, HttpClientModule],
  templateUrl: './associations.component.html',
  styleUrls: []
})
export class AssociationsComponent implements OnInit {
  associations: AssociationRow[] = [];
  page = 1;
  limit = 20;
  total = 0;
  loading = false;
  // expose Math for template usage
  math = Math;
  // id of association which has menu open
  openMenuForId: number | null = null;
  // modal state for fine (amende)
  showFineModal = false;
  modalAmende: number | null = null;
  selectedAssociation: AssociationRow | null = null;

  constructor(private svc: AssociationsService) {}

  // close menu when clicking outside
  ngAfterViewInit(): void {
    window.addEventListener('click', this._outsideClickHandler.bind(this));
  }

  ngOnDestroy(): void {
    window.removeEventListener('click', this._outsideClickHandler.bind(this));
  }

  private _outsideClickHandler(ev: MouseEvent) {
    // close any open menu — we rely on button click to stop propagation when needed
    this.openMenuForId = null;
  }

  toggleMenuFor(a: AssociationRow, ev?: MouseEvent): void {
    if (ev) ev.stopPropagation();
    this.openMenuForId = this.openMenuForId === a.id ? null : a.id;
  }

  closeMenu(): void {
    this.openMenuForId = null;
  }

  ngOnInit(): void {
    this.load();
  }

  load(page = this.page): void {
    this.loading = true;
    this.svc.getAssociations(page, this.limit).subscribe({
      next: (res) => {
        this.associations = (res.results || []).map(r => ({ ...r }));
        // sync internal _blocked flag from backend statut
        this.associations.forEach(a => {
          (a as any)._blocked = a.statut === 'blocked';
        });
        this.total = res.total || 0;
        this.page = page;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  changePage(newPage: number): void {
    if (newPage < 1) newPage = 1;
    const last = Math.ceil(this.total / this.limit) || 1;
    if (newPage > last) newPage = last;
    this.load(newPage);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.limit));
  }

  // Client-side toggle to mark an association as blocked (no backend call yet)
  toggleBlock(a: AssociationRow): void {
    const currentlyBlocked = a.statut === 'blocked' || !!(a as any)._blocked;
    const newVal = !currentlyBlocked;

    if (newVal) {
      this.selectedAssociation = a;
      this.modalAmende = null;
      this.showFineModal = true;
      return;
    }

    a.statut = 'ok';
    (a as any)._blocked = false;
    this.svc.updateAssociationStatus(a.id, 'ok').subscribe({
      next: () => {},
      error: (err) => {
        console.error('Erreur lors de la mise à jour du statut d\'association', err);
        a.statut = 'blocked';
        (a as any)._blocked = true;
        this.load(this.page);
      }
    });
  }

  confirmBlock(): void {
    if (!this.selectedAssociation) return;
    const a = this.selectedAssociation;
    const amendeVal = this.modalAmende !== null ? Number(this.modalAmende) : undefined;

    a.statut = 'blocked';
    (a as any)._blocked = true;
    this.showFineModal = false;

    this.svc.updateAssociationStatus(a.id, 'blocked', amendeVal).subscribe({
      next: () => {},
      error: (err) => {
        console.error('Erreur lors de la mise à jour du statut d\'association', err);
        a.statut = 'ok';
        (a as any)._blocked = false;
        this.load(this.page);
      }
    });

    this.selectedAssociation = null;
    this.modalAmende = null;
  }

  cancelBlock(): void {
    this.showFineModal = false;
    this.selectedAssociation = null;
    this.modalAmende = null;
  }

  isBlocked(a: AssociationRow): boolean {
    return a.statut === 'blocked' || !!(a as any)._blocked;
  }
}
