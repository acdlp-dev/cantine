import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LucideIconsModule } from '../../../../shared/modules/lucide-icons.module';
import { BackofficeAuthService } from '../../../backoffice-auth/services/backoffice-auth.service';
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
  email?: string;
  asso?: string;
  labels: Array<{ id: string; name: string; color: string }>;
  lastActivity: string;
  url: string;
  attachments: number | Array<{ id: string; name: string; url: string }>;
  status: 'new' | 'waiting' | 'resolved';
  comments?: Comment[];
  category?: string;
}

@Component({
  selector: 'app-assistance',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideIconsModule],
  templateUrl: './assistance.component.html',
  styleUrls: ['./assistance.component.scss']
})
export class AssistanceComponent implements OnInit {
  tickets: Ticket[] = [];
  selectedTicket: Ticket | null = null;
  isLoading = true;
  isLoadingDetail = false;
  isSending = false;
  errorMessage = '';
  successMessage = '';
  replyMessage = '';
  
  // Infos de l'asso connectée
  assoName = '';
  assoEmail = '';

  constructor(
    private http: HttpClient,
    private authService: BackofficeAuthService
  ) {}

  ngOnInit(): void {
    this.loadAssoInfo();
    this.loadMyTickets();
  }

  async loadAssoInfo(): Promise<void> {
    try {
      const asso = await this.authService.getAssoData().toPromise();
      if (asso) {
        this.assoName = asso.denomination || asso.raisonSociale || 'Mon association';
        this.assoEmail = asso.email || '';
      }
    } catch (error) {
      console.error('Erreur chargement infos asso', error);
    }
  }

  async loadMyTickets(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const response = await this.http.get<{ success: boolean; tickets: Ticket[] }>(
        `${environment.apiUrl}/support/my-tickets`,
        { withCredentials: true }
      ).toPromise();

      if (response?.success) {
        this.tickets = response.tickets.map(ticket => this.parseTicket(ticket));
      }
    } catch (error: any) {
      console.error('Erreur chargement tickets', error);
      this.errorMessage = 'Impossible de charger vos demandes';
    } finally {
      this.isLoading = false;
    }
  }

  parseTicket(ticket: Ticket): Ticket {
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
    this.successMessage = '';
    this.replyMessage = '';
    await this.loadTicketDetail(ticket.id);
  }

  async loadTicketDetail(ticketId: string): Promise<void> {
    this.isLoadingDetail = true;
    
    try {
      const response = await this.http.get<{ success: boolean; ticket: Ticket }>(
        `${environment.apiUrl}/support/tickets/${ticketId}`,
        { withCredentials: true }
      ).toPromise();

      if (response?.success && this.selectedTicket?.id === ticketId) {
        this.selectedTicket = {
          ...this.selectedTicket,
          ...response.ticket,
          category: this.selectedTicket.category
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
    this.replyMessage = '';
  }

  async sendReply(): Promise<void> {
    if (!this.selectedTicket || !this.replyMessage.trim()) return;

    this.isSending = true;
    this.errorMessage = '';

    try {
      await this.http.post(
        `${environment.apiUrl}/support/tickets/${this.selectedTicket.id}/asso-reply`,
        {
          message: this.replyMessage,
          assoName: this.assoName,
          assoEmail: this.assoEmail
        },
        { withCredentials: true }
      ).toPromise();

      this.successMessage = 'Message envoyé !';
      this.replyMessage = '';

      // Rafraîchir le ticket
      await this.loadTicketDetail(this.selectedTicket.id);
      await this.loadMyTickets();

    } catch (error: any) {
      console.error('Erreur envoi réponse', error);
      this.errorMessage = error?.error?.message || 'Erreur lors de l\'envoi';
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
      default: return 'Demande';
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
    switch (status) {
      case 'new': return 'En attente';
      case 'waiting': return 'Répondu';
      case 'resolved': return 'Résolu';
      default: return 'En cours';
    }
  }

  getStatusColor(status?: string): string {
    switch (status) {
      case 'new': return 'bg-orange-100 text-orange-700';
      case 'waiting': return 'bg-blue-100 text-blue-700';
      case 'resolved': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-gray-100 text-gray-600';
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
    const match = description.match(/## 📝 Message\s*\n\n([\s\S]*?)(\n\n---|\n\*Ticket créé|\n## 🔗)/);
    if (match) {
      return match[1].trim();
    }
    return description;
  }

  isFromSupport(comment: Comment): boolean {
    // Les commentaires du support contiennent "Réponse envoyée" ou viennent d'un admin
    return comment.text.includes('📧 **Réponse envoyée') || 
           comment.author.toLowerCase().includes('support') ||
           comment.author.toLowerCase().includes('myamana');
  }

  /**
   * Nettoie le texte d'un commentaire du support pour l'affichage
   */
  cleanSupportComment(comment: Comment): string {
    let text = comment.text;
    // Retirer le préfixe "📧 **Réponse envoyée à email**"
    text = text.replace(/📧 \*\*Réponse envoyée à [^*]+\*\*\n\n/, '');
    // Retirer le footer "---\n*Par Support MyAmana*"
    text = text.replace(/\n\n---\n\*Par[^*]*\*$/, '');
    return text.trim();
  }

  /**
   * Nettoie le texte d'un commentaire de l'asso pour l'affichage
   */
  cleanAssoComment(comment: Comment): string {
    let text = comment.text;
    // Retirer le préfixe "💬 **Réponse de l'association**"
    text = text.replace(/💬 \*\*Réponse de[^*]*\*\*\n\n/, '');
    // Retirer le footer "---\n*email*"
    text = text.replace(/\n\n---\n\*[^*]*\*$/, '');
    return text.trim();
  }
}

