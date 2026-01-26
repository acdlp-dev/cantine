import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LucideIconsModule } from '../../../../shared/modules/lucide-icons.module';
import { environment } from '../../../../../environments/environment';

interface Comment {
  id: string;
  text: string;
  date: string;
  author: string;
}

interface Ticket {
  id: string;
  title: string;
  description: string;
  labels: Array<{ id: string; name: string; color: string }>;
  members: Array<{ id: string; fullName: string }>;
  lastActivity: string;
  url: string;
  attachments: number | Array<{ id: string; name: string; url: string }>;
  comments?: Comment[];
  status?: 'new' | 'waiting'; // 'new' = nouveau, 'waiting' = en attente de réponse
  // Données extraites du titre/description
  asso?: string;
  email?: string;
  category?: string;
}

interface ReplyForm {
  subject: string;
  message: string;
}

@Component({
  selector: 'app-support-tickets',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideIconsModule],
  templateUrl: './support-tickets.component.html',
  styleUrls: ['./support-tickets.component.scss']
})
export class SupportTicketsComponent implements OnInit {
  tickets: Ticket[] = [];
  selectedTicket: Ticket | null = null;
  isLoading = true;
  isLoadingDetail = false;
  isReplying = false;
  isSending = false;
  isResolving = false;
  errorMessage = '';
  successMessage = '';
  newCount = 0; // Nombre de nouveaux tickets

  replyForm: ReplyForm = {
    subject: '',
    message: ''
  };

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadTickets();
  }

  async loadTickets(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const response = await this.http.get<{ success: boolean; tickets: Ticket[]; newCount: number }>(
        `${environment.apiUrl}/support/tickets`
      ).toPromise();

      if (response?.success) {
        this.tickets = response.tickets.map(ticket => this.parseTicket(ticket));
        this.newCount = response.newCount || 0;
      }
    } catch (error: any) {
      console.error('Erreur chargement tickets', error);
      this.errorMessage = 'Impossible de charger les tickets';
    } finally {
      this.isLoading = false;
    }
  }

  parseTicket(ticket: Ticket): Ticket {
    // Extraire l'asso du titre [asso] ...
    const assoMatch = ticket.title.match(/\[([^\]]+)\]/);
    if (assoMatch) {
      ticket.asso = assoMatch[1];
    }

    // Extraire l'email de la description
    const emailMatch = ticket.description.match(/\*\*Email:\*\*\s*(\S+)/);
    if (emailMatch) {
      ticket.email = emailMatch[1];
    }

    // Déterminer la catégorie à partir des labels
    if (ticket.labels?.length > 0) {
      const label = ticket.labels[0];
      if (label.color === 'red') ticket.category = 'bug';
      else if (label.color === 'blue') ticket.category = 'recu_fiscal';
      else if (label.color === 'green') ticket.category = 'question';
      else if (label.color === 'purple') ticket.category = 'donateur';
    }

    return ticket;
  }

  async selectTicket(ticket: Ticket): Promise<void> {
    this.selectedTicket = ticket;
    this.isReplying = false;
    this.resetReplyForm();
    this.successMessage = '';
    
    // Charger les détails avec le fil de discussion
    await this.loadTicketDetail(ticket.id);
  }

  async loadTicketDetail(ticketId: string): Promise<void> {
    this.isLoadingDetail = true;
    
    try {
      const response = await this.http.get<{ success: boolean; ticket: Ticket }>(
        `${environment.apiUrl}/support/tickets/${ticketId}`
      ).toPromise();

      if (response?.success && this.selectedTicket?.id === ticketId) {
        // Mettre à jour le ticket sélectionné avec les commentaires
        this.selectedTicket = {
          ...this.selectedTicket,
          ...response.ticket,
          category: this.selectedTicket.category // Garder la catégorie parsée
        };
      }
    } catch (error: any) {
      console.error('Erreur chargement détail ticket', error);
    } finally {
      this.isLoadingDetail = false;
    }
  }

  closeDetail(): void {
    this.selectedTicket = null;
    this.isReplying = false;
  }

  startReply(): void {
    if (this.selectedTicket) {
      this.isReplying = true;
      this.replyForm.subject = `Re: ${this.getCategoryLabel(this.selectedTicket.category)}`;
    }
  }

  cancelReply(): void {
    this.isReplying = false;
    this.resetReplyForm();
  }

  resetReplyForm(): void {
    this.replyForm = {
      subject: '',
      message: ''
    };
    this.errorMessage = '';
  }

  async sendReply(): Promise<void> {
    if (!this.selectedTicket || !this.replyForm.message.trim()) return;

    this.isSending = true;
    this.errorMessage = '';

    try {
      await this.http.post(
        `${environment.apiUrl}/support/tickets/${this.selectedTicket.id}/reply`,
        {
          email: this.selectedTicket.email,
          subject: this.replyForm.subject,
          message: this.replyForm.message,
          agentName: 'Support MyAmana' // Pourrait être récupéré de l'utilisateur connecté
        }
      ).toPromise();

      this.successMessage = 'Réponse envoyée avec succès !';
      this.isReplying = false;
      this.resetReplyForm();

      // Rafraîchir le ticket sélectionné pour voir le nouveau commentaire
      if (this.selectedTicket) {
        await this.loadTicketDetail(this.selectedTicket.id);
      }
      
      // Rafraîchir la liste
      await this.loadTickets();

    } catch (error: any) {
      console.error('Erreur envoi réponse', error);
      this.errorMessage = error?.error?.message || 'Erreur lors de l\'envoi de la réponse';
    } finally {
      this.isSending = false;
    }
  }

  getCategoryLabel(category?: string): string {
    switch (category) {
      case 'bug': return 'Bug technique';
      case 'recu_fiscal': return 'Reçu fiscal';
      case 'question': return 'Question';
      case 'donateur': return 'Question donateur';
      default: return 'Ticket';
    }
  }

  getCategoryIcon(category?: string): string {
    switch (category) {
      case 'bug': return 'bug';
      case 'recu_fiscal': return 'file-text';
      case 'question': return 'help-circle';
      case 'donateur': return 'user';
      default: return 'ticket';
    }
  }

  getCategoryColor(category?: string): string {
    switch (category) {
      case 'bug': return 'text-red-500 bg-red-100';
      case 'recu_fiscal': return 'text-blue-500 bg-blue-100';
      case 'question': return 'text-emerald-500 bg-emerald-100';
      case 'donateur': return 'text-purple-500 bg-purple-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR');
  }

  extractMessageFromDescription(description: string): string {
    // Extraire le message de la description (entre "## 📝 Message" et "---")
    const match = description.match(/## 📝 Message\s*\n\n([\s\S]*?)(\n\n---|\n\*Ticket créé)/);
    if (match) {
      return match[1].trim();
    }
    return description;
  }

  openInTrello(): void {
    if (this.selectedTicket?.url) {
      window.open(this.selectedTicket.url, '_blank');
    }
  }

  // Méthodes pour les pièces jointes
  hasAttachments(ticket: Ticket): boolean {
    if (Array.isArray(ticket.attachments)) {
      return ticket.attachments.length > 0;
    }
    return !!ticket.attachments && ticket.attachments > 0;
  }

  getAttachments(ticket: Ticket): Array<{ id: string; name: string; url: string }> {
    if (Array.isArray(ticket.attachments)) {
      return ticket.attachments;
    }
    return [];
  }

  isImage(filename: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return imageExtensions.includes(ext);
  }

  getFileIcon(filename: string): string {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    if (['.pdf'].includes(ext)) return 'file-text';
    if (['.doc', '.docx'].includes(ext)) return 'file';
    if (['.xls', '.xlsx'].includes(ext)) return 'table';
    return 'file';
  }

  getStatusLabel(status?: string): string {
    return status === 'new' ? 'Nouveau' : 'En attente';
  }

  getStatusColor(status?: string): string {
    return status === 'new' 
      ? 'bg-orange-100 text-orange-700' 
      : 'bg-blue-100 text-blue-700';
  }

  async resolveTicket(): Promise<void> {
    if (!this.selectedTicket) return;

    const confirmed = confirm('Voulez-vous vraiment marquer ce ticket comme résolu ?');
    if (!confirmed) return;

    this.isResolving = true;
    this.errorMessage = '';

    try {
      await this.http.post(
        `${environment.apiUrl}/support/tickets/${this.selectedTicket.id}/resolve`,
        {}
      ).toPromise();

      this.successMessage = 'Ticket marqué comme résolu !';
      
      // Retirer le ticket de la liste et fermer le détail
      this.tickets = this.tickets.filter(t => t.id !== this.selectedTicket?.id);
      this.selectedTicket = null;

      // Rafraîchir la liste
      await this.loadTickets();

    } catch (error: any) {
      console.error('Erreur résolution ticket', error);
      this.errorMessage = error?.error?.message || 'Erreur lors de la résolution du ticket';
    } finally {
      this.isResolving = false;
    }
  }
}

