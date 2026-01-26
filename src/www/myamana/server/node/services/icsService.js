/**
 * Service de génération de fichiers ICS (iCalendar)
 * Format conforme à la RFC 5545
 */

/**
 * Formatte une date en format iCalendar UTC (YYYYMMDDTHHMMSSZ)
 * @param {Date} date - Date à formater
 * @returns {string} Date formatée au format iCalendar UTC
 */
const formatICSDate = (date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
};

/**
 * Formatte une date en format iCalendar local (YYYYMMDDTHHMMSS) sans conversion UTC
 * @param {Date} date - Date à formater
 * @returns {string} Date formatée au format iCalendar local
 */
const formatICSDateLocal = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
};

/**
 * Génère le bloc VTIMEZONE pour Europe/Paris
 * Conforme à la RFC 5545 avec gestion de l'heure d'été (DST)
 * @returns {string} Bloc VTIMEZONE formaté
 */
const getVTimezone = () => {
  return [
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Paris',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'TZNAME:CEST',
    'DTSTART:19700329T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'TZNAME:CET',
    'DTSTART:19701025T030000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'END:STANDARD',
    'END:VTIMEZONE'
  ].join('\r\n');
};

/**
 * Retire les balises HTML d'un texte
 * @param {string} html - Texte HTML
 * @returns {string} Texte sans HTML
 */
const stripHtml = (html) => {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '') // Retirer les balises HTML
    .replace(/&nbsp;/g, ' ') // Remplacer les espaces insécables
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ') // Normaliser les espaces multiples
    .trim();
};

/**
 * Échappe les caractères spéciaux pour le format ICS (hors LOCATION)
 * @param {string} text - Texte à échapper
 * @returns {string} Texte échappé
 */
const escapeICSText = (text) => {
  if (!text) return '';
  // D'abord nettoyer le HTML si présent
  const cleanText = stripHtml(text);
  // Puis échapper les caractères spéciaux ICS
  return cleanText
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n');
};

/**
 * Échappe les caractères spéciaux pour LOCATION (sans échapper les virgules)
 * @param {string} text - Texte à échapper
 * @returns {string} Texte échappé
 */
const escapeICSLocation = (text) => {
  if (!text) return '';
  // Nettoyer le HTML si présent
  const cleanText = stripHtml(text);
  // Échapper uniquement certains caractères (PAS les virgules pour Google)
  return cleanText
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/\n/g, ' ');
};

/**
 * Génère un fichier ICS pour un événement
 * @param {Object} eventData - Données de l'événement
 * @param {string} eventData.associationNom - Nom de l'association (préfixé au SUMMARY)
 * @param {string} eventData.actionNom - Nom de l'action
 * @param {string} eventData.dateAction - Date de l'action (YYYY-MM-DD)
 * @param {string} eventData.heureDebut - Heure de début (HH:MM:SS)
 * @param {string} eventData.heureFin - Heure de fin (HH:MM:SS)
 * @param {string} eventData.lieu - Adresse complète du lieu
 * @param {string} eventData.description - Description de l'action (optionnel)
 * @param {string} eventData.responsableEmail - Email du responsable
 * @param {string} eventData.responsableNom - Nom complet du responsable (optionnel)
 * @param {number} eventData.inscriptionId - ID de l'inscription (pour l'UID)
 * @returns {string} Contenu du fichier ICS
 */
const generateICS = (eventData) => {
  const {
    associationNom,
    actionNom,
    dateAction,
    heureDebut,
    heureFin,
    lieu,
    description,
    responsableEmail,
    responsableNom,
    inscriptionId
  } = eventData;

  // Construire les dates de début et fin
  const dateStr = dateAction.split('T')[0]; // Au cas où la date contient un timestamp
  const [year, month, day] = dateStr.split('-');
  
  const [startHour, startMinute] = heureDebut.split(':');
  const [endHour, endMinute] = heureFin.split(':');
  
  // Créer les dates en heure locale (pas de conversion UTC)
  const startDate = new Date(year, month - 1, day, startHour, startMinute, 0);
  const endDate = new Date(year, month - 1, day, endHour, endMinute, 0);
  
  // Date de création du fichier (UTC)
  const now = new Date();
  const dtstamp = formatICSDate(now);
  
  // Dates de l'événement (en heure locale avec TZID)
  const dtstart = formatICSDateLocal(startDate);
  const dtend = formatICSDateLocal(endDate);
  
  // Construire le SUMMARY avec le nom de l'association en préfixe
  const summary = `${associationNom} - ${actionNom}`;
  
  // UID unique basé sur l'ID de l'inscription et le domaine
  const uid = `inscription-${inscriptionId}@myamana.fr`;
  
  // Construire le fichier ICS avec fuseau horaire Europe/Paris
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//My Amana//Benevolat//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    getVTimezone(),
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=Europe/Paris:${dtstart}`,
    `DTEND;TZID=Europe/Paris:${dtend}`,
    `SUMMARY:${escapeICSText(summary)}`,
    `LOCATION:${escapeICSLocation(lieu)}`,
    description ? `DESCRIPTION:${escapeICSText(description)}` : '',
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(line => line !== '').join('\r\n');
  
  return icsContent;
};

/**
 * Génère un fichier ICS et le retourne encodé en Base64
 * @param {Object} eventData - Données de l'événement
 * @returns {string} Contenu du fichier ICS encodé en Base64
 */
const generateICSBase64 = (eventData) => {
  const icsContent = generateICS(eventData);
  return Buffer.from(icsContent, 'utf-8').toString('base64');
};

module.exports = {
  generateICS,
  generateICSBase64
};
