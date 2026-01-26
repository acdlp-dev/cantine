-- Migration SQL pour ajouter les nouveaux champs à la table benevoles
-- Date de création : 2025-03-10
-- Description : Ajout des champs date_naissance, vehicule, source_connaissance et source_connaissance_autre

-- Ajout du champ date de naissance (pour remplacer progressivement le champ age)
ALTER TABLE benevoles 
ADD COLUMN date_naissance DATE DEFAULT NULL AFTER age;

-- Ajout du champ véhiculé
ALTER TABLE benevoles 
ADD COLUMN vehicule VARCHAR(10) DEFAULT 'non' AFTER genre;

-- Ajout du champ source de connaissance
ALTER TABLE benevoles 
ADD COLUMN source_connaissance VARCHAR(100) DEFAULT NULL AFTER vehicule;

-- Ajout du champ source de connaissance autre (texte libre si "Autre" est sélectionné)
ALTER TABLE benevoles 
ADD COLUMN source_connaissance_autre VARCHAR(255) DEFAULT NULL AFTER source_connaissance;

-- Commentaires pour documenter les champs
ALTER TABLE benevoles 
MODIFY COLUMN date_naissance DATE DEFAULT NULL COMMENT 'Date de naissance du bénévole';

ALTER TABLE benevoles 
MODIFY COLUMN vehicule VARCHAR(10) DEFAULT 'non' COMMENT 'Indique si le bénévole est véhiculé (oui/non)';

ALTER TABLE benevoles 
MODIFY COLUMN source_connaissance VARCHAR(100) DEFAULT NULL COMMENT 'Comment le bénévole a connu l\'association';

ALTER TABLE benevoles 
MODIFY COLUMN source_connaissance_autre VARCHAR(255) DEFAULT NULL COMMENT 'Détails si source_connaissance = "Autre"';
