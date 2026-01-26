#!/usr/bin/env node

/**
 * CRON - Synchronisation des donateurs ACDLP vers Mailjet
 * 
 * Ce script récupère les dons de la veille pour l'association
 * "Au Coeur de la Précarité" et synchronise les donateurs vers Mailjet.
 * 
 * Usage:
 *   node crons/syncDonateursMailjet.js
 *   npm run cron:mailjet-sync
 * 
 * Planification recommandée (crontab):
 *   0 2 * * * cd /path/to/node && node crons/syncDonateursMailjet.js >> logs/mailjet-sync.log 2>&1
 */

const path = require('path');

// Charger les variables d'environnement
require('dotenv').config({ path: path.resolve(__dirname, '../../../../../../.env') });

// Fallback Docker
if (!process.env.MJ_APIKEY_PUBLIC) {
  require('dotenv').config({ path: '/usr/src/app/.env' });
}

const bdd = require('../services/bdd');
const { syncDonateurs, MAILJET_LIST_ID } = require('../services/mailjetSyncService');

// Configuration
const ASSO_URI = 'au-coeur-de-la-precarite';

/**
 * Formatte une date en YYYY-MM-DD
 */
const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

/**
 * Récupère la date d'hier
 */
const getYesterdayDate = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
};

/**
 * Récupère tous les dons d'hier pour ACDLP
 * Note: La table Dons_Ponctuels contient tous les dons (ponctuels, mensuels, quotidiens)
 * Le champ 'type' indique le type de don
 */
const getDonsHier = async () => {
  const yesterday = formatDate(getYesterdayDate());
  
  const sql = `
    SELECT 
      dp.email,
      dp.prenom,
      dp.nom,
      dp.amana,
      dp.type,
      dp.moyen,
      dp.source,
      dp.ajout,
      dp.stripe_sub_id as subId,
      dp.stripe_cus_id as cusId
    FROM Dons_Ponctuels dp
    WHERE dp.asso = ?
      AND DATE(dp.ajout) = ?
      AND dp.email IS NOT NULL
      AND dp.email != ''
    ORDER BY dp.ajout DESC
  `;

  console.log(`📅 Recherche des dons du ${yesterday}...`);
  const results = await bdd.select(sql, [ASSO_URI, yesterday], 'remote');
  console.log(`   → ${results.length} don(s) trouvé(s)`);
  
  return results;
};

/**
 * Déduplique les donateurs (garde le dernier don par email)
 */
const deduplicateDonateurs = (dons) => {
  const donateursByEmail = new Map();
  
  for (const don of dons) {
    const existing = donateursByEmail.get(don.email.toLowerCase());
    if (!existing || new Date(don.ajout) > new Date(existing.ajout)) {
      donateursByEmail.set(don.email.toLowerCase(), don);
    }
  }
  
  return Array.from(donateursByEmail.values());
};

/**
 * Point d'entrée principal
 */
const main = async () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 CRON Mailjet Sync - Au Coeur de la Précarité');
  console.log('='.repeat(60));
  console.log(`📆 Date d'exécution: ${new Date().toISOString()}`);
  console.log(`📋 Liste Mailjet cible: ${MAILJET_LIST_ID}`);
  console.log('');

  try {
    // Vérifier les credentials
    if (!process.env.MJ_APIKEY_PUBLIC || !process.env.MJ_APIKEY_PRIVATE) {
      throw new Error('❌ Variables MJ_APIKEY_PUBLIC et MJ_APIKEY_PRIVATE manquantes');
    }
    console.log('✅ Credentials Mailjet OK');

    // Vérifier la connexion BDD
    if (!process.env.REMOTE_DB_HOST) {
      throw new Error('❌ Variables de connexion BDD manquantes');
    }
    console.log('✅ Configuration BDD OK');
    console.log('');

    // Récupérer les dons d'hier
    const dons = await getDonsHier();

    // Dédupliquer par email (garder le dernier don par donateur)
    const donateurs = deduplicateDonateurs(dons);

    console.log('');
    console.log(`📊 Résumé:`);
    console.log(`   - Total dons: ${dons.length}`);
    console.log(`   - Donateurs uniques: ${donateurs.length}`);
    console.log('');

    if (donateurs.length === 0) {
      console.log('ℹ️  Aucun donateur à synchroniser aujourd\'hui.');
      console.log('='.repeat(60));
      console.log('');
      process.exit(0);
    }

    // Synchroniser vers Mailjet
    console.log('📤 Synchronisation vers Mailjet...');
    console.log('');
    
    const results = await syncDonateurs(donateurs);

    // Afficher les résultats
    console.log('');
    console.log('📈 Résultats de la synchronisation:');
    console.log(`   ✅ Créés: ${results.created}`);
    console.log(`   🔄 Mis à jour: ${results.updated}`);
    console.log(`   ❌ Erreurs: ${results.errors}`);
    console.log('');

    // Afficher les détails si erreurs
    if (results.errors > 0) {
      console.log('⚠️  Détails des erreurs:');
      results.details
        .filter(d => !d.success)
        .forEach(d => console.log(`   - ${d.email}: ${d.error}`));
      console.log('');
    }

    console.log('='.repeat(60));
    console.log('✨ Synchronisation terminée avec succès!');
    console.log('='.repeat(60));
    console.log('');

    process.exit(results.errors > 0 ? 1 : 0);

  } catch (error) {
    console.error('');
    console.error('❌ ERREUR FATALE:', error.message);
    console.error('');
    console.error('Stack trace:', error.stack);
    console.error('');
    process.exit(1);
  }
};

// Lancer le script
main();

