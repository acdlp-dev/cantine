-- ============================================================
-- MIGRATION acdlp → ACDLP
-- Suppression de toutes les données et tables liées aux dons
-- ============================================================

-- Date: 2026-01-26
-- Base de données: acdlp
-- ATTENTION: Ce script supprime définitivement des données !

USE acdlp;

-- ============================================================
-- ÉTAPE 1: BACKUP DES TABLES AVANT SUPPRESSION (optionnel)
-- ============================================================

-- Créer une table de backup pour traçabilité
CREATE TABLE IF NOT EXISTS migration_backup (
    id INT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(100),
    row_count INT,
    backup_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Enregistrer le nombre de lignes avant suppression
INSERT INTO migration_backup (table_name, row_count)
SELECT 'Dons_Ponctuels', COUNT(*) FROM Dons_Ponctuels
UNION ALL SELECT 'Personnes', COUNT(*) FROM Personnes
UNION ALL SELECT 'Prices', COUNT(*) FROM Prices
UNION ALL SELECT 'Dons_Mensuel_Failed', COUNT(*) FROM Dons_Mensuel_Failed
UNION ALL SELECT 'Stripe_Ponctuel_Cus_Intent', COUNT(*) FROM Stripe_Ponctuel_Cus_Intent
UNION ALL SELECT 'Stripe_Mensuel_Cus_Intent', COUNT(*) FROM Stripe_Mensuel_Cus_Intent
UNION ALL SELECT 'Campagnes', COUNT(*) FROM Campagnes
UNION ALL SELECT 'Assos_Campagnes', COUNT(*) FROM Assos_Campagnes;

-- ============================================================
-- ÉTAPE 2: SUPPRIMER LES TABLES LIÉES AUX DONS
-- ============================================================

-- Désactiver les checks de foreign keys temporairement
SET FOREIGN_KEY_CHECKS = 0;

-- Supprimer les tables (ordre inversé des dépendances)
DROP TABLE IF EXISTS Assos_Campagnes;
DROP TABLE IF EXISTS Campagnes;
DROP TABLE IF EXISTS Stripe_Mensuel_Cus_Intent;
DROP TABLE IF EXISTS Stripe_Ponctuel_Cus_Intent;
DROP TABLE IF EXISTS Dons_Mensuel_Failed;
DROP TABLE IF EXISTS Prices;
DROP TABLE IF EXISTS Personnes;
DROP TABLE IF EXISTS Dons_Ponctuels;

-- Réactiver les checks
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- ÉTAPE 3: SUPPRIMER LES UTILISATEURS DONATEURS
-- ============================================================

-- Supprimer les utilisateurs avec role='donator'
DELETE FROM users WHERE role = 'donator';

-- ============================================================
-- ÉTAPE 4: NETTOYER LA TABLE ASSOS (supprimer colonnes paiement)
-- ============================================================

-- Supprimer les colonnes liées aux paiements
ALTER TABLE Assos DROP COLUMN IF EXISTS stripe_secret_key;
ALTER TABLE Assos DROP COLUMN IF EXISTS stripe_publishable_key;
ALTER TABLE Assos DROP COLUMN IF EXISTS stripe_webhook_secret_key;
ALTER TABLE Assos DROP COLUMN IF EXISTS paypal_email;
ALTER TABLE Assos DROP COLUMN IF EXISTS paypal_email_zakat;
ALTER TABLE Assos DROP COLUMN IF EXISTS paypal_client_id;
ALTER TABLE Assos DROP COLUMN IF EXISTS iban_general;
ALTER TABLE Assos DROP COLUMN IF EXISTS iban_zakat;
ALTER TABLE Assos DROP COLUMN IF EXISTS bic_general;
ALTER TABLE Assos DROP COLUMN IF EXISTS bic_zakat;
ALTER TABLE Assos DROP COLUMN IF EXISTS recu;
ALTER TABLE Assos DROP COLUMN IF EXISTS demande_adresse;
ALTER TABLE Assos DROP COLUMN IF EXISTS demande_pro;

-- ============================================================
-- ÉTAPE 5: NETTOYER LA TABLE onboarding_backoffice
-- ============================================================

-- Réinitialiser le flag 'donations' pour toutes les associations
UPDATE onboarding_backoffice SET donations = FALSE;

-- Ou supprimer la colonne si inutile dans ACDLP
-- ALTER TABLE onboarding_backoffice DROP COLUMN IF EXISTS donations;

-- ============================================================
-- ÉTAPE 6: VÉRIFICATION POST-MIGRATION
-- ============================================================

-- Compter les tables restantes
SELECT
    'Tables restantes' AS check_type,
    COUNT(*) AS count
FROM information_schema.tables
WHERE table_schema = 'acdlp' AND table_type = 'BASE TABLE';

-- Vérifier qu'il n'y a plus de donateurs
SELECT
    'Utilisateurs donateurs restants' AS check_type,
    COUNT(*) AS count
FROM users
WHERE role = 'donator';

-- Vérifier qu'il n'y a plus de tables dons
SELECT
    'Tables dons restantes' AS check_type,
    COUNT(*) AS count
FROM information_schema.tables
WHERE table_schema = 'acdlp'
  AND table_name IN ('Dons_Ponctuels', 'Personnes', 'Prices', 'Campagnes', 'Assos_Campagnes');

-- Vérifier les tables conservées (ACDLP)
SELECT
    table_name,
    table_rows
FROM information_schema.tables
WHERE table_schema = 'acdlp'
  AND table_name IN (
    'benevoles',
    'actions',
    'Benevoles_Actions',
    'Actions_Masquees',
    'Commandes',
    'Quotas2',
    'Menus',
    'qrcode_cards',
    'meal_pickups',
    'Assos',
    'users',
    'onboarding_backoffice'
  )
ORDER BY table_name;

-- ============================================================
-- FIN DE LA MIGRATION
-- ============================================================

SELECT 'Migration ACDLP terminée avec succès !' AS status;
