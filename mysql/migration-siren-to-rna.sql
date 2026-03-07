-- Migration: Remplacement de la colonne SIREN par RNA
-- Date: 2026-03-03
-- Description: Renomme la colonne 'siren' en 'rna' dans les tables users et Assos
--              et augmente la taille de VARCHAR(9) à VARCHAR(10) pour le format W + 9 chiffres

-- Table users : renommer siren -> rna
ALTER TABLE users CHANGE COLUMN siren rna VARCHAR(10) DEFAULT '';

-- Table Assos : renommer siren -> rna
ALTER TABLE Assos CHANGE COLUMN siren rna VARCHAR(10) DEFAULT '';
