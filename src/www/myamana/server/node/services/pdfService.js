const PDFDocument = require('pdfkit');
const fs = require('fs-extra');
const path = require('path');
const db = require('./bdd');

// Fonction pour convertir un nombre en lettres (similaire à la fonction PHP)
function numberToLetter(nombre) {
  // Fonction simplifiée pour convertir un nombre en lettres
  // Cette fonction pourrait être améliorée pour gérer tous les cas
  const units = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
  
  if (nombre < 10) return units[nombre];
  if (nombre < 20) return teens[nombre - 10];
  
  const unit = nombre % 10;
  const ten = Math.floor(nombre / 10) % 10;
  const hundred = Math.floor(nombre / 100) % 10;
  const thousand = Math.floor(nombre / 1000);
  
  let result = '';
  
  if (thousand > 0) {
    if (thousand === 1) result += 'mille ';
    else result += `${numberToLetter(thousand)} mille `;
  }
  
  if (hundred > 0) {
    if (hundred === 1) result += 'cent ';
    else result += `${units[hundred]} cent `;
  }
  
  if (ten > 0) {
    if (ten === 1) {
      result += teens[unit];
      return result;
    } else if (ten === 7 || ten === 9) {
      result += `${tens[ten-1]}-${teens[unit]}`;
      return result;
    } else {
      result += tens[ten];
      if (unit > 0) {
        if (unit === 1 && ten !== 8) result += '-et-un';
        else result += `-${units[unit]}`;
      } else if (ten === 8) {
        result += 's';
      }
    }
  } else if (unit > 0) {
    result += units[unit];
  }
  
  return result;
}

// Fonction pour générer un reçu fiscal en PDF
async function generateRecuFiscal(data) {
  try {
    // Afficher tous les attributs de data pour le débogage
    console.log('Données reçues pour la génération du reçu fiscal:', JSON.stringify(data, null, 2));

    // Créer le répertoire de sortie s'il n'existe pas
    const outputDir = path.join(__dirname, '../pdf/recuFiscal/',data.asso,'/',data.type);
    await fs.ensureDir(outputDir);

    
    // Générer un numéro d'ordre unique
    const date = new Date(data.dateT); // convertir en objet Date

    const pad = (n) => n.toString().padStart(2, '0');
    
    const formattedTimestamp =
      date.getFullYear().toString() +
      pad(date.getMonth() + 1) +
      pad(date.getDate()) +
      pad(date.getHours()) +
      pad(date.getMinutes()) +
      pad(date.getSeconds());    
    const initiales = `${data.prenom.charAt(0)}-${data.prenom.charAt(data.prenom.length-1)}-${data.nom.charAt(0)}-${data.nom.charAt(data.nom.length-1)}`;
    const numOrdre = `${formattedTimestamp}-${initiales}`;
    
    // Créer un nouveau document PDF
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50
    });
    
    // Définir le nom du fichier de sortie
    const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    const filename = `${capitalize(data.prenom).replace(/ /g, "-")}_${data.nom.toUpperCase().replace(/ /g, "-")}_${numOrdre}.pdf`;

    const outputPath = path.join(outputDir, filename);

    // Pipe le PDF vers un fichier
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);
    
    // Ajouter le logo de l'association
    // Charger le logo à partir du répertoire assets/images/asso/ en utilisant data.asso comme nom de fichier
    const logoPath = path.join('/usr/src/app/assets/images/asso', `${data.asso}.png`);
    console.log('Chemin du logo:', logoPath);
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 50, { width: 100 });
    } else {
      console.log(`Logo non trouvé pour l'association ${data.asso} au chemin ${logoPath}`);
    }
    
    // Titre
    doc.fontSize(16).font('Helvetica-Bold').text('RECU FISCAL', 250, 50);
    doc.fontSize(12).font('Helvetica').text('Articles 200, 238 bis et 978 du code général des impôts', 250, 70);
    doc.text(`Numéro d'ordre : ${numOrdre}`, 250, 100);
    
    // Informations du donateur
    doc.moveDown(2);
    doc.fontSize(12).font('Helvetica-Bold');
    
    if (data.siren) {
      doc.text('DONATEUR ENTREPRISE', 50, 150);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Raison sociale : ${data.raisonSociale}`, 50, 170);
      doc.text(`Siren : ${data.siren}`, 50, 190);
    } else {
      doc.text('DONATEUR PARTICULIER', 50, 150);
      doc.fontSize(10).font('Helvetica');
    }
    
    doc.text(`${capitalize(data.prenom)} ${data.nom.toUpperCase()}`, 50, 210);
    doc.text(`${data.adresse}`, 50, 230);
    doc.text(`${data.codePostal} ${data.ville}`, 50, 250);
    
    // Informations du bénéficiaire
    doc.moveDown(2);
    doc.fontSize(12).font('Helvetica-Bold').text('BÉNÉFICIAIRE', 50, 280);
    doc.fontSize(10).font('Helvetica');
    doc.text(`${data.nomAsso}`, 50, 300);
    doc.text(`${data.adresseAsso}`, 50, 320);
    doc.text(`${data.cpAsso} ${data.villeAsso}`, 50, 340);
    
    // Type d'organisme
    doc.fontSize(10).font('Helvetica-Bold').text("Type d'organisme : ", 50, 370);
    doc.fontSize(10).font('Helvetica').text(`${data.typeAsso}` || "Association", 150, 370);
    
    doc.fontSize(10).font('Helvetica-Bold').text("Qualité de l'organisme : ", 50, 390);
    doc.fontSize(10).font('Helvetica').text("Organisme d'intérêt général", 170, 390);
    
    // Montant du don
    doc.moveDown(2);
    doc.fontSize(10).font('Helvetica').text("Le bénéficiaire reconnaît avoir reçu au titre des dons et versements, ouvrant droit à la réduction d'impôts, la somme de ", 50, 420);
    doc.fontSize(10).font('Helvetica-Bold').text(`${numberToLetter(parseInt(data.montant))} euros (***${data.montant}***EUR.)`, 50, 440);
    
    // Date et mode de versement
    doc.fontSize(10).font('Helvetica-Bold').text("Date du versement : ", 50, 470);
    doc.fontSize(10).font('Helvetica').text(data.date, 170, 470);
    
    doc.fontSize(10).font('Helvetica-Bold').text("Mode de versement : ", 50, 490);
    doc.fontSize(10).font('Helvetica').text(data.moyen, 170, 490);
    
    doc.fontSize(10).font('Helvetica-Bold').text("Forme du don : ", 50, 510);
    doc.fontSize(10).font('Helvetica').text("DON MANUEL", 170, 510);
    
    doc.fontSize(10).font('Helvetica-Bold').text("Nature du don : ", 50, 530);
    doc.fontSize(10).font('Helvetica').text("Numéraire", 170, 530);
    
    // Certification
    doc.fontSize(8).font('Helvetica').text("Le bénéficiaire certifie sur l'honneur que les dons et versements qu'il reçoit ouvrent droit à la réduction d'impôt prévue aux articles 200, 238 bis et 978 du code général des impôts.", 50, 560);
    
    // Date et signature
    const currentDate = new Date().toLocaleDateString('fr-FR');
    doc.moveDown(4);
    doc.fontSize(10).font('Helvetica').text(`Le ${currentDate},`, 50, 620);
    doc.text(`${data.signataire_prenom} ${data.signataire_nom}, ${data.signataire_role}`, 50, 640);
    
    // Ajouter la signature si disponible
    if (data.signataire_signature) {
      const signatureFileName = path.basename(data.signataire_signature);
      const signaturePath = path.join('/usr/src/app/assets/images/signatures/', signatureFileName);
      console.log('Lien de la signature', signaturePath);

      if (fs.existsSync(signaturePath)) {
        doc.image(signaturePath, 50, 660, { width: 100 });
      }
    }    
    // Finaliser le PDF
    doc.end();

    console.log('Génération du recu fiscal', outputPath);
    
    // Retourner le chemin du fichier généré
    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        resolve({
          filename,
          path: outputPath
        });
      });
      stream.on('error', reject);
    });
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    throw error;
  }
}

// Fonction pour récupérer les informations de l'association
async function getAssoInfo(asso) {
  try {
    const results = await db.select(
      'SELECT nom, adresse, code_postal, ville, type, signataire_prenom, signataire_nom, signataire_role, signataire_signature, logoUrl FROM Assos WHERE uri = ?',
      [asso],
      'remote'
    );
    
    if (results.length === 0) {
      throw new Error('Association non trouvée');
    }
    
    return results[0];
  } catch (error) {
    console.error('Erreur lors de la récupération des informations de l\'association:', error);
    throw error;
  }
}

module.exports = {
  generateRecuFiscal,
  getAssoInfo
};
