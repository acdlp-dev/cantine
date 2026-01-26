import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LucideIconsModule } from '../../../../shared/modules/lucide-icons.module';
import { CantineService } from '../../services/cantine.service';

// Interface pour les données de la table Menus
interface MenuFromDB {
  id: number;
  date_ajout: string;
  menu_date: string | null;
  auteur_id: number;
  titre: string;
  allergenes: string[] | null;
}

type MenuItem = { name: string; price?: number; note?: string };
type DayMenu = { day: string; date?: string; items: MenuItem[]; menu?: MenuFromDB };

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, HttpClientModule, LucideIconsModule],
  templateUrl: './menu.component.html',
  styles: []
})
export class MenuComponent implements OnInit {
  weeklyMenu: DayMenu[] = [];
  loading = true;
  error = '';

  // Banner state
  showInfosBlockingBanner = false;
  missingCantineFields: string[] = [];

  constructor(private http: HttpClient, private cantineService: CantineService) { }

  ngOnInit(): void {
    // Check cantine infos first
    this.cantineService.checkCanteInfosCompleted().subscribe({
      next: (res) => {
        if (!res?.isComplete) {
          this.showInfosBlockingBanner = true;
          this.missingCantineFields = res?.missingFields || [];
          this.loading = false;
          return;
        }
        this.loadWeeklyMenu();
      },
      error: () => {
        this.showInfosBlockingBanner = true;
        this.missingCantineFields = [];
        this.loading = false;
      }
    });
  }

  loadWeeklyMenu(): void {
    this.loading = true;
    this.error = '';

    // Utiliser l'endpoint /cantine/menus qui récupère les données de la table Menus
    this.http.get<MenuFromDB[]>(`${environment.apiUrl}/menuAsso`, { withCredentials: true })
      .pipe(
        catchError(err => {
          console.error('Erreur en récupérant le menu de la semaine', err);
          this.error = 'Impossible de charger le menu — affichage du menu par défaut.';
          return of([]);
        })
      )
      .subscribe((menus) => {
        this.weeklyMenu = this.transformMenusToWeeklyFormat(menus || []);
        this.loading = false;
      });
  }

  private transformMenusToWeeklyFormat(menus: MenuFromDB[]): DayMenu[] {
    const daysOfWeek = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const today = new Date();

    // Calculer le début de la semaine (lundi)
    const dayOfWeek = today.getDay();
    const daysSinceMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysSinceMonday);

    // Créer les jours de la semaine (lundi à dimanche)
    const weekDays: DayMenu[] = [];
    for (let i = 0; i < 7; i++) { // Lundi à Dimanche
      const currentDay = new Date(monday);
      currentDay.setDate(monday.getDate() + i);
      const dayName = daysOfWeek[currentDay.getDay()];
      const dateStr = currentDay.toISOString().split('T')[0]; // format yyyy-mm-dd

      // Chercher un menu pour cette date
      const menuForDay = menus.find(menu => {
        // menu.menu_date peut être null ou une ISO complète; normaliser en yyyy-mm-dd
        const rawMenuDate = menu.menu_date || menu.date_ajout;
        const menuDateIso = rawMenuDate ? rawMenuDate.split('T')[0] : null;
        return menuDateIso === dateStr;
      });

      weekDays.push({
        day: dayName,
        date: currentDay.toLocaleDateString('fr-FR'),
        items: menuForDay ? [
          {
            name: menuForDay.titre,
            // allergenes peut être une chaîne ou un tableau ; gérer les deux cas
            note: menuForDay.allergenes ? `Allergènes: ${Array.isArray(menuForDay.allergenes) ? menuForDay.allergenes.join(', ') : menuForDay.allergenes}` : undefined
          }
        ] : [
          { name: 'Pas de menu' }
        ],
        menu: menuForDay
      });
    }

    return weekDays;
  }
}
