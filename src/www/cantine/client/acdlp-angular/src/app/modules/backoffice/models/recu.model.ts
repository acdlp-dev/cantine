/**
 * Interface représentant les statistiques des reçus fiscaux
 */
export interface RecusStats {
  // Statistiques pour tous les reçus
  totalCount: number;          // Nombre total de reçus émis
  totalAmount: number;         // Montant total de tous les reçus
  lastYearCount: number;       // Nombre de reçus émis l'année précédente
  lastYearAmount: number;      // Montant total des reçus de l'année précédente

  // Statistiques par type
  ponctuelCount: number;       // Nombre de reçus pour dons ponctuels
  ponctuelAmount: number;      // Montant total des reçus pour dons ponctuels
  mensuelCount: number;        // Nombre de reçus pour dons mensuels
  mensuelAmount: number;       // Montant total des reçus pour dons mensuels

  // Propriétés pour l'année précédente
  ponctuelCountLastYear: number;
  ponctuelAmountLastYear: number;
  mensuelCountLastYear: number;
  mensuelAmountLastYear: number;
  // Statistiques par année
  yearlyStats: {
    year: string;              // Année
    count: number;             // Nombre de reçus pour cette année
    amount: number;            // Montant total pour cette année
  }[];
}

/**
 * Interface représentant un reçu fiscal
 */
export interface RecuFiscal {
  id: string;                  // Identifiant unique du reçu
  reference: string;           // Référence du reçu
  donType: 'ponctuel' | 'mensuel' | 'quotidien'; // Type de don
  donId: string;               // Identifiant du don associé (ponctuel ou mensuel)
  email: string;               // Email du donateur
  firstName: string;           // Prénom du donateur
  lastName: string;            // Nom du donateur
  address: string;             // Adresse postale du donateur
  postalCode: string;          // Code postal du donateur
  city: string;                // Ville du donateur
  amount: number;              // Montant du reçu
  date: string;                // Date d'émission du reçu
  year: string;                // Année fiscale du reçu
  asso: string;                // Association concernée
  assoName?: string;           // Nom de l'association
  pdfLink: string;             // Lien vers le PDF du reçu
  status: 'generated' | 'sent' | 'error'; // Statut du reçu
  emailSent: boolean;          // Si l'email avec le reçu a été envoyé
  emailSentDate?: string;      // Date d'envoi de l'email
}

/**
 * Interface pour les filtres de recherche des reçus
 */
export interface RecuFiscalFilters {
  year?: string;               // Filtrer par année
  donType?: 'ponctuel' | 'mensuel'; // Filtrer par type de don
  email?: string;              // Filtrer par email de donateur
  status?: string;             // Filtrer par statut
  dateStart?: string;          // Date de début pour la période
  dateEnd?: string;            // Date de fin pour la période
}