export interface VolunteerFormData {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  telephone: string;
  adresse: string;
  ville: string;
  code_postal: string;
  pays: string;
  age: number; // Calculé depuis date_naissance pour compatibilité backend
  date_naissance: string; // Nouveau : date de naissance au format YYYY-MM-DD
  genre: string;
  vehicule: string; // Nouveau : "oui" ou "non"
  source_connaissance: string; // Nouveau : comment la personne a connu l'association
  source_connaissance_autre?: string; // Nouveau : détails si "Autre" sélectionné
  metiers_competences: string;
  asso: string;
}

export interface SaveVolunteerResponse {
  success: boolean;
  volunteerId?: string;
  tracking?: string;
  message?: string;
}
