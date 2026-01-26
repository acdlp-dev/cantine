<?php
session_start();

use Slim\Http\Request;
use Slim\Http\Response;
use Stripe\Stripe;

require_once './services/utils.php';

$app->post('/sessionEditMensuel', function (Request $request, Response $response, array $args) {
  $fpgetDataAsso = fopen('log/getDataAsso.log', 'a');
  fwrite($fpgetDataAsso, "\n************  Connexion à Edit Mensuel ************");
  fwrite($fpgetDataAsso, "\n************" . strftime('%d/%m/%y %H:%M') . "************");

  try {
    $body = json_decode($request->getBody());
    $oldSubId = $body->oldSubId;
    fwrite($fpgetDataAsso, "OldSubID= " . $oldSubId);

    $schedule = "non";


    if (strpos($oldSubId, "sched") !== false) {
      fwrite($fpgetDataAsso, "\n L'abonnement est de type schedule \n");
      $schedule = "oui";
    } else {
      fwrite($fpgetDataAsso, "\n L'abonnement est de type souscription \n");
    }
    if ($schedule === "oui") {
      $sql = "SELECT * FROM Personnes where stripe_sched_sub_id='$oldSubId'";
    } else {
      $sql = "SELECT * FROM Personnes where stripe_sub_id='$oldSubId'";
    }
    $personnes = selectDB($sql, "/sessionEditMensuel");
    $isSubscription = false;

    if (empty($personnes)) {
      fwrite($fpgetDataAsso, "\n Erreur sur la souscription");
    } else {
      fwrite($fpgetDataAsso, "Ancienne valeur de session= " . $_SESSION['stripe_sub_id']);
      $isSubscription = true;
      $_SESSION['stripe_sched_sub_id'] = $personnes[0]['stripe_sched_sub_id'];
      fwrite($fpgetDataAsso, "Nouvelle valeur de session pour schedule= " . $_SESSION['stripe_sched_sub_id']);
      $_SESSION['stripe_sub_id'] = $personnes[0]['stripe_sub_id'];
      $_SESSION['isSubscription'] = $isSubscription;
      fwrite($fpgetDataAsso, "Nouvelle valeur de session= " . $_SESSION['stripe_sub_id']);
    }
    return $response->withJson(['isSubscription' => $isSubscription, 'oldSubId' => $oldSubId, 'asso' => $personnes[0]['asso']]);
  } catch (Exception $ex) {
    fwrite($fpgetDataAsso, "Erreur dans sessionEditMensuel");
    fwrite($fpgetDataAsso, $ex->getMessage());
    $fperror = fopen('log/error.log', 'a');
    $message = $ex->getMessage();
    $sql = "INSERT into Erreurs (asso,message,fonction) values ('sessionEditMensuel','$message','espaceDonateur.php/sessionEditMensuel')";
    upsert($sql, "espaceDonateur.php/sessionEditMensuel");
    fwrite($fperror, "\n************ Erreur dans la méthode : " . $method . strftime('%d/%m/%y %H:%M') . "************\n");
    fwrite($fperror, "\n Message : " . $message . "\n");
    fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
    fclose($fperror);
  } finally {
    fwrite($fpgetDataAsso, "\n \n ############################ FIN TRANSACTION " . $oldSubId . " ###############################");
    fclose($fpgetDataAsso);
  }
});



$app->post('/getDataBackoffice', function (Request $request, Response $response, array $args) {

  try {
    $fpgetDataAsso = fopen('log/getDataAsso.log', 'a');
    fwrite($fpgetDataAsso, "\n************" . strftime('%d/%m/%y %H:%M') . "************");
    $body = json_decode($request->getBody());
    $campagnePaiement = $body->campagnePaiement;
    $startDatePaiement = $body->startDatePaiement;
    $endDatePaiement = $body->endDatePaiement;
    $siren = $_SESSION['siren'];
    $uri = $_SESSION['uri'];
    $today = date("Y-m-d");
    $month = date("m", strtotime($today));
    $mois = getMonthName($month);


    $sql2 = "Select nom, uri from Assos where siren = '" . $_SESSION['siren'] . "'";
    $asso = selectDB($sql2, "backoffice.php/getDataBackoffice");
    $label = $asso[0]["nom"];
    $uri = $asso[0]["uri"];

    $sql = "SELECT ajout, email,nom, nom, prenom, amana, montant, type, moyen, statut, lien_recu 
    FROM Dons_Ponctuels
    where asso='$uri' ";


    if ($campagnePaiement === "allCampagne" || $campagnePaiement === "") {
    } else {
      $sql .= " and amana ='$campagnePaiement'";
    }
    if ($startDatePaiement !== "" && $endDatePaiement !== "") {
      $sql .= " and ajout BETWEEN '$startDatePaiement 00:00:00 23:59:59' AND '$endDatePaiement'";
    }
    $sql .= " order by ajout desc limit 10000";

    $dataClient = selectDB($sql, "backoffice.php/getDataBackoffice");
    fwrite($fpgetDataAsso, "\nSiren  : " . $siren);
    fwrite($fpgetDataAsso, "\nRequête à exécuter pour récupérer la data du back office : " . $sql);

    //Génération du tableau pour les souscriptions
    $sql3 = "SELECT p.dernierPaiement, p.email, p.nom, p.prenom, p.montant, p.occurence, p.moyen, p.statut, p.stripe_sub_id, p.stripe_sched_sub_id,p.asso,p.stripe_cus_id,p.recu_2023
    FROM Personnes p
    INNER join Assos a on a.uri = '$uri'
    WHERE p.asso='$uri' 
    GROUP BY p.dernierPaiement, p.email,a.nom, p.nom, p.prenom, p.montant, p.occurence, p.moyen, p.statut, p.stripe_sub_id, p.stripe_sched_sub_id,p.asso 
    order by dernierPaiement desc limit 10000";

    fwrite($fpgetDataAsso, "\nRequête à exécuter pour récupérer la data du back office : " . $sql3);
    $dataSouscriptions = selectDB($sql3, "backoffice.php/getDataBackoffice");


    //Recuperer les différentes campagnes pour les filtres
    $sql2 = "SELECT DISTINCT amana FROM Dons_Ponctuels WHERE asso='$uri'";
    $distinct = selectDB($sql2, "backoffice.php/getDataBackoffice");

    $sql = "SELECT sum(montant) FROM Personnes WHERE asso='$uri' and occurence='mensuel' and statut='actif'";
    $totalDonMensuel = selectDB($sql, "backoffice.php/getDataBackoffice");

    $sql = "SELECT sum(montant) FROM Dons_Mensuel_Failed WHERE asso = '$uri' AND MONTH(ajout) = '$month' AND YEAR(ajout) = '2024';";
    $totalDonMensuelFailed = selectDB($sql, "backoffice.php/getDataBackoffice");

    $sql = "SELECT sum(montant) FROM Dons_Ponctuels WHERE asso='$uri' and year(ajout)='2024'";
    $donPercu = selectDB($sql, "backoffice.php/getDataBackoffice");

    $sql = "SELECT COUNT(*) AS nbSouscriptions FROM Personnes WHERE asso='$uri' AND (statut='actif' OR statut='pending')";
    $nbSouscriptions = selectdb($sql, "backoffice.php/getDataBackoffice");


    $sql = "SELECT COUNT(*) AS nbRecu2023 FROM Dons_Ponctuels WHERE asso='$uri' AND lien_recu LIKE '%pdf%' and year(ajout)='2023';";
    $nbRecu2023 = selectdb($sql, "mensuel.php/getDataBackoffice");

    $sql = "SELECT COUNT(DISTINCT(recu_2023)) AS nbRecu2023Mensuel FROM Personnes WHERE asso=\"$uri\" AND recu_2023 LIKE '%pdf%';";
    $nbRecu2023Mensuel = selectdb($sql, "mensuel.php/getDataBackoffice");

    $sql = "SELECT COUNT(*) AS nbRecuTotal FROM Dons_Ponctuels WHERE asso=\"$uri\" AND lien_recu LIKE '%pdf%';";
    $nbRecuTotal = selectdb($sql, "mensuel.php/getDataBackoffice");

    $sql = "SELECT (
      (SELECT COUNT(DISTINCT recu_2023) FROM Personnes WHERE asso = \"$uri\" AND recu_2023 LIKE '%pdf%')
      +
      (SELECT COUNT(*)FROM Mensuel_Recu WHERE asso = \"$label\" AND annee = '2022' AND lien_recu LIKE '%pdf%')) AS nbRecuTotalMensuel;";
    $nbRecuTotalMensuel = selectdb($sql, "mensuel.php/getDataBackoffice");


    $sql = "SELECT sum(montant) FROM Dons_Ponctuels WHERE asso=\"$uri\" and lien_recu LIKE '%pdf%' and year(ajout)='2023'";
    $montantRecuFiscaux2023 = selectDB($sql, "backoffice.php/getDataBackoffice");

    $sql = "SELECT sum(cumul_2023) FROM Personnes WHERE asso=\"$uri\" and recu_2023 LIKE '%pdf%' ";
    $montantRecuFiscaux2023Mensuel = selectDB($sql, "backoffice.php/getDataBackoffice");


    $sql = "SELECT sum(montant) FROM Dons_Ponctuels WHERE asso=\"$uri\" and lien_recu LIKE '%pdf%'";
    $montantRecuFiscaux = selectDB($sql, "backoffice.php/getDataBackoffice");

    $sql = "SELECT sum(cumul_2023) FROM Personnes WHERE asso=\"$uri\" and recu_2023 LIKE '%pdf%'";
    $montantRecuFiscauxMensuel = selectDB($sql, "backoffice.php/getDataBackoffice");

    return $response->withJson(['dataClient' => $dataClient, 'distinctCampagne' => $distinct, 'label' => $label, 'dataSouscriptions' => $dataSouscriptions, 'totalDonMensuel' => $totalDonMensuel, 'donPercu' => $donPercu, 'nbSouscriptions' => $nbSouscriptions, 'totalDonMensuelFailed' => $totalDonMensuelFailed, 'mois' => $mois, 'nbRecu2023' => $nbRecu2023, 'nbRecuTotal' => $nbRecuTotal, 'montantRecuFiscaux2023' => $montantRecuFiscaux2023, 'montantRecuFiscaux' => $montantRecuFiscaux, 'montantRecuFiscauxMensuel' => $montantRecuFiscauxMensuel, 'montantRecuFiscaux2023Mensuel' => $montantRecuFiscaux2023Mensuel, 'nbRecuTotalMensuel' => $nbRecuTotalMensuel, 'nbRecu2023Mensuel' => $nbRecu2023Mensuel]);
  } catch (Throwable $ex) {
    fwrite($fpgetDataAsso, "Erreur dans le getDataAsso");
    fwrite($fpgetDataAsso, $ex->getMessage());
    $fperror = fopen('log/error.log', 'a');
    $message = $ex->getMessage();
    $sql = "INSERT into Erreurs (asso,message,fonction) values ('getDataAsso','$message','espaceDonateur.php/getDataAsso')";
    upsert($sql, "getDataAsso.php/getDataAsso");
    fwrite($fperror, "\n************ Erreur dans la méthode : " . $method . strftime('%d/%m/%y %H:%M') . "************\n");
    fwrite($fperror, "\n Message : " . $message . "\n");
    fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
    fclose($fperror);
  } finally {
    fclose($fpgetDataAsso);
  }
});



// $app->post('/generateRecuEspaceDonateur', function (Request $request, Response $response, array $args) {

//   try {
//     $fpRecuEspaceDonateur = fopen('log/recuEspaceDonateur.log', 'a');
//     $body = json_decode($request->getBody());
//     $ajout = $body->ajout;
//     $email = $body->email;


//     $sql = "SELECT * FROM Dons_Ponctuels where email='$email' and ajout='$ajout'";
//     $recuGenerated = selectDB($sql, "espaceDonateur.php/generateRecuEspaceDonateur");
//     $asso = $recuGenerated["asso"];
//     $first_name = $recuGenerated["prenom"];
//     $last_name = $recuGenerated["nom"];
//     $address_street = $recuGenerated["adresse"];
//     $address_city = $recuGenerated["ville"];
//     $postal_code = $recuGenerated["code_postal"];
//     $montant = $recuGenerated["cumul"];
//     $raison = $recuGenerated["raison"];
//     $siren = $recuGenerated["siren"];
//     $moyen = "Prélèvement";


//     $sql2 = "SELECT * from Assos where uri='$asso'";
//     $assoBdd = selectdb($sql2, "espaceDonateur.php/generateRecuEspaceDonateur");
//     $uriAsso = $assoBdd["uri"];
//     $signatairePrenomAsso = $assoBdd["signataire_prenom"];
//     $signataireNomAsso = $assoBdd["signataire_nom"];
//     $signataireSignAsso = $assoBdd["signataire_signature"];
//     $signataireRoleAsso = $assoBdd["signataire_role"];
//     $nomAsso = $assoBdd["nom"];
//     $adresseAsso = $assoBdd["adresse"];
//     $cpAsso = $assoBdd["code_postal"];
//     $villeAsso = $assoBdd["ville"];
//     $typeAsso = $assoBdd["type"];
//     $qualiteAsso = $assoBdd["qualite"];
//     $objetAsso = $assoBdd["objet"];
//     $logoAsso = $assoBdd["logoUrl"];
//     $filename = recuFiscal($last_name, $first_name, $email, $address_street, $raison, $siren, $address_city, $postal_code, $montant, "ponctuel", $montant, $moyen, "ponctuel", $uriAsso, $signatairePrenomAsso, $signataireNomAsso, $signataireSignAsso, $signataireRoleAsso, $nomAsso, $adresseAsso, $cpAsso, $villeAsso, $typeAsso, $qualiteAsso, $objetAsso, $logoAsso);
//     fwrite($fpRecuEspaceDonateur, "\n ############### DEBUT DE L'EXECUTION DE LA REQETE ######################");
//     //$commande = selectDB($sql, "getDataAsso.php/getDataAsso");
//     fwrite($fpRecuEspaceDonateur, "\n ###################### Requête à éxécuter :  " . $sql . " #####################");

//     return $response->withJson(['recuGenerated' => $recuGenerated]);
//   } catch (Throwable $ex) {
//     fwrite($fpRecuEspaceDonateur, "Erreur dans le getDataAsso");
//     fwrite($fpRecuEspaceDonateur, $ex->getMessage());
//     $fperror = fopen('log/error.log', 'a');
//     $message = $ex->getMessage();
//     $sql = "INSERT into Erreurs (asso,message,fonction) values ('getDataAsso','$message','espaceDonateur.php/getDataAsso')";
//     upsert($sql, "getDataAsso.php/getDataAsso");
//     fwrite($fperror, "\n************ Erreur dans la méthode : " . $method . strftime('%d/%m/%y %H:%M') . "************\n");
//     fwrite($fperror, "\n Message : " . $message . "\n");
//     fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
//     fclose($fperror);
//   } finally {
//     fclose($fpRecuEspaceDonateur);
//   }
// });



function getMonthName($month)
{
  $monthNames = array(
    "01" => "janvier",
    "02" => "février",
    "03" => "mars",
    "04" => "avril",
    "05" => "mai",
    "06" => "juin",
    "07" => "juillet",
    "08" => "août",
    "09" => "septembre",
    "10" => "octobre",
    "11" => "novembre",
    "12" => "décembre"
  );

  if (isset($monthNames[$month])) {
    return $monthNames[$month];
  } else {
    return "Mois inconnu";
  }
}


$app->post('/getDataEditMensuel', function (Request $request, Response $response, array $args) {
  $fpgetDataEditMensuel = fopen('log/getDataEditMensuel.log', 'a');

  try {
    $stripe_sched_sub_id = $_SESSION['stripe_sched_sub_id'];
    $stripe_sub_id = $_SESSION['stripe_sub_id'];
    fwrite($fpgetDataEditMensuel, "\n************" . strftime('%d/%m/%y %H:%M') . "************");
    fwrite($fpgetDataEditMensuel, "\n************ Début de l'edit de la souscription de : " . $stripe_sched_sub_id . "************");

    if ($stripe_sub_id != '') {
      $sql = "SELECT asso,prenom,statut,stripe_sub_id  FROM Personnes where stripe_sub_id='$stripe_sub_id'";
      $personnes = selectDB($sql, "/getDataEditMensuel");
      $modfiSubHere = "1";
    }


    if (empty($personnes)) {
      fwrite($fpgetDataEditMensuel, "\n Il n'a pas de schedule on essaye avec le sub_Id");
      $sql = "SELECT asso,prenom,statut,stripe_sched_sub_id FROM Personnes where stripe_sched_sub_id='$stripe_sched_sub_id'";
      $personnes = selectDB($sql, "/getDataEditMensuel");
      $modfiSubHere = "2";
    }
    fwrite($fpgetDataEditMensuel, "\n Requête à éxécuter :  " . $sql . "\n");


    $_SESSION['stripe_sched_sub_id'] = "";
    $_SESSION['stripe_sub_id'] = "";


    return $response->withJson(['modifSubHere' => $modfiSubHere, 'personnes' => $personnes]);
  } catch (Exception $ex) {
    fwrite($fpgetDataEditMensuel, "Erreur dans getDataEditMensuel");
    fwrite($fpgetDataEditMensuel, $ex->getMessage());
    $fperror = fopen('log/error.log', 'a');
    $message = $ex->getMessage();
    $sql = "INSERT into Erreurs (asso,message,fonction) values ('getDataEditMensuel','$message','espaceDonateur.php/getDataEditMensuel')";
    upsert($sql, "backOffice.php/getDataEditMensuel");
    fwrite($fperror, "\n************ Erreur dans la méthode : " . $message . strftime('%d/%m/%y %H:%M') . "************\n");
    fwrite($fperror, "\n Message : " . $message . "\n");
    fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
    fclose($fperror);
  } finally {
    fwrite($fpgetDataEditMensuel, "\n \n ############################ FIN TRANSACTION " . $stripe_sched_sub_id . " ###############################");
    fclose($fpgetDataEditMensuel);
  }
});



$app->post('/redirectToRecu', function (Request $request, Response $response, array $args) {
  $fpStopMensuel = fopen('log/stopMensuel.log', 'a');

  try {

    $body = json_decode($request->getBody());
    $lien_recu = $body->lien_recu;
    fwrite($fpStopMensuel, "\n************  Demande de récupération du reçu ************");
    fwrite($fpStopMensuel, "\n************" . strftime('%d/%m/%y %H:%M') . "************");
    fwrite($fpStopMensuel, "Récupération du recu fiscal : " . $lien_recu);
    $recuDispo = "true";



    if (stripos($lien_recu, 'cus') !== false) {
      $recuDispo = "false";

      // on doit chercher dans mensuel A FAIRE
    } else {
      $sql = "SELECT lien_recu  FROM Dons_Ponctuels where  lien_recu='$lien_recu'";
      $personnes = selectDB($sql, "/redirectToRecu");

      if (empty($personnes)) {
        $sql = "SELECT recu_2023  AS lien_recu FROM Personnes  where  recu_2023='$lien_recu'";
        $personnes = selectDB($sql, "/redirectToRecu");
        if (empty($personnes)) {
          $recuDispo = "false";
          fwrite($fpStopMensuel, "Ce recu n'est pas disponible : " . $lien_recu);
        }
      }
    }

    return $response->withJson(['personnes' => $personnes, 'recuDispo' => $recuDispo]);
  } catch (Exception $ex) {
    fwrite($fpStopMensuel, "Erreur dans stopMensuel");
    fwrite($fpStopMensuel, $ex->getMessage());
    $fperror = fopen('log/error.log', 'a');
    $message = $ex->getMessage();
    $sql = "INSERT into Erreurs (asso,message,fonction) values ('getDataEditMensuel','$message','espaceDonateur.php/getDataEditMensuel')";
    upsert($sql, "backOffice.php/getDataEditMensuel");
    fwrite($fperror, "\n************ Erreur dans la méthode : " . $message . strftime('%d/%m/%y %H:%M') . "************\n");
    fwrite($fperror, "\n Message : " . $message . "\n");
    fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
    fclose($fperror);
  } finally {
    fwrite($fpStopMensuel, "\n \n ############################ FIN TRANSACTION " . $oldSubId . " ###############################");
    fclose($fpStopMensuel);
  }
});


$app->post('/addNewCampagne', function (Request $request, Response $response, array $args) {
  $fpaddCampagne = fopen('log/getDataAddCampagne.log', 'a');

  try {
    $body = json_decode($request->getBody());
    $datetime = date("Y-m-d H:i:s");
    $asso = $body->asso;
    $nomCampagne = $body->nomCampagne;
    $nomCampagneOk = $body->nomCampagneOk;
    $objectif = $body->objectif;
    fwrite($fpaddCampagne, "\n************  Début d'ajout d'une nouvelle campagne pour l'association : " . $asso . " ************" . "\n");
    fwrite($fpaddCampagne, "\n************" . strftime('%d/%m/%y %H:%M') . "************" . "\n");
    fwrite($fpaddCampagne, "\n Objectif " . $objectif . "\n");
    fwrite($fpaddCampagne, "\n nomCampagne : " . $nomCampagne . "\n");
    fwrite($fpaddCampagne, "\n nomCampagneOk : " . $nomCampagneOk . "\n");
    if ($nomCampagneOk == "Oui") {
      $sql = "SELECT id FROM Assos WHERE nom='$asso'";
      $idAsso = selectDB($sql, "/addNewCampagne");
      $id = $idAsso[0]['id'];

      $sql = "INSERT INTO Campagnes (nom, type) VALUES (\"$nomCampagne\", 'ponctuel')";
      $ajoutCampagnne = upsert($sql, "backOffice.php/addNewCampagne");

      $sql = "SELECT id FROM Campagnes ORDER BY id DESC LIMIT 1;";
      $idCampagne = selectDB($sql, "backOffice.php/addNewCampagne");
      $idCampagne = $idCampagne[0]['id'];

      $sql = "INSERT INTO Assos_Campagnes (id_assos, id_campagnes, objectif,type,statut,debut) VALUES ('$id', '$idCampagne','$objectif','ponctuel','actif','$datetime')";
      $campagne = upsert($sql, "/addNewCampagne");
      fwrite($fpaddCampagne, "\n Requete pour ajouter la nouvelle campagne : " . $sql);
      fwrite($fpaddCampagne, "\n La nouvelle campagne a été ajouté : " . $nomCampagne . " elle a pour objectif " . $objectif);
    } else {
      fwrite($fpaddCampagne, "\n************  Annulation la campagne a moins de 3 caracteres pour l'asso : " . $asso . " ************");
    }
    if ($campagne) {
      $messageConfirmation = "La nouvelle campagne a bien été ajouté";
    } else {
      $messageConfirmation = "L'ajout de la campagne à échoué";
    }
    return $response->withJson(['messageConfirmation' => $messageConfirmation]);
  } catch (Exception $ex) {
    fwrite($fpaddCampagne, "Erreur dans stopMensuel");
    fwrite($fpaddCampagne, $ex->getMessage());
    $fperror = fopen('log/error.log', 'a');
    $message = $ex->getMessage();
    $sql = "INSERT into Erreurs (asso,message,fonction) values ('getDataEditMensuel','$message','espaceDonateur.php/getDataEditMensuel')";
    upsert($sql, "backOffice.php/getDataEditMensuel");
    fwrite($fperror, "\n************ Erreur dans la méthode : " . $message . strftime('%d/%m/%y %H:%M') . "************\n");
    fwrite($fperror, "\n Message : " . $message . "\n");
    fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
    fclose($fperror);
  } finally {
    fclose($fpaddCampagne);
  }
});


$app->post('/getDataAddNewCampagne', function (Request $request, Response $response, array $args) {
  $fpaddCampagne = fopen('log/getDataAddCampagne.log', 'a');

  try {
    $body = json_decode($request->getBody());
    $chooseCampagne = $body->chooseCampagne;
    $campagne = $body->campagne;
    $startDate = $body->startDate;
    $endDate = $body->endDate;
    $operator = $body->operator;
    $sql2 = "Select uri,id,nom from Assos where siren = '" . $_SESSION['siren'] . "'";
    $asso = selectDB($sql2, "backoffice.php/getDataBackoffice");
    $uri = $asso[0]["uri"];
    $idAsso = $asso[0]["id"];
    $nomAsso = $asso[0]["nom"];
    fwrite($fpaddCampagne, "Début de récupération des campagnes actuelles pour l'asso : " . $nomAsso);

    $sql = "SELECT 
            c.nom, 
            objectif, 
            a.statut,
            a.type, 
            SUM(d.montant) AS montant,
            COALESCE(d.asso, '$uri') AS asso
        FROM 
            Assos_Campagnes a
        INNER JOIN 
            Campagnes c ON a.id_campagnes = c.id
        LEFT JOIN 
            Dons_Ponctuels d ON d.amana = c.nom
        WHERE 
            a.id_assos = '$idAsso' 
            AND a.type IN ('ponctuel', 'marketing')
            AND (d.asso = '$uri' OR d.asso IS NULL)";

    if ($chooseCampagne !== "allCampagne") {
      $sql .= "and d.amana='$chooseCampagne' ";
    }

    if ($startDate !== "" && $endDate !== "") {
      $sql .= "and d.ajout BETWEEN '$startDate 00:00:00' and '$endDate 00:00:00'";
    }

    $sql .= " GROUP BY c.nom, objectif, a.type, a.statut;";
    $campagneAsso = selectDB($sql, "backoffice.php/getDataBackoffice");

    return $response->withJson(['campagneAsso' => $campagneAsso]);
  } catch (Exception $ex) {
    fwrite($fpaddCampagne, "Erreur dans stopMensuel");
    fwrite($fpaddCampagne, $ex->getMessage());
    $fperror = fopen('log/error.log', 'a');
    $message = $ex->getMessage();
    $sql = "INSERT into Erreurs (asso,message,fonction) values ('getDataEditMensuel','$message','espaceDonateur.php/getDataEditMensuel')";
    upsert($sql, "backOffice.php/getDataEditMensuel");
    fwrite($fperror, "\n************ Erreur dans la méthode : " . $message . strftime('%d/%m/%y %H:%M') . "************\n");
    fwrite($fperror, "\n Message : " . $message . "\n");
    fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
    fclose($fperror);
  } finally {
    fclose($fpaddCampagne);
  }
});


$app->post('/activeInactiveCampagne', function (Request $request, Response $response, array $args) {
  $fpaddCampagne = fopen('log/getDataAddCampagne.log', 'a');

  try {
    $body = json_decode($request->getBody());
    $nom = $body->nom;
    $statut = $body->statut;
    $asso = $body->asso;

    fwrite($fpaddCampagne, "\n************  Début de la modification du statut pour la campagne : " . $nom . " de l'association : " . $asso . " qui est " . $statut . " ************");
    fwrite($fpaddCampagne, "\n************" . strftime('%d/%m/%y %H:%M') . "************");
    $sql = "SELECT id FROM Assos WHERE uri='$asso'";
    $idAsso = selectDB($sql, "/activeInactiveCampagne");
    $id = $idAsso[0]['id'];

    $sql = "SELECT id FROM Campagnes WHERE nom=\"$nom\"";
    $idCampagne = selectDB($sql, "/activeInactiveCampagne");
    $idCampagne = $idCampagne[0]['id'];

    if ($statut === "actif") {
      $sql = " UPDATE Assos_Campagnes SET statut = 'inactif' WHERE id_assos='$id' and id_campagnes='$idCampagne';";
      fwrite($fpaddCampagne, "\n************  La campagne : " . $nom . " de l'association : " . $asso . " est maintenant inactive ************");
    } else {
      $sql = " UPDATE Assos_Campagnes SET statut = 'actif' WHERE id_assos='$id' and id_campagnes='$idCampagne';";
      fwrite($fpaddCampagne, "\n************  La campagne : " . $nom . " de l'association : " . $asso . " est maintenant active ************");
    }
    fwrite($fpaddCampagne, "\n************  La requete sql : " . $sql ." ************");
    upsert($sql, "backOffice.php/getDataEditMensuel");




    // $sql = "SELECT id FROM Campagnes WHERE nom='$nom'";
    // $idCampagne = selectDB($sql, "/addNewCampagne");
    // $id = $idAsso[0]['id'];

    return $response->withJson([]);
  } catch (Exception $ex) {
    fwrite($fpaddCampagne, "Erreur dans stopMensuel");
    fwrite($fpaddCampagne, $ex->getMessage());
    $fperror = fopen('log/error.log', 'a');
    $message = $ex->getMessage();
    $sql = "INSERT into Erreurs (asso,message,fonction) values ('activeInactiveCampagne','$message','espaceDonateur.php/activeInactiveCampagne')";
    upsert($sql, "backOffice.php/getDataEditMensuel");
    fwrite($fperror, "\n************ Erreur dans la méthode : " . $message . strftime('%d/%m/%y %H:%M') . "************\n");
    fwrite($fperror, "\n Message : " . $message . "\n");
    fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
    fclose($fperror);
  } finally {
    fclose($fpaddCampagne);
  }
});



$app->post('/linkAsso', function (Request $request, Response $response, array $args) {
  $fpaddCampagne = fopen('log/getDataAddCampagne.log', 'a');

  try {
    $body = json_decode($request->getBody());
    $asso = $body->asso;
    $sql2 = "Select uri,id,nom from Assos where siren = '" . $_SESSION['siren'] . "'";
    $asso = selectDB($sql2, "backoffice.php/linkAsso");
    $uri = $asso[0]["uri"];
    $idAsso = $asso[0]["id"];
    $nomAsso = $asso[0]["nom"];
    fwrite($fpaddCampagne, "Début de récupération des campagnes actuelles pour l'asso : " . $nomAsso);

    $sql = "SELECT c.nom,a.type
            FROM Assos_Campagnes a
            INNER JOIN Campagnes c ON a.id_campagnes = c.id
            WHERE a.id_assos = '$idAsso' 
            and a.statut ='actif'
            GROUP BY c.nom, objectif, a.type, a.statut;";
    $campagneLink = selectDB($sql, "backoffice.php/linkAsso");

    return $response->withJson(['campagneLink' => $campagneLink]);
  } catch (Exception $ex) {
    fwrite($fpaddCampagne, "Erreur dans stopMensuel");
    fwrite($fpaddCampagne, $ex->getMessage());
    $fperror = fopen('log/error.log', 'a');
    $message = $ex->getMessage();
    $sql = "INSERT into Erreurs (asso,message,fonction) values ('linkAsso','$message','backoffice.php/linkAsso')";
    upsert($sql, "backOffice.php/linkAsso");
    fwrite($fperror, "\n************ Erreur dans la méthode : " . $message . strftime('%d/%m/%y %H:%M') . "************\n");
    fwrite($fperror, "\n Message : " . $message . "\n");
    fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
    fclose($fperror);
  } finally {
    fclose($fpaddCampagne);
  }
});
