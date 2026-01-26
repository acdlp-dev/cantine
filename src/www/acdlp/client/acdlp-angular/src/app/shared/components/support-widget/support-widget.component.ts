import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LucideIconsModule } from '../../modules/lucide-icons.module';
import { environment } from 'src/environments/environment';
import { BackofficeAuthService } from '../../../modules/backoffice-auth/services/backoffice-auth.service';

export type TicketCategory = 'bug' | 'recu_fiscal' | 'question' | 'donateur';

export interface TicketForm {
  category: TicketCategory | null;
  message: string;
  email: string;
  attachment: File | null;
}

@Component({
  selector: 'app-support-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideIconsModule],
  templateUrl: './support-widget.component.html',
  styleUrls: ['./support-widget.component.scss']
})
export class SupportWidgetComponent implements OnInit {
  isOpen = false;
  isSubmitting = false;
  isSuccess = false;
  errorMessage = '';

  categories = [
    { 
      id: 'bug' as TicketCategory, 
      label: 'Bug / Incident technique', 
      icon: 'bug',
      description: 'Signaler un problème technique',
      color: 'text-red-500'
    },
    { 
      id: 'donateur' as TicketCategory, 
      label: 'Questions sur un donateur', 
      icon: 'user',
      description: 'Accès, dons, reçu fiscal...',
      color: 'text-purple-500'
    },
    { 
      id: 'question' as TicketCategory, 
      label: 'Questions sur MyAmana', 
      icon: 'help-circle',
      description: 'Autres questions',
      color: 'text-emerald-500'
    }
  ];

  form: TicketForm = {
    category: null,
    message: '',
    email: '',
    attachment: null
  };

  attachmentName = '';
  assoName = '';

  constructor(
    private http: HttpClient,
    private backofficeAuthService: BackofficeAuthService
  ) {}

  ngOnInit(): void {
    // Récupérer les données de l'association connectée
    this.backofficeAuthService.getAssoData().subscribe({
      next: (asso) => {
        this.form.email = asso?.email || '';
        this.assoName = asso?.nameAsso || asso?.name_asso || asso?.organisation || '';
      },
      error: (err) => {
        console.error('Erreur récupération données asso', err);
      }
    });
  }

  toggleWidget(): void {
    this.isOpen = !this.isOpen;
    if (!this.isOpen) {
      this.resetForm();
    }
  }

  closeWidget(): void {
    this.isOpen = false;
    this.resetForm();
  }

  selectCategory(category: TicketCategory): void {
    this.form.category = category;
  }

  goBack(): void {
    this.form.category = null;
    this.form.message = '';
    this.form.attachment = null;
    this.attachmentName = '';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      // Limite à 5MB
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'Le fichier ne doit pas dépasser 5 Mo';
        return;
      }
      this.form.attachment = file;
      this.attachmentName = file.name;
      this.errorMessage = '';
    }
  }

  removeAttachment(): void {
    this.form.attachment = null;
    this.attachmentName = '';
  }

  getCategoryLabel(): string {
    const cat = this.categories.find(c => c.id === this.form.category);
    return cat ? cat.label : '';
  }

  isFormValid(): boolean {
    return !!(
      this.form.category &&
      this.form.message.trim().length >= 10 &&
      this.form.email.trim() &&
      this.isValidEmail(this.form.email)
    );
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async submitTicket(): Promise<void> {
    if (!this.isFormValid() || this.isSubmitting) return;

    this.isSubmitting = true;
    this.errorMessage = '';

    const formData = new FormData();
    formData.append('category', this.form.category!);
    formData.append('message', this.form.message);
    formData.append('email', this.form.email);
    formData.append('asso', this.assoName);
    
    if (this.form.attachment) {
      formData.append('attachment', this.form.attachment);
    }

    try {
      await this.http.post(`${environment.apiUrl}/support/ticket`, formData).toPromise();
      this.isSuccess = true;
    } catch (error: any) {
      console.error('Erreur soumission ticket', error);
      this.errorMessage = error?.error?.message || 'Une erreur est survenue. Veuillez réessayer.';
    } finally {
      this.isSubmitting = false;
    }
  }

  resetForm(): void {
    this.form = {
      category: null,
      message: '',
      email: this.form.email, // Garder l'email
      attachment: null
    };
    this.attachmentName = '';
    this.isSuccess = false;
    this.errorMessage = '';
  }

  newTicket(): void {
    this.resetForm();
  }
}

