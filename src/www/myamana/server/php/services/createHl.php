<?php

use Slim\Http\Request;
use Slim\Http\Response;

require_once './services/utils.php';

$app->post('/createHl', function (Request $request, Response $response, array $args) {

  try {
    $fpHorsLigne = fopen('log/createHl.log', 'a');
    fwrite($fpHorsLigne, "\n ############### INITIALISATION DES VARIABLES ######################");
    $body = json_decode($request->getBody());
    $asso = $body->asso;
    $code = $body->code;
    $moyen = $body->moyen;
    $dateDon = $body->dateDon;
    $prenom = $body->prenom;
    $nom = $body->nom;
    $email = $body->email;
    $campagne = $body->campagne;
    $adress = $body->address;
    $raison = $body->raison;
    $siren = $body->siren;
    $montant = $body->amount;
    $address_street = $body->line1;
    $address_zip = $body->postal_code;
    $address_city = $body->city;
    $address_country = $body->country;
    $adhesionYear = "2024";
    fwrite($fpHorsLigne, "\n ############### DEBUT DE L'EXECUTION DE LA REQUETE " . strftime('%d/%m/%y %H:%M') . "######################");
    $sql = "SELECT * FROM Assos where uri='$asso' and codeHl='$code'";
    fwrite($fpHorsLigne, "\n ###################### Requête à éxécuter :  " . $sql . " #####################");
    $assoBdd = selectdb($sql, "createHl.php-createHl");
    if ($assoBdd) {
      fwrite($fpHorsLigne, "\n ###################### FIN DE LA SELECTION DE L'ASSO #####################");
      $uriAsso = $assoBdd[0]["uri"];
      $signatairePrenomAsso = $assoBdd[0]["signataire_prenom"];
      $signataireNomAsso = $assoBdd[0]["signataire_nom"];
      $signataireSignAsso = $assoBdd[0]["signataire_signature"];
      $signataireRoleAsso = $assoBdd[0]["signataire_role"];
      $nomAsso = $assoBdd[0]["nom"];
      $adresseAsso = $assoBdd[0]["adresse"];
      $cpAsso = $assoBdd[0]["code_postal"];
      $villeAsso = $assoBdd[0]["ville"];
      $typeAsso = $assoBdd[0]["type"];
      $qualiteAsso = "";
      $objetAsso = $assoBdd[0]["objet"];
      $logoAsso = $assoBdd[0]["logoUrl"];
      $emailAsso = $assoBdd[0]["email"];
      fwrite($fpHorsLigne, "\n ############### FIN D'INITIALISATION DES VARIABLES ######################");

      //   $variables = [];
      $recu = "true";
      fwrite($fpHorsLigne, "\n ############### Voila les infos du donateur hors ligne " . strftime('%d/%m/%y %H:%M') . " ######################");
      fwrite($fpHorsLigne, "Asso: $asso\n");
      fwrite($fpHorsLigne, "Moyen: $moyen\n");
      fwrite($fpHorsLigne, "Date de Don: $dateDon\n");
      fwrite($fpHorsLigne, "Prénom: $prenom\n");
      fwrite($fpHorsLigne, "Nom: $nom\n");
      fwrite($fpHorsLigne, "Email: $email\n");
      fwrite($fpHorsLigne, "Campagne: $campagne\n");
      fwrite($fpHorsLigne, "Adresse: $adress\n");
      fwrite($fpHorsLigne, "Raison: $raison\n");
      fwrite($fpHorsLigne, "SIREN: $siren\n");
      fwrite($fpHorsLigne, "Montant: $montant\n");
      fwrite($fpHorsLigne, "Street: $address_street\n");
      fwrite($fpHorsLigne, "Postal Code: $address_zip\n");
      fwrite($fpHorsLigne, "City: $address_city\n");
      fwrite($fpHorsLigne, "Country: $address_country\n");
      fwrite($fpHorsLigne, "URI: $uriAsso\n");
      fwrite($fpHorsLigne, "Signataire Prénom: $signatairePrenomAsso\n");
      fwrite($fpHorsLigne, "Signataire Nom: $signataireNomAsso\n");
      fwrite($fpHorsLigne, "Signataire Signature: $signataireSignAsso\n");
      fwrite($fpHorsLigne, "Signataire Role: $signataireRoleAsso\n");
      fwrite($fpHorsLigne, "Nom: $nomAsso\n");
      fwrite($fpHorsLigne, "Adresse: $adresseAsso\n");
      fwrite($fpHorsLigne, "Code Postal: $cpAsso\n");
      fwrite($fpHorsLigne, "Ville: $villeAsso\n");
      fwrite($fpHorsLigne, "Type: $typeAsso\n");
      fwrite($fpHorsLigne, "Qualité: $qualiteAsso\n");
      fwrite($fpHorsLigne, "Objet: $objetAsso\n");
      fwrite($fpHorsLigne, "Logo URL: $logoAsso\n");

      fwrite($fpHorsLigne, "\n ############### DEBUT DE L'INSERTION EN BDD " . strftime('%d/%m/%y %H:%M') . " ######################");
      $sql3 = "insert into Dons_Ponctuels(asso,tracking,nom,prenom,montant,adresse,code_postal,ville,pays,email,source,amana,demande_recu,moyen,siren,raison,tel,lien_recu,stripe_cus_id) values(\"$asso\",\"$origin\",\"$nom\",\"$prenom\",\"$montant\",\"$address_street\",\"$address_zip\",\"$address_city\",\"$address_country\",\"$email\",\"Hors Ligne\",\"$campagne\",\"true\",\"$moyen\",\"$siren\",\"$raison\",\"$tel\",\"$filename\",\"$customerId\")";
      upsert($sql3, "createHl.php-createHl");
      fwrite($fpHorsLigne, "\n ###################### Requête à éxécuter :  " . $sql . " #####################");
      fwrite($fpHorsLigne, "\n ############### FIN DE L'EXECUTION DE LA REQUETE ######################");
      fwrite($fpHorsLigne, "\n ###################### Début de l'envoie du mail #####################");
      fwrite($fpHorsLigne, "Campagne: $campagne\n");
      if ($campagne === "Adhésion") {

        $filename = adhesionPdf($nom, $prenom, $address_street, $address_zip, $address_city, $nomAsso, $logoAsso, $adresseAsso, $villeAsso, $cpAsso, $emailAsso);
        $template = "adhesion";
        $subject = "Confirmation de votre adhésion";
        $variables["adhesionYear"] = $adhesionYear;
        $variables["prenom"] = $prenom;
        $variables["lienCarte"] = "Vous trouverez votre carte d'adhérent en cliquant <a href=$filename><b>Ici</b></a>";
        $variables["monAsso"] = $uriAsso;
        $variables["logoUrl"] = "https://www.myamana.fr/assets/images/acmp.png";
      } else {

        $filename = recuFiscal($nom, $prenom, $email, $address_street, $raison, $siren, $address_city, $address_zip, $montant, "Hl", $dateDon, $moyen, "ponctuel", $uriAsso, $signatairePrenomAsso, $signataireNomAsso, $signataireSignAsso, $signataireRoleAsso, $nomAsso, $adresseAsso, $cpAsso, $villeAsso, $typeAsso, $qualiteAsso, $objetAsso, $logoAsso);
        $template = "ponctuel";
        $subject = "Confirmation de votre don ponctuel";
        $variables["prenom"] = $prenom;
        $variables["montant"] = $montant;
        $variables["campagne"] = $campagne;
        $variables["lienRecu"] = "Vous trouverez votre recu fiscal en cliquant <a href=$filename>ici</a>";
      }

      fwrite($fpHorsLigne, "\n ###################### Fin de l'envoie du mail #####################");
      sendEmailDonator($asso, $email, $template, $subject, $variables, null);
      $erreurCode = "false";

      return $response->withJson(['resultat' => $filename, 'emailAsso' => $emailAsso, 'emailDonateur' => $email, 'erreurCode' => $erreurCode]);
    } else {
      $erreurCode = "true";
      return $response->withJson(['erreurCode' => $erreurCode]);
    }
  } catch (Throwable $ex) {

    fwrite($fpHorsLigne, "Erreur dans l'update des quantitees");
    fwrite($fpHorsLigne, $ex->getMessage());
    $fperror = fopen('log/error.log', 'a');
    $message = $ex->getMessage();
    $sql = "INSERT into Erreurs (asso,message,fonction) values ('formMaraude','$message','formMaraude.php/updateQuantite')";
    upsert($sql, "formMaraude.php/updateQuantite");
    fwrite($fperror, "\n************ Erreur dans la méthode : " . $method . strftime('%d/%m/%y %H:%M') . "************\n");
    fwrite($fperror, "\n Message : " . $message . "\n");
    fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
    fclose($fperror);
  } finally {
    fclose($fpHorsLigne);
  }
});
