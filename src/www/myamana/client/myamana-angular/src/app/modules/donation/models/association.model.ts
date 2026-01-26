export interface Campaign {
  nom: string;
  statut: string;
  step1: string;
  prix?: number;
  id_product?: string;
}

export interface Association {
  demande_pro: string;
  demande_adresse: string;
  recu_asso: string;
  name_asso: string;
  ty_link: string;
  ville: string;
  code_postal: string;
  adresse: string;
  bic_zakat: string;
  iban_zakat: string;
  bic_general: string;
  iban_general: string;
  surname_asso: string;
  campagnes_ponctuel: Campaign[];  
  campagnes_mensuel: Campaign[];
  paypal_email: string;
  paypal_email_zakat: string;
  objet: string;
  error_link: string;
  code_couleur: string;
  logo_url: string;
  site: string;
  code_postalCheque: string;
  adresseCheque: string;
  villeCheque: string;
  texteAdhesion: string | null;
  emailAsso: string;
}

export enum AddressRule {
  Mandatory = 'mandatory',
  Optional = 'optional',
  Disabled = 'disabled',
}

export enum CampaignType {
  LIBRE = 'libre',
  CALCUL = 'calcul',
  SELECTEUR_NOMINATIF = 'selecteurNominatif'
}