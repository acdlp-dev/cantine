import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenusAdminService, MenuAdmin } from './services/menusAdmin.service';

@Component({
  selector: 'app-menus-week',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './menusAdmin.component.html',
  styleUrls: ['./menusAdmin.component.scss']
})
export class MenusAdminComponent implements OnInit {
  menus: MenuAdmin[] = [];
  showSavedAlert = false;
  // date filter
  dateFrom: string | null = null;
  dateTo: string | null = null;
  isLoading = true;
  error: string | null = null;

  constructor(private menusService: MenusAdminService) {}

  // Toggle edit mode for a menu row
  toggleEdit(menu: MenuAdmin): void {
    menu._editing = !menu._editing;
  }

  ngOnInit(): void {
  // default to current week
  const today = new Date();
  const day = today.getDay();
  const daysSinceMonday = (day + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysSinceMonday);
  monday.setHours(0,0,0,0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
  this.dateFrom = fmt(monday);
  this.dateTo = fmt(sunday);
  this.loadMenus();
  }

  loadMenus(): void {
    this.isLoading = true;
    this.menusService.getMenus(this.dateFrom || undefined, this.dateTo || undefined).subscribe({
      next: (res: MenuAdmin[]) => {
        this.menus = res || [];
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erreur chargement menus', err);
        this.error = 'Impossible de charger les menus';
        this.isLoading = false;
      }
    });
  }

  addMenu(): void {
    const newMenu: MenuAdmin = { id: 0, date_ajout: new Date().toISOString(), menu_date: this.dateFrom || null, titre: '', auteur_id: null };
    this.menus.unshift(newMenu);
  }

  saveMenu(w: MenuAdmin): void {
    w._saving = true;
    if (w.id && w.id > 0) {
      const payload: Partial<MenuAdmin> = { titre: w.titre, allergenes: w.allergenes, menu_date: w.menu_date };
      this.menusService.updateMenu(w.id, payload).subscribe({
  next: (updated: MenuAdmin) => { Object.assign(w, updated); w._saving = false; w._saved = true; this.showSavedAlert = true; setTimeout(() => { w._saved = false; this.showSavedAlert = false; }, 1500); },
        error: (err: any) => { console.error(err); w._saving = false; this.error = 'Erreur sauvegarde'; }
      });
    } else {
      const payload: Partial<MenuAdmin> = { titre: w.titre, allergenes: w.allergenes, menu_date: w.menu_date };
      this.menusService.createMenu(payload).subscribe({
  next: (created: MenuAdmin) => { Object.assign(w, created); w._saving = false; w._saved = true; this.showSavedAlert = true; setTimeout(() => { w._saved = false; this.showSavedAlert = false; }, 1500); },
        error: (err: any) => { console.error(err); w._saving = false; this.error = 'Erreur création'; }
      });
    }
  }

  applyFilter(): void {
    this.loadMenus();
  }
}
