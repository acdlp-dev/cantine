-- Migration : zones de distribution réutilisables par asso
-- Date : 2026-05-08
-- Contexte : aujourd'hui chaque commande oblige l'asso à ressaisir ses adresses
--   de distribution. On introduit des "zones" nommées (Zone A, B, C...) avec
--   leurs adresses, réutilisables d'une commande à l'autre.
--
-- À exécuter manuellement sur la BDD prod cantine après backup :
--   mysqldump -u root -p<pwd> acdlp > acdlp_backup_2026-05-08.sql

-- 1. Table zones_distribution : 1 zone = 1 nom + N adresses, scopée par asso
CREATE TABLE IF NOT EXISTS zones_distribution (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    nom VARCHAR(100) NOT NULL,
    archived TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_archived (user_id, archived),
    CONSTRAINT fk_zones_user FOREIGN KEY (user_id) REFERENCES asso_users(id) ON DELETE CASCADE
);

-- 2. Adresses d'une zone (1-N)
CREATE TABLE IF NOT EXISTS zone_addresses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    zone_id INT NOT NULL,
    line1 VARCHAR(255) NOT NULL,
    postal_code VARCHAR(20),
    city VARCHAR(100),
    country VARCHAR(50) DEFAULT 'France',
    ordre INT DEFAULT 0,
    INDEX idx_zone_ordre (zone_id, ordre),
    CONSTRAINT fk_addresses_zone FOREIGN KEY (zone_id) REFERENCES zones_distribution(id) ON DELETE CASCADE
);

-- 3. Lien optionnel d'une commande vers la zone d'origine (NULL = saisie libre legacy)
--    On garde la colonne `zone` VARCHAR existante : elle stocke le snapshot des adresses
--    au moment de la commande, indépendant des modifs ultérieures de la zone.
ALTER TABLE Commandes
    ADD COLUMN zone_id INT NULL,
    ADD INDEX idx_commandes_zone_id (zone_id);
-- Pas de FK stricte sur Commandes.zone_id : les commandes doivent survivre à un soft-delete
-- ou à une vraie suppression manuelle de zone. Le snapshot dans `zone` VARCHAR est la source
-- de vérité pour la cuisine.

-- 4. Vérification post-migration
SELECT 'zones_distribution' AS tbl, COUNT(*) AS rows_count FROM zones_distribution
UNION ALL
SELECT 'zone_addresses', COUNT(*) FROM zone_addresses
UNION ALL
SELECT 'Commandes (zone_id non NULL)', COUNT(*) FROM Commandes WHERE zone_id IS NOT NULL;
-- Attendu après première exécution : 0, 0, 0
