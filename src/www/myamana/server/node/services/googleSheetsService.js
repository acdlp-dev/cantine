const { google } = require('googleapis');
const path = require('path');

/**
 * Service pour gérer les interactions avec Google Sheets
 */
class GoogleSheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
  }

  /**
   * Authentification avec le Service Account
   */
  async authenticate() {
    try {
      if (this.auth) {
        return this.auth;
      }

      const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || 
                              path.join(__dirname, '../credentials/google-credentials.json');
      
      this.auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      console.log('[Google Sheets] Authentification réussie');
      
      return this.auth;
    } catch (error) {
      console.error('[Google Sheets] Erreur d\'authentification:', error);
      throw new Error(`Erreur d'authentification Google Sheets: ${error.message}`);
    }
  }

  /**
   * Efface le contenu du sheet (en gardant l'en-tête)
   * @param {string} sheetName - Nom de la feuille (par défaut: premier onglet)
   */
  async clearSheet(sheetName = 'Sheet1') {
    try {
      await this.authenticate();

      // Effacer toutes les données sauf la première ligne (en-tête)
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A2:Z`,
      });

      console.log(`[Google Sheets] Contenu de ${sheetName} effacé (en-tête préservé)`);
      return true;
    } catch (error) {
      console.error('[Google Sheets] Erreur lors de l\'effacement:', error);
      throw new Error(`Erreur lors de l'effacement du sheet: ${error.message}`);
    }
  }

  /**
   * Écrit les données des bénévoles dans le Google Sheet
   * @param {Array} benevoles - Tableau d'objets bénévoles
   * @param {string} sheetName - Nom de la feuille (par défaut: premier onglet)
   */
  async writeVolunteers(benevoles, sheetName = 'Sheet1') {
    try {
      await this.authenticate();

      if (!benevoles || benevoles.length === 0) {
        console.log('[Google Sheets] Aucun bénévole à écrire');
        return { count: 0 };
      }

      // Préparer les données au format tableau
      const rows = benevoles.map(b => [
        b.nom || '',
        b.prenom || '',
        b.genre || '',
        b.telephone || '',
        b.statut || ''
      ]);

      // Écrire les données dans le sheet (à partir de la ligne 2, après l'en-tête)
      const result = await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A2:E${rows.length + 1}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: rows,
        },
      });

      console.log(`[Google Sheets] ${rows.length} bénévole(s) écrit(s) dans ${sheetName}`);
      
      return {
        count: rows.length,
        updatedCells: result.data.updatedCells,
        updatedRows: result.data.updatedRows
      };
    } catch (error) {
      console.error('[Google Sheets] Erreur lors de l\'écriture:', error);
      throw new Error(`Erreur lors de l'écriture des bénévoles: ${error.message}`);
    }
  }

  /**
   * Vérifie ou crée l'en-tête du sheet
   * @param {string} sheetName - Nom de la feuille (par défaut: premier onglet)
   */
  async ensureHeader(sheetName = 'Sheet1') {
    try {
      await this.authenticate();

      // Lire la première ligne
      const result = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A1:E1`,
      });

      const firstRow = result.data.values ? result.data.values[0] : null;

      // Si pas d'en-tête ou en-tête incomplet, créer/mettre à jour
      if (!firstRow || firstRow.length < 5) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A1:E1`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [['Nom', 'Prénom', 'Genre', 'Téléphone', 'Statut']],
          },
        });
        console.log(`[Google Sheets] En-tête créé/mis à jour dans ${sheetName}`);
      }

      return true;
    } catch (error) {
      console.error('[Google Sheets] Erreur lors de la vérification de l\'en-tête:', error);
      throw new Error(`Erreur lors de la vérification de l'en-tête: ${error.message}`);
    }
  }

  /**
   * Synchronise tous les bénévoles dans le Google Sheet
   * @param {Array} benevoles - Tableau d'objets bénévoles
   * @param {string} sheetName - Nom de la feuille (par défaut: premier onglet)
   */
  async syncVolunteers(benevoles, sheetName = 'Sheet1') {
    try {
      console.log(`[Google Sheets] Début de la synchronisation de ${benevoles.length} bénévole(s)`);

      // 1. S'assurer que l'en-tête existe
      await this.ensureHeader(sheetName);

      // 2. Effacer les anciennes données
      await this.clearSheet(sheetName);

      // 3. Écrire les nouvelles données
      const result = await this.writeVolunteers(benevoles, sheetName);

      console.log('[Google Sheets] Synchronisation terminée avec succès');
      
      return {
        success: true,
        count: result.count,
        updatedCells: result.updatedCells,
        updatedRows: result.updatedRows
      };
    } catch (error) {
      console.error('[Google Sheets] Erreur lors de la synchronisation:', error);
      throw error;
    }
  }
}

module.exports = new GoogleSheetsService();
