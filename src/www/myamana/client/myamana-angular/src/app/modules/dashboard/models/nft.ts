export interface Nft {
  id: number;
  asso: string;
  campagne?: string;
  montant?: number;
  image: string;
  link: string;
  date: String;
  dateT: String;
  statut: String;
  recurrence: string;
  stripeSubId: string;
  uri:string;
  resumeDate:string;
  email: string;
  firstName: string;
  lastName: string;
  occurence: 'mensuel' | 'quotidien';
  moyen?: 'IBAN' | 'CB';
  last4?: string;
  brand?: 'visa' | 'mastercard' | 'american-express' | 'carte-bancaire';
  expirationCB?: string;
  error_mail_sent?: string;
}
