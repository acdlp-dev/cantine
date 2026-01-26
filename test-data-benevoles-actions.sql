-- Script de test pour les actions bénévoles
-- Insérer des données d'exemple dans la table benevoles_actions

INSERT INTO benevoles_actions (
    id, association_nom, rue, ville, pays, nom, date_action, heure_debut, heure_fin, recurrence, responsable_email, created_at
) VALUES 
-- Actions ponctuelles
(1, 'au-coeur-de-la-precarite', '123 Rue de la Solidarité', 'Paris', 'France', 'Distribution de repas chauds', '2025-10-01', '18:00:00', '20:00:00', 'Aucune', 'responsable@acdlp.org', NOW()),
(2, 'au-coeur-de-la-precarite', '456 Avenue de l\'Entraide', 'Lyon', 'France', 'Collecte de vêtements', '2025-10-05', '14:00:00', '17:00:00', 'Aucune', 'collecte@acdlp.org', NOW()),
(3, 'au-coeur-de-la-precarite', NULL, 'Marseille', 'France', 'Visite à domicile', '2025-10-08', '10:00:00', '12:00:00', 'Aucune', 'visite@acdlp.org', NOW()),

-- Actions hebdomadaires 
(4, 'au-coeur-de-la-precarite', '789 Boulevard de la Fraternité', 'Paris', 'France', 'Maraude nocturne', '2025-09-30', '22:00:00', '01:00:00', 'Hebdomadaire', 'maraude@acdlp.org', NOW()),
(5, 'au-coeur-de-la-precarite', '321 Place de la République', 'Toulouse', 'France', 'Accueil et écoute', '2025-10-02', '09:00:00', '12:00:00', 'Hebdomadaire', 'accueil@acdlp.org', NOW()),

-- Actions quotidiennes
(6, 'au-coeur-de-la-precarite', '654 Rue de l\'Espoir', 'Nice', 'France', 'Permanence téléphonique', '2025-10-01', '08:00:00', '10:00:00', 'Quotidienne', 'permanence@acdlp.org', NOW()),
(7, 'au-coeur-de-la-precarite', '987 Avenue de la Paix', 'Bordeaux', 'France', 'Préparation des colis', '2025-09-28', '15:00:00', '18:00:00', 'Quotidienne', 'colis@acdlp.org', NOW()),

-- Actions du mois suivant
(8, 'au-coeur-de-la-precarite', '147 Rue de la Générosité', 'Strasbourg', 'France', 'Formation bénévoles', '2025-11-15', '10:00:00', '16:00:00', 'Aucune', 'formation@acdlp.org', NOW()),
(9, 'au-coeur-de-la-precarite', '258 Avenue du Partage', 'Lille', 'France', 'Atelier cuisine solidaire', '2025-11-03', '16:00:00', '19:00:00', 'Hebdomadaire', 'cuisine@acdlp.org', NOW()),

-- Actions pour une autre association (test de filtrage)
(10, 'secours-populaire', '369 Rue de la Solidarité', 'Paris', 'France', 'Action test autre asso', '2025-10-01', '14:00:00', '16:00:00', 'Aucune', 'test@sp.org', NOW());
