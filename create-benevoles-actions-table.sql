-- Création de la table benevoles_actions pour le calendrier des bénévoles

CREATE TABLE IF NOT EXISTS `benevoles_actions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `association_nom` varchar(255) NOT NULL,
  `rue` varchar(255) DEFAULT NULL,
  `ville` varchar(100) DEFAULT NULL,
  `pays` varchar(100) DEFAULT NULL,
  `nom` varchar(255) NOT NULL,
  `date_action` date NOT NULL,
  `heure_debut` time NOT NULL,
  `heure_fin` time NOT NULL,
  `recurrence` enum('Aucune','Quotidienne','Hebdomadaire') DEFAULT 'Aucune',
  `responsable_email` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_association` (`association_nom`),
  KEY `idx_date_action` (`date_action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Insertion des données de test
INSERT INTO `benevoles_actions` (
    `association_nom`, `rue`, `ville`, `pays`, `nom`, `date_action`, `heure_debut`, `heure_fin`, `recurrence`, `responsable_email`
) VALUES 
-- Actions ponctuelles
('au-coeur-de-la-precarite', '123 Rue de la Solidarité', 'Paris', 'France', 'Distribution de repas chauds', '2025-10-01', '18:00:00', '20:00:00', 'Aucune', 'responsable@acdlp.org'),
('au-coeur-de-la-precarite', '456 Avenue de l\'Entraide', 'Lyon', 'France', 'Collecte de vêtements', '2025-10-05', '14:00:00', '17:00:00', 'Aucune', 'collecte@acdlp.org'),
('au-coeur-de-la-precarite', NULL, 'Marseille', 'France', 'Visite à domicile', '2025-10-08', '10:00:00', '12:00:00', 'Aucune', 'visite@acdlp.org'),

-- Actions hebdomadaires 
('au-coeur-de-la-precarite', '789 Boulevard de la Fraternité', 'Paris', 'France', 'Maraude nocturne', '2025-09-30', '22:00:00', '01:00:00', 'Hebdomadaire', 'maraude@acdlp.org'),
('au-coeur-de-la-precarite', '321 Place de la République', 'Toulouse', 'France', 'Accueil et écoute', '2025-10-02', '09:00:00', '12:00:00', 'Hebdomadaire', 'accueil@acdlp.org'),

-- Actions quotidiennes
('au-coeur-de-la-precarite', '654 Rue de l\'Espoir', 'Nice', 'France', 'Permanence téléphonique', '2025-10-01', '08:00:00', '10:00:00', 'Quotidienne', 'permanence@acdlp.org'),
('au-coeur-de-la-precarite', '987 Avenue de la Paix', 'Bordeaux', 'France', 'Préparation des colis', '2025-09-28', '15:00:00', '18:00:00', 'Quotidienne', 'colis@acdlp.org'),

-- Actions du mois suivant
('au-coeur-de-la-precarite', '147 Rue de la Générosité', 'Strasbourg', 'France', 'Formation bénévoles', '2025-11-15', '10:00:00', '16:00:00', 'Aucune', 'formation@acdlp.org'),
('au-coeur-de-la-precarite', '258 Avenue du Partage', 'Lille', 'France', 'Atelier cuisine solidaire', '2025-11-03', '16:00:00', '19:00:00', 'Hebdomadaire', 'cuisine@acdlp.org'),

-- Actions pour une autre association (test de filtrage)
('secours-populaire', '369 Rue de la Solidarité', 'Paris', 'France', 'Action test autre asso', '2025-10-01', '14:00:00', '16:00:00', 'Aucune', 'test@sp.org');
