const db = require('./bdd'); // Service de connexion MySQL
const Stripe = require('stripe'); // SDK Stripe
const logger = require('../config/logger');

/**
 * Récupère la clé Stripe à partir de la base de données et retourne une instance Stripe
 * @param {string} identifier - Identifiant ou paramètre utilisé pour récupérer la clé.
 * @returns {Promise<Stripe>} - Instance Stripe initialisée avec la clé appropriée.
 */
async function getStripeInstance(identifier) {
  try {
    const query = 'SELECT stripe_secret_key FROM Assos WHERE uri = ?'; // Adaptez la table et colonne
    const results = await db.select(query, [identifier], 'remote');
    if (results.length === 0) {
      throw new Error(`Aucune clé Stripe trouvée pour l'identifiant : ${identifier}`);
    }
    const stripeKey = results[0].stripe_secret_key; // Assurez-vous que le champ correspond
    if (!stripeKey || typeof stripeKey !== 'string') {
      throw new Error("Clé Stripe invalide ou manquante.");
    }
    return Stripe(stripeKey); // Retourne une instance Stripe
  } catch (error) {
    console.error('[Erreur lors de la récupération de la clé Stripe]:', error);
    throw error;
  }
}

/**
 * Crée un Product Stripe + 1000 Prices mensuels (1€ à 1000€)
 * et les insère dans la table Prices en BDD.
 * 
 * @param {string} asso - URI de l'association
 * @param {string} stripeSecretKey - Clé secrète Stripe
 * @returns {Promise<{success: boolean, productId?: string, pricesCreated?: number, error?: string}>}
 */
async function seedPricesForAsso(asso, stripeSecretKey) {
  const stripe = new Stripe(stripeSecretKey);
  
  try {
    logger.info(`[StripeService] Début du seeding des prices pour l'asso: ${asso}`);
    
    // 1. Vérifier combien de products existent déjà pour cette asso (pour auto-incrémenter le nom)
    const existingProducts = await db.select(
      'SELECT DISTINCT product_id FROM Prices WHERE asso = ? AND nickname = ?',
      [asso, 'mensuel'],
      'remote'
    );
    
    const productCount = existingProducts.length;
    const productName = productCount === 0 
      ? 'Mensualisation' 
      : `Mensualisation ${productCount + 1}`;
    
    logger.info(`[StripeService] Création du product "${productName}" (${productCount} products existants)`);
    
    // 2. Créer le Product Stripe
    const product = await stripe.products.create({
      name: productName,
      metadata: {
        asso: asso,
        myamana_autocreated: 'true',
        created_at: new Date().toISOString()
      }
    });
    
    logger.info(`[StripeService] Product créé: ${product.id}`);
    
    // 3. Créer 1000 Prices (1€ à 1000€) et les insérer en BDD
    let pricesCreated = 0;
    
    for (let i = 1; i <= 1000; i++) {
      try {
        const price = await stripe.prices.create({
          unit_amount: i * 100, // Montant en centimes
          currency: 'eur',
          recurring: { interval: 'month' },
          product: product.id,
          nickname: 'mensuel',
          metadata: {
            asso: asso,
            myamana_autocreated: 'true'
          }
        });
        
        // Insérer dans la table Prices
        await db.insert('Prices', {
          montant: i,
          price_id: price.id,
          product_id: product.id,
          nickname: 'mensuel',
          asso: asso
        }, 'remote');
        
        pricesCreated++;
        
        // Log tous les 100 prices pour suivre la progression
        if (i % 100 === 0) {
          logger.info(`[StripeService] Progression: ${i}/1000 prices créés pour ${asso}`);
        }
      } catch (priceError) {
        logger.error(`[StripeService] Erreur création price ${i}€ pour ${asso}:`, priceError.message);
        // On continue même si un price échoue
      }
    }
    
    logger.info(`[StripeService] Seeding terminé pour ${asso}: ${pricesCreated} prices créés`);
    
    return {
      success: true,
      productId: product.id,
      productName: productName,
      pricesCreated: pricesCreated
    };
    
  } catch (error) {
    logger.error(`[StripeService] Erreur seeding pour ${asso}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Récupère les anciennes clés Stripe d'une asso
 * 
 * @param {string} siren - SIREN de l'association
 * @returns {Promise<{publicKey: string|null, secretKey: string|null}>}
 */
async function getExistingStripeKeys(siren) {
  try {
    const result = await db.select(
      'SELECT stripe_publishable_key, stripe_secret_key FROM Assos WHERE siren = ? LIMIT 1',
      [siren],
      'remote'
    );
    
    if (result.length === 0) {
      return { publicKey: null, secretKey: null };
    }
    
    return {
      publicKey: result[0].stripe_publishable_key || null,
      secretKey: result[0].stripe_secret_key || null
    };
  } catch (error) {
    logger.error(`[StripeService] Erreur récupération clés Stripe pour ${siren}:`, error.message);
    return { publicKey: null, secretKey: null };
  }
}

/**
 * Récupère l'URI de l'asso à partir du SIREN
 * 
 * @param {string} siren - SIREN de l'association
 * @returns {Promise<string|null>}
 */
async function getAssoUri(siren) {
  try {
    const result = await db.select(
      'SELECT uri FROM Assos WHERE siren = ? LIMIT 1',
      [siren],
      'remote'
    );
    
    return result[0]?.uri || null;
  } catch (error) {
    logger.error(`[StripeService] Erreur récupération URI pour ${siren}:`, error.message);
    return null;
  }
}

module.exports = {
  getStripeInstance,
  seedPricesForAsso,
  getExistingStripeKeys,
  getAssoUri
};
