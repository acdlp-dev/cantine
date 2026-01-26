import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { BenevolatAdminService, ActionData, Benevole } from '../../services/benevolat-admin.service';

interface Action {
  id: number;
  association_nom: string;
  rue: string;
  ville: string;
  pays: string;
  nom: string;
  description?: string;
  date_action: string;
  heure_debut: string;
  heure_fin: string;
  recurrence: string;
  responsable_email: string;
  nb_participants: number;
  genre: string;
  age: string;
  created_at: string;
}

@Component({
  selector: 'app-benevolat-actions-list',
  standalone: true,
  imports: [CommonModule, FormsModule, QuillModule],
  templateUrl: './benevolat-actions-list.component.html',
  styleUrls: ['./benevolat-actions-list.component.scss']
})
export class BenevolatActionsListComponent implements OnInit {
  // Configuration Quill
  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ 'header': [1, 2, false] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link'],
      ['clean']
    ]
  };

  actions: Action[] = [];
  filteredActions: Action[] = [];
  loading = true;
  error = false;
  searchTerm = '';
  
  // Modal d'édition
  showEditModal = false;
  selectedAction: Action | null = null;
  editForm: ActionData = this.getEmptyForm();
  saving = false;
  
  // Liste des responsables
  responsables: Benevole[] = [];
  isLoadingResponsables = false;

  constructor(private benevolatService: BenevolatAdminService) {}

  ngOnInit(): void {
    this.loadActions();
    this.loadResponsables();
  }
  
  /**
   * Charge la liste des responsables
   */
  loadResponsables(): void {
    this.isLoadingResponsables = true;
    this.benevolatService.getResponsables().subscribe({
      next: (response) => {
        if (response && response.results) {
          this.responsables = response.results;
        }
        this.isLoadingResponsables = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des responsables', err);
        this.isLoadingResponsables = false;
      }
    });
  }

  /**
   * Charge la liste des actions
   */
  loadActions(): void {
    this.loading = true;
    this.error = false;
    
    this.benevolatService.getActionsList().subscribe({
      next: (response) => {
        if (response && response.success) {
          this.actions = response.actions || [];
          this.filteredActions = [...this.actions];
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
   * Filtre les actions selon le terme de recherche
   */
  filterActions(): void {
    const term = this.searchTerm.toLowerCase().trim();
    
    if (!term) {
      this.filteredActions = [...this.actions];
      return;
    }
    
    this.filteredActions = this.actions.filter(action =>
      action.nom.toLowerCase().includes(term) ||
      action.ville?.toLowerCase().includes(term) ||
      action.responsable_email.toLowerCase().includes(term)
    );
  }

  /**
   * Ouvre le modal d'édition
   */
  openEditModal(action: Action): void {
    this.selectedAction = action;
    this.editForm = {
      rue: action.rue || '',
      ville: action.ville || '',
      pays: action.pays || 'France',
      nom: action.nom,
      description: action.description || '',
      date_action: action.date_action,
      heure_debut: action.heure_debut,
      heure_fin: action.heure_fin,
      recurrence: action.recurrence || 'Aucune',
      responsable_email: action.responsable_email,
      nb_participants: action.nb_participants || 6,
      genre: action.genre || 'mixte',
      age: action.age || 'majeure'
    };
    this.showEditModal = true;
  }

  /**
   * Ferme le modal d'édition
   */
  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedAction = null;
    this.editForm = this.getEmptyForm();
  }

  /**
   * Sauvegarde les modifications
   */
  saveAction(): void {
    if (!this.selectedAction) return;
    
    this.saving = true;
    
    this.benevolatService.updateAction(this.selectedAction.id, this.editForm).subscribe({
      next: (response) => {
        if (response && response.success) {
          alert('Action mise à jour avec succès');
          this.closeEditModal();
          this.loadActions(); // Recharger la liste
        }
        this.saving = false;
      },
      error: (error) => {
        console.error('Erreur lors de la mise à jour:', error);
        alert('Erreur lors de la mise à jour de l\'action');
        this.saving = false;
      }
    });
  }

  /**
   * Retourne un formulaire vide
   */
  private getEmptyForm(): ActionData {
    return {
      rue: '',
      ville: '',
      pays: 'France',
      nom: '',
      description: '',
      date_action: '',
      heure_debut: '',
      heure_fin: '',
      recurrence: 'Aucune',
      responsable_email: '',
      nb_participants: 6,
      genre: 'mixte',
      age: 'majeure'
    };
  }

  /**
   * Formate une date pour l'affichage
   */
  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR');
  }

  /**
   * Formate une heure pour l'affichage
   */
  formatTime(timeStr: string): string {
    if (!timeStr) return '';
    return timeStr.substring(0, 5); // HH:MM
  }
}
