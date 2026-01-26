-- Migration: Ajout du champ description à la table actions
-- Date: 2025-01-03
-- Description: Ajoute un champ TEXT pour permettre de saisir une description détaillée de chaque action

ALTER TABLE actions 
ADD COLUMN description TEXT NULL 
AFTER nom;
