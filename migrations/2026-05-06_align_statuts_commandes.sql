-- Migration : alignement des statuts Commandes sur le workflow unifié BO/Cantine
-- Date : 2026-05-06
-- Contexte : suppression des statuts legacy (en_attente, a_deposer, en_preparation, livree)
-- au profit du workflow : confirmee -> a_preparer -> a_recuperer -> recupere/non_recupere
--                                                            \-> annulee (à tout moment, cutoff J-2 pour asso)
--
-- À exécuter manuellement sur la BDD remote (`acdlp`).
-- Faire un backup avant : mysqldump -u rachid -p acdlp Commandes > Commandes_backup_2026-05-06.sql

-- 1. État des lieux (à lancer avant migration pour estimer l'impact)
SELECT statut, COUNT(*) AS nb,
       SUM(CASE WHEN livraison >= CURDATE() THEN 1 ELSE 0 END) AS futures,
       SUM(CASE WHEN livraison <  CURDATE() THEN 1 ELSE 0 END) AS passees
FROM Commandes
GROUP BY statut
ORDER BY nb DESC;

-- 2. Migration des statuts futurs (livraison >= aujourd'hui)
--    Les commandes futures sont remappées sur le nouveau workflow.

-- 'en_attente' = nouvelle commande pas encore traitée -> 'confirmee' (statut initial du nouveau workflow)
UPDATE Commandes
SET statut = 'confirmee'
WHERE statut = 'en_attente' AND livraison >= CURDATE();

-- 'a_deposer' (legacy) = commande prête à être déposée -> 'a_recuperer' dans le nouveau modèle
UPDATE Commandes
SET statut = 'a_recuperer'
WHERE statut = 'a_deposer' AND livraison >= CURDATE();

-- 'en_preparation' (legacy) -> 'a_preparer'
UPDATE Commandes
SET statut = 'a_preparer'
WHERE statut = 'en_preparation' AND livraison >= CURDATE();

-- 3. Normalisation des statuts passés (historique)
--    On harmonise pour que les vieilles commandes terminées ne polluent pas les filtres.

-- 'livree' (legacy) -> 'recupere' (commande récupérée par l'asso, équivalent moderne)
UPDATE Commandes
SET statut = 'recupere'
WHERE statut = 'livree';

-- 'en_attente' / 'a_deposer' / 'en_preparation' passées -> 'non_recupere'
--    (on assume que ce qui est resté dans ces statuts pour des dates passées n'a pas été récupéré)
UPDATE Commandes
SET statut = 'non_recupere'
WHERE statut IN ('en_attente', 'a_deposer', 'en_preparation') AND livraison < CURDATE();

-- 4. Vérification post-migration : ne devrait rester que des statuts du nouveau workflow
SELECT statut, COUNT(*) AS nb
FROM Commandes
GROUP BY statut
ORDER BY nb DESC;

-- Statuts attendus : confirmee, a_preparer, a_recuperer, recupere, non_recupere, annulee, blocked
-- Si un autre statut apparaît, investiguer avant de continuer.
