import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideIconsModule } from '../../../../shared/modules/lucide-icons.module';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { QuillModule } from 'ngx-quill';
import { BenevolatAdminService, ActionData, Benevole } from '../../services/benevolat-admin.service';

@Component({
  selector: 'app-benevolat-actions',
  standalone: true,
  imports: [
    CommonModule,
    LucideIconsModule,
    FormsModule,
    HttpClientModule,
    QuillModule
  ],
  templateUrl: './benevolat-actions.component.html',
  styleUrls: ['./benevolat-actions.component.scss'],
  providers: [BenevolatAdminService]
})
export class BenevolatActionsComponent implements OnInit {
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

  // Modèle du formulaire
  actionData: ActionData = {
    nom: '',
    description: '',
    date_action: '',
    heure_debut: '',
    heure_fin: '',
    responsable_email: '',
    rue: '',
    ville: '',
    pays: 'France',
    recurrence: 'Aucune',
    nb_participants: 6,
    genre: 'mixte',
    age: 'majeure'
  };

  // Liste des responsables
  responsables: Benevole[] = [];
  isLoadingResponsables: boolean = false;

  isSubmitting: boolean = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  constructor(private benevolatService: BenevolatAdminService) {}

  ngOnInit(): void {
    this.loadResponsables();
  }

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

  onSubmit(): void {
    // Validation basique
    if (!this.actionData.nom || !this.actionData.date_action || 
        !this.actionData.heure_debut || !this.actionData.heure_fin || 
        !this.actionData.responsable_email) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires';
      return;
    }

    this.isSubmitting = true;
    this.successMessage = null;
    this.errorMessage = null;

    this.benevolatService.createAction(this.actionData)
      .subscribe({
        next: (response) => {
          this.isSubmitting = false;
          if (response.success) {
            this.successMessage = 'Action créée avec succès !';
            // Réinitialiser le formulaire
            this.resetForm();
            // Cacher le message après 5 secondes
            setTimeout(() => {
              this.successMessage = null;
            }, 5000);
          } else {
            this.errorMessage = response.message || 'Erreur lors de la création de l\'action';
          }
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Erreur lors de la création de l\'action', err);
          this.errorMessage = err.error?.message || 'Erreur lors de la création de l\'action. Veuillez réessayer.';
        }
      });
  }

  resetForm(): void {
    this.actionData = {
      nom: '',
      description: '',
      date_action: '',
      heure_debut: '',
      heure_fin: '',
      responsable_email: '',
      rue: '',
      ville: '',
      pays: 'France',
      recurrence: 'Aucune',
      nb_participants: 6,
      genre: 'mixte',
      age: 'majeure'
    };
  }
}
