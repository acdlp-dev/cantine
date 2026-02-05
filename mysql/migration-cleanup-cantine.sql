-- ============================================================
-- Migration: Nettoyage pour application Cantine dediee
-- Date: 2026-02-05
-- Description: Suppression des tables benevolat/QR code
--              et nettoyage de la table onboarding_backoffice
-- ============================================================

-- ATTENTION: Faire un backup de la base avant d'executer ce script !
-- mysqldump -u root -p acdlp > backup_before_cantine_cleanup.sql

-- ============================================================
-- 1. Suppression des tables benevolat (ordre respecte pour les FK)
-- ============================================================

-- D'abord les tables dependantes (FK vers d'autres tables)
DROP TABLE IF EXISTS meal_pickups;
DROP TABLE IF EXISTS qrcode_cards;
DROP TABLE IF EXISTS Actions_Masquees;
DROP TABLE IF EXISTS Benevoles_Actions;

-- Puis les tables principales
DROP TABLE IF EXISTS actions;
DROP TABLE IF EXISTS benevoles;

-- ============================================================
-- 2. Nettoyage de la table onboarding_backoffice
-- ============================================================

-- Supprimer les colonnes benevolat et suiviVehicule
ALTER TABLE onboarding_backoffice DROP COLUMN IF EXISTS benevolat;
ALTER TABLE onboarding_backoffice DROP COLUMN IF EXISTS suiviVehicule;

-- ============================================================
-- Verification
-- ============================================================
-- Lancer ces requetes pour verifier que le nettoyage est OK:
-- SHOW TABLES;
-- DESCRIBE onboarding_backoffice;
