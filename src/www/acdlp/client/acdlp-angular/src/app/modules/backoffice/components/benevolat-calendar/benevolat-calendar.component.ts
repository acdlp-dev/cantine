import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActionService } from '../../../benevolat/services/action.service';
import { BenevolatAdminService } from '../../services/benevolat-admin.service';
import { CalendarMonth, CalendarAction } from '../../../benevolat/models/action.model';

@Component({
  selector: 'app-benevolat-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './benevolat-calendar.component.html',
  styleUrls: ['./benevolat-calendar.component.scss']
})
export class BenevolatCalendarComponent implements OnInit {
  currentDate = new Date();
  currentYear = this.currentDate.getFullYear();
  currentMonth = this.currentDate.getMonth();
  currentDay = this.currentDate.getDate();
  
  currentView: 'day' | 'week' | 'month' = 'month';
  
  calendarData: CalendarMonth | null = null;
  actions: any[] = [];
  participantsCounts: { [key: string]: number } = {};
  maskedActions: { [key: string]: boolean } = {};
  loading = true;
  error = false;
  
  monthNames: string[] = [];
  dayNames: string[] = [];
  
  selectedAction: CalendarAction | null = null;
  showActionModal = false;

  // Participants pour l'action sélectionnée
  actionParticipants: any[] = [];
  isLoadingParticipants = false;

  // Gestion de l'inscription/désinscription de bénévoles
  allBenevoles: any[] = [];
  filteredBenevoles: any[] = [];
  searchBenevole = '';
  selectedBenevoleEmail: string | null = null;
  isInscribing = false;

  // Étape de confirmation dans le modal
  showConfirmStep = false;
  confirmParticipant: any = null;
  confirmInscriptionId: number | null = null;
  unsubscribeOption: 'single' | 'all' = 'single';

  get currentDateObject(): Date {
    return new Date(this.currentYear, this.currentMonth, this.currentDay);
  }

  constructor(
    public actionService: ActionService,
    private benevolatAdminService: BenevolatAdminService
  ) {
    this.monthNames = this.actionService.getMonthNames();
    this.dayNames = this.actionService.getDayNames();
  }

  ngOnInit(): void {
    this.loadActions();
  }

  /**
   * Charge toutes les actions de l'association (mode admin)
   */
  loadActions(): void {
    this.loading = true;
    this.error = false;
    
    this.benevolatAdminService.getActionsList().subscribe({
      next: (response) => {
        if (response && response.success) {
          this.actions = response.actions || [];
          this.participantsCounts = response.participants_counts || {};
          this.maskedActions = response.masked_actions || {};
          // Stocker les compteurs dans le service pour qu'ils soient accessibles
          this.actionService.setParticipantsCounts(this.participantsCounts);
          this.generateCalendar();
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des actions:', error);
        this.error = true;
        this.loading = false;
      }
    });
  }

  /**
   * Génère le calendrier pour le mois courant
   */
  generateCalendar(): void {
    // Mode backoffice : pas de limite de temps (null = illimité)
    console.log('[BACKOFFICE CALENDAR] generateCalendar appelé - mois:', this.currentMonth, 'année:', this.currentYear);
    console.log('[BACKOFFICE CALENDAR] Nombre d\'actions:', this.actions.length);
    console.log('[BACKOFFICE CALENDAR] Passage de null pour maxDaysInFuture (illimité)');
    this.calendarData = this.actionService.generateCalendarMonth(
      this.currentYear, 
      this.currentMonth, 
      this.actions,
      null as any
    );
    console.log('[BACKOFFICE CALENDAR] Calendrier généré avec', this.calendarData?.weeks.length, 'semaines');
  }

  /**
   * Navigation vers le mois précédent
   */
  previousMonth(): void {
    this.currentMonth--;
    if (this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear--;
    }
    this.generateCalendar();
  }

  /**
   * Navigation vers le mois suivant
   */
  nextMonth(): void {
    this.currentMonth++;
    if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear++;
    }
    this.generateCalendar();
  }

  /**
   * Retour au mois actuel
   */
  goToToday(): void {
    const today = new Date();
    this.currentYear = today.getFullYear();
    this.currentMonth = today.getMonth();
    this.currentDay = today.getDate();
    this.loadActions();
  }

  /**
   * Change la vue du calendrier
   */
  changeView(view: 'day' | 'week' | 'month'): void {
    this.currentView = view;
    this.generateCalendar();
  }

  /**
   * Navigation précédente selon la vue
   */
  previous(): void {
    switch (this.currentView) {
      case 'day':
        this.previousDay();
        break;
      case 'week':
        this.previousWeek();
        break;
      case 'month':
        this.previousMonth();
        break;
    }
  }

  /**
   * Navigation suivante selon la vue
   */
  next(): void {
    switch (this.currentView) {
      case 'day':
        this.nextDay();
        break;
      case 'week':
        this.nextWeek();
        break;
      case 'month':
        this.nextMonth();
        break;
    }
  }

  previousDay(): void {
    const currentDate = new Date(this.currentYear, this.currentMonth, this.currentDay);
    currentDate.setDate(currentDate.getDate() - 1);
    this.currentYear = currentDate.getFullYear();
    this.currentMonth = currentDate.getMonth();
    this.currentDay = currentDate.getDate();
    this.generateCalendar();
  }

  nextDay(): void {
    const currentDate = new Date(this.currentYear, this.currentMonth, this.currentDay);
    currentDate.setDate(currentDate.getDate() + 1);
    this.currentYear = currentDate.getFullYear();
    this.currentMonth = currentDate.getMonth();
    this.currentDay = currentDate.getDate();
    this.generateCalendar();
  }

  previousWeek(): void {
    const currentDate = new Date(this.currentYear, this.currentMonth, this.currentDay);
    currentDate.setDate(currentDate.getDate() - 7);
    this.currentYear = currentDate.getFullYear();
    this.currentMonth = currentDate.getMonth();
    this.currentDay = currentDate.getDate();
    this.generateCalendar();
  }

  nextWeek(): void {
    const currentDate = new Date(this.currentYear, this.currentMonth, this.currentDay);
    currentDate.setDate(currentDate.getDate() + 7);
    this.currentYear = currentDate.getFullYear();
    this.currentMonth = currentDate.getMonth();
    this.currentDay = currentDate.getDate();
    this.generateCalendar();
  }

  getActionsForDay(date: Date): CalendarAction[] {
    if (!this.calendarData) return [];
    
    for (const week of this.calendarData.weeks) {
      for (const day of week.days) {
        if (day.date.getTime() === date.getTime()) {
          return day.actions;
        }
      }
    }
    return [];
  }

  getActionsForWeek(): CalendarAction[] {
    if (!this.calendarData) return [];
    
    const actions: CalendarAction[] = [];
    const currentDate = new Date(this.currentYear, this.currentMonth, this.currentDay);
    const startOfWeek = new Date(currentDate);
    const dayOfWeek = currentDate.getDay();
    const daysFromMonday = (dayOfWeek === 0) ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(currentDate.getDate() - daysFromMonday);
    
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + i);
      actions.push(...this.getActionsForDay(dayDate));
    }
    
    return actions;
  }

  getViewTitle(): string {
    switch (this.currentView) {
      case 'day':
        const dayDate = new Date(this.currentYear, this.currentMonth, this.currentDay);
        const dayIndex = (dayDate.getDay() + 6) % 7;
        return `${this.dayNames[dayIndex]} ${this.currentDay} ${this.monthNames[this.currentMonth]} ${this.currentYear}`;
      case 'week':
        const currentDate = new Date(this.currentYear, this.currentMonth, this.currentDay);
        const startOfWeek = new Date(currentDate);
        const dayOfWeek = currentDate.getDay();
        const daysFromMonday = (dayOfWeek === 0) ? 6 : dayOfWeek - 1;
        startOfWeek.setDate(currentDate.getDate() - daysFromMonday);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
          return `${startOfWeek.getDate()} - ${endOfWeek.getDate()} ${this.monthNames[startOfWeek.getMonth()]} ${startOfWeek.getFullYear()}`;
        } else {
          return `${startOfWeek.getDate()} ${this.monthNames[startOfWeek.getMonth()]} - ${endOfWeek.getDate()} ${this.monthNames[endOfWeek.getMonth()]} ${startOfWeek.getFullYear()}`;
        }
      case 'month':
      default:
        return `${this.monthNames[this.currentMonth]} ${this.currentYear}`;
    }
  }

  getCurrentWeekDay(dayIndex: number): Date {
    const currentDate = new Date(this.currentYear, this.currentMonth, this.currentDay);
    const startOfWeek = new Date(currentDate);
    const dayOfWeek = currentDate.getDay();
    const daysFromMonday = (dayOfWeek === 0) ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(currentDate.getDate() - daysFromMonday);
    
    const dayDate = new Date(startOfWeek);
    dayDate.setDate(startOfWeek.getDate() + dayIndex);
    
    return dayDate;
  }

  /**
   * Ouvre le modal de détail d'une action (mode admin - consultation uniquement)
   */
  openActionModal(action: CalendarAction): void {
    this.selectedAction = action;
    this.showActionModal = true;
    this.loadActionParticipants(action.id, action.calculatedDate);
    this.loadAllBenevoles();
    // Réinitialiser la recherche
    this.searchBenevole = '';
    this.selectedBenevoleEmail = null;
    this.filteredBenevoles = [];
  }

  /**
   * Ferme le modal de détail d'action
   */
  closeActionModal(): void {
    this.showActionModal = false;
    this.selectedAction = null;
    this.actionParticipants = [];
    // Réinitialiser l'état de confirmation
    this.showConfirmStep = false;
    this.confirmParticipant = null;
    this.confirmInscriptionId = null;
    this.unsubscribeOption = 'single';
  }

  /**
   * Charge la liste des participants d'une action (mode admin)
   */
  loadActionParticipants(actionId: number, calculatedDate: Date): void {
    this.isLoadingParticipants = true;
    
    const dateAction = this.actionService.formatDateForApi(calculatedDate);
    
    this.benevolatAdminService.getActionParticipants(actionId, dateAction).subscribe({
      next: (response) => {
        if (response && response.success) {
          this.actionParticipants = response.participants || [];
        }
        this.isLoadingParticipants = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des participants:', error);
        this.isLoadingParticipants = false;
      }
    });
  }

  /**
   * Obtient le nombre d'inscrits pour une action
   */
  getInscriptsCount(action: CalendarAction): number {
    return this.actionService.getInscriptsCount(action.id, action.calculatedDate);
  }

  /**
   * Obtient le texte des places
   */
  getPlacesText(action: CalendarAction): string {
    const inscrits = this.getInscriptsCount(action);
    const placesDisponibles = action.nb_participants;
    return `${inscrits} inscrit${inscrits > 1 ? 's' : ''} / ${placesDisponibles} places`;
  }

  /**
   * Vérifie si un jour est aujourd'hui
   */
  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  /**
   * Obtient la classe CSS pour une action
   */
  getActionClass(action: CalendarAction): string {
    const now = new Date();
    const actionDate = new Date(action.calculatedDate);
    const [heures, minutes] = action.heure_fin.split(':').map(Number);
    actionDate.setHours(heures, minutes, 0, 0);
    const isInPast = actionDate < now;
    
    // Actions passées → gris
    if (isInPast) {
      return 'bg-gray-400 text-white';
    }
    
    // Actions futures → bleu
    return 'bg-blue-500 text-white';
  }

  /**
   * Formate une heure au format HH:MM
   */
  formatTime(timeString: string): string {
    return this.actionService.formatTime(timeString);
  }

  /**
   * Obtient le libellé de récurrence
   */
  getRecurrenceLabel(recurrence: string): string {
    switch (recurrence) {
      case 'Quotidienne':
        return 'Tous les jours';
      case 'Hebdomadaire':
        return 'Chaque semaine';
      case 'Aucune':
      default:
        return 'Action ponctuelle';
    }
  }

  /**
   * Formate une date en français
   */
  formatDateInFrench(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return date.toLocaleDateString('fr-FR', options);
  }

  /**
   * Vérifie si une action est masquée
   */
  isActionMasked(action: CalendarAction): boolean {
    const dateStr = this.actionService.formatDateForApi(action.calculatedDate);
    const key = `${action.id}_${dateStr}`;
    return this.maskedActions[key] === true;
  }

  /**
   * Toggle le masquage d'une action
   */
  toggleMaskAction(event: Event, action: CalendarAction): void {
    event.stopPropagation(); // Empêcher l'ouverture du modal
    
    const dateStr = this.actionService.formatDateForApi(action.calculatedDate);
    const isMasked = this.isActionMasked(action);
    
    if (isMasked) {
      // Démasquer l'action
      this.benevolatAdminService.unmaskAction(action.id, dateStr).subscribe({
        next: (response) => {
          if (response.success) {
            // Mettre à jour l'état local
            const key = `${action.id}_${dateStr}`;
            delete this.maskedActions[key];
            console.log('Action démasquée avec succès');
          }
        },
        error: (error) => {
          console.error('Erreur lors du démasquage:', error);
          alert('Erreur lors du démasquage de l\'action');
        }
      });
    } else {
      // Masquer l'action
      this.benevolatAdminService.maskAction(action.id, dateStr).subscribe({
        next: (response) => {
          if (response.success) {
            // Mettre à jour l'état local
            const key = `${action.id}_${dateStr}`;
            this.maskedActions[key] = true;
            console.log('Action masquée avec succès');
          }
        },
        error: (error) => {
          console.error('Erreur lors du masquage:', error);
          alert('Erreur lors du masquage de l\'action');
        }
      });
    }
  }

  /**
   * Charge tous les bénévoles de l'association
   */
  loadAllBenevoles(): void {
    this.benevolatAdminService.getBenevoles().subscribe({
      next: (response) => {
        if (response && response.success) {
          this.allBenevoles = response.results || [];
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement des bénévoles:', error);
      }
    });
  }

  /**
   * Filtre les bénévoles selon le terme de recherche
   * Exclut les bénévoles avec le statut "email en attente"
   */
  filterBenevoles(): void {
    const term = this.searchBenevole.toLowerCase().trim();
    
    if (!term) {
      this.filteredBenevoles = [];
      return;
    }
    
    this.filteredBenevoles = this.allBenevoles.filter((benevole: any) => {
      // Filtre de recherche textuelle
      const matchesSearch = 
        benevole.nom.toLowerCase().includes(term) ||
        benevole.prenom.toLowerCase().includes(term) ||
        benevole.email.toLowerCase().includes(term);
      
      // Exclure les bénévoles avec le statut "email en attente"
      const isNotPending = benevole.statut !== 'email en attente';
      
      return matchesSearch && isNotPending;
    });
  }

  /**
   * Sélectionne un bénévole dans la liste filtrée
   */
  selectBenevole(benevole: any): void {
    this.selectedBenevoleEmail = benevole.email;
    this.searchBenevole = `${benevole.prenom} ${benevole.nom} (${benevole.email})`;
    this.filteredBenevoles = [];
  }

  /**
   * Inscrit le bénévole sélectionné à l'occurrence de l'action
   */
  inscribeBenevoleToOccurrence(): void {
    if (!this.selectedAction || !this.selectedBenevoleEmail) {
      alert('Veuillez sélectionner un bénévole');
      return;
    }
    
    this.isInscribing = true;
    
    // Trouver l'ID du bénévole à partir de son email
    const benevole = this.allBenevoles.find((b: any) => b.email === this.selectedBenevoleEmail);
    if (!benevole || !benevole.id) {
      alert('Impossible de trouver l\'ID du bénévole');
      this.isInscribing = false;
      return;
    }
    
    const dateAction = this.actionService.formatDateForApi(this.selectedAction.calculatedDate);
    
    this.benevolatAdminService.inscribeBenevoleToAction(
      this.selectedAction.id,
      dateAction,
      benevole.id
    ).subscribe({
      next: (response) => {
        if (response && response.success) {
          alert('Bénévole inscrit avec succès');
          // Réinitialiser la sélection
          this.searchBenevole = '';
          this.selectedBenevoleEmail = null;
          // Recharger les participants
          this.loadActionParticipants(this.selectedAction!.id, this.selectedAction!.calculatedDate);
          // Recharger les compteurs
          this.loadActions();
        }
        this.isInscribing = false;
      },
      error: (error) => {
        console.error('Erreur lors de l\'inscription:', error);
        alert(error.error?.message || 'Erreur lors de l\'inscription du bénévole');
        this.isInscribing = false;
      }
    });
  }

  /**
   * Ouvre l'étape de confirmation de désinscription
   */
  openConfirmStep(inscriptionId: number, participant: any): void {
    this.confirmInscriptionId = inscriptionId;
    this.confirmParticipant = participant;
    this.unsubscribeOption = 'single';
    this.showConfirmStep = true;
  }

  /**
   * Ferme l'étape de confirmation et retourne à la vue normale
   */
  closeConfirmStep(): void {
    this.showConfirmStep = false;
    this.confirmInscriptionId = null;
    this.confirmParticipant = null;
    this.unsubscribeOption = 'single';
  }

  /**
   * Confirme la désinscription selon l'option choisie
   */
  confirmUnsubscribe(): void {
    if (!this.confirmInscriptionId) {
      return;
    }

    if (this.unsubscribeOption === 'all') {
      this.uninscribeAllFutureOccurrences();
    } else {
      this.uninscribeBenevoleFromOccurrence(this.confirmInscriptionId);
    }
  }

  /**
   * Désinscrit un participant de l'occurrence de l'action uniquement
   */
  private uninscribeBenevoleFromOccurrence(inscriptionId: number): void {
    this.benevolatAdminService.uninscribeBenevoleFromAction(inscriptionId).subscribe({
      next: (response) => {
        if (response && response.success) {
          alert('Bénévole désinscrit avec succès');
          this.closeConfirmStep();
          // Recharger les participants
          if (this.selectedAction) {
            this.loadActionParticipants(this.selectedAction.id, this.selectedAction.calculatedDate);
          }
          // Recharger les compteurs
          this.loadActions();
        }
      },
      error: (error) => {
        console.error('Erreur lors de la désinscription:', error);
        alert(error.error?.message || 'Erreur lors de la désinscription du bénévole');
        this.closeConfirmStep();
      }
    });
  }

  /**
   * Désinscrit un participant de toutes les occurrences futures
   */
  private uninscribeAllFutureOccurrences(): void {
    if (!this.confirmInscriptionId) {
      return;
    }

    this.benevolatAdminService.uninscribeBenevoleFromAllFutureOccurrences(
      this.confirmInscriptionId
    ).subscribe({
      next: (response) => {
        if (response && response.success) {
          const count = response.count || 0;
          const dateDebut = response.date_debut ? new Date(response.date_debut).toLocaleDateString('fr-FR') : '';
          const dateFin = response.date_fin ? new Date(response.date_fin).toLocaleDateString('fr-FR') : '';
          
          alert(`Bénévole désinscrit de ${count} occurrence(s) (du ${dateDebut} au ${dateFin})`);
          this.closeConfirmStep();
          // Recharger les participants
          if (this.selectedAction) {
            this.loadActionParticipants(this.selectedAction.id, this.selectedAction.calculatedDate);
          }
          // Recharger les compteurs
          this.loadActions();
        }
      },
      error: (error) => {
        console.error('Erreur lors de la désinscription groupée:', error);
        alert(error.error?.message || 'Erreur lors de la désinscription groupée');
        this.closeConfirmStep();
      }
    });
  }
}
