<?php

use Slim\Http\Request;
use Slim\Http\Response;

require_once './services/utils.php';

$app->post('/stopMensuel', function (Request $request, Response $response, array $args) {
  $fpStopMensuel = fopen('log/stopMensuel.log', 'a');

  try {
    $body = json_decode($request->getBody());
    $asso = $body->asso;
    $emailClient = $body->emailClient;
    $oldSubId = $body->oldSubID;
    $annulationReussie = "L'annulation a échoué";

    fwrite($fpStopMensuel, "\n\n");
    fwrite($fpStopMensuel, "#############" . strftime('%d/%m/%y %H:%M') . "###############  Asso " . $asso . " DEBUT SUPPRESSION ABONNEMENT Mensuel " . $oldSubId . " Le donateur a pour mail " . $emailClient . " ############################### \n" );
    fwrite($fpStopMensuel, "\n ############# Annulation de la subscription " . $oldSubId . " #############\n");



    $sql = "SELECT * FROM Assos where uri='$asso' limit 1";
    $assoBdd = selectdb($sql, "stripe_webservice.php-stripe");
    $sec_key = $assoBdd[0]["stripe_secret_key"];


    global $stripe;
    $stripe = new \Stripe\StripeClient(
      $sec_key
    );
    if (strpos($oldSubId, "sched") !== false) {
      fwrite($fpStopMensuel, "\n L'abonnement est de type schedule \n");
      fwrite($fpStopMensuel, "#############" . strftime('%d/%m/%y %H:%M') . "###############  DEBUT DE LA SUPPRESSION DU SCHEDULE ###############################\n");
      $stripe->subscriptionSchedules->cancel($oldSubId, []);

      fwrite($fpStopMensuel, "#############" . strftime('%d/%m/%y %H:%M') . "############### LA SUPPRESSION DU SCHEDULE A BIEN FONCTIONNEE ############################### \n \n");
      $annulationReussie = "L'annulation à bien fonctionné";
    } else {

      fwrite($fpStopMensuel, "\n L'abonnement est de type souscription \n");
      fwrite($fpStopMensuel, "#############" . strftime('%d/%m/%y %H:%M') . "###############  DEBUT DE LA SUPPRESSION DE LA SOUSCRIPTION ############################### \n");
      $stripe->subscriptions->cancel(
        $oldSubId,
        []
      );

      //disableMensuel($oldSubId,$asso,$eventId,$eventType,$errorMailSent);

      fwrite($fpStopMensuel, "#############" . strftime('%d/%m/%y %H:%M') . "############### LA SUPPRESSION DE LA SOUSCRIPTION A BIEN FONCTIONNEE ############################### \n \n");
      $annulationReussie = "L'annulation à bien fonctionné";
    }

    // $template = "annulation";
    // $subject = "Annulation de votre souscription";
    // $variables["prenom"] = $first_name;
    // $variables["monAsso"] = $asso;
    // $variables["codeCouleur"] = $assoBdd[0]["codeCouleur"];
    // sendEmailDonator($asso, $emailClient, $template, $subject, $variables, null);
    return $response->withJson(['resultatAnnulation' => $annulationReussie]);
  } catch (Exception $ex) {


    fwrite($fpStopMensuel, "Erreur dans stop Mensuel   ");
    $message = $ex->getMessage();
    fwrite($fpStopMensuel, $message);
    $fperror = fopen('log/error.log', 'a');
    $sql = "INSERT into Erreurs (asso,message,fonction) values ('stopMensuel','$message','espaceDonateur.php/stopMensuel')";
    upsert($sql, "espaceDonateur.php/stopMensuel");
    fwrite($fperror, "\n************ Erreur dans la méthode : " . $method . strftime('%d/%m/%y %H:%M') . "************\n");
    fwrite($fperror, "\n Message : " . $message . "\n");
    fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
    fclose($fperror);
    return $response->withJson(['resultatAnnulation' => $annulationReussie]);
  } finally {
    fwrite($fpStopMensuel, "\n \n ############################ FIN TRANSACTION " . $oldSubId . " ###############################\n");
    fclose($fpStopMensuel);
  }
});

$app->post('/getDataClient', function (Request $request, Response $response, array $args) {

  try {
    $fpgetDataClient = fopen('log/getDataClient.log', 'a');
    $body = json_decode($request->getBody());
    // $asso = $body->asso;
    // $emailClient = $body->emailClient;
    $email = $_SESSION['user_email'];
    fwrite($fpgetDataClient, "\n ############### CHECK DE L'EMAIL ######################    " . $email);

    $sql = "SELECT a.nom as nomAsso, p.nom, p.prenom, p.email,p.ajout, p.montant, p.moyen, p.amana, p.lien_recu 
    FROM Dons_Ponctuels p
    left join Assos a on a.uri = p.asso
    WHERE p.email='$email' ";


    $sql2 = "Select prenom from members where email = '$email'"; // and siren ='na'";
    $member = selectDB($sql2, "backoffice.php/getDataBackoffice");
    $label = $member[0]["prenom"];
    $sql .= " and p.email='$email'";

    // $sql = "SELECT DISTINCT amana FROM Dons_Ponctuels WHERE email='$email'";
    // $sql = "SELECT A.nom, P.ajout, P.montant, P.occurence, P.moyen, P.statut, P.stripe_sub_id, P.stripe_sched_sub_id,P.asso   FROM Personnes P   LEFT JOIN Assos A ON P.asso = A.uri WHERE P.email = '$email' ORDER BY P.ajout DESC";
    $dataClient = selectDB($sql, "espaceDonateur.php/getDataClient");

    fwrite($fpgetDataClient, "\n ############### DEBUT DE L'EXECUTION DE LA REQETE ######################");
    //$commande = selectDB($sql, "getDataClient.php/getDataClient");
    fwrite($fpgetDataClient, "\n ###################### Requête à éxécuter :  " . $sql . " #####################");



    $sql3 = "SELECT p.dernierPaiement, p.email,a.nom, p.nom, p.prenom, p.montant, p.occurence, p.moyen, p.statut, p.stripe_sub_id,p.asso,p.stripe_cus_id,p.expirationcb,p.last4
    FROM Personnes p
    left join Assos a on a.uri = p.asso
    WHERE p.occurence='mensuel' and p.email='$email' 
    GROUP BY p.dernierPaiement, p.email,a.nom, p.nom, p.prenom, p.montant, p.occurence, p.moyen, p.statut, p.stripe_sub_id, p.stripe_sched_sub_id,p.asso 
    order by dernierPaiement desc limit 10000";

    fwrite($fpgetDataClient, "\nRequête à exécuter pour récupérer la data du back office : " . $sql3);
    $dataSouscriptions = selectDB($sql3, "backoffice.php/getDataBackoffice");


    $sql3 = "SELECT p.dernierPaiement, p.email,a.nom, p.nom, p.prenom, p.montant, p.occurence, p.moyen, p.statut, p.stripe_sub_id,p.asso,p.stripe_cus_id
    FROM Personnes p
    left join Assos a on a.uri = p.asso
    WHERE p.occurence='mensuel' and p.email='$email' 
    GROUP BY p.dernierPaiement, p.email,a.nom, p.nom, p.prenom, p.montant, p.occurence, p.moyen, p.statut, p.stripe_sub_id, p.stripe_sched_sub_id,p.asso 
    order by dernierPaiement desc limit 10000";


    return $response->withJson(['dataClient' => $dataClient, 'dataSouscriptions' => $dataSouscriptions]);
  } catch (Throwable $ex) {
    fwrite($fpgetDataClient, "Erreur dans le getDataClient");
    fwrite($fpgetDataClient, $ex->getMessage());
    $fperror = fopen('log/error.log', 'a');
    $message = $ex->getMessage();
    $sql = "INSERT into Erreurs (asso,message,fonction) values ('getDataClient','$message','espaceDonateur.php/getDataClient')";
    upsert($sql, "getDataClient.php/getDataClient");
    fwrite($fperror, "\n************ Erreur dans la méthode : " . $method . strftime('%d/%m/%y %H:%M') . "************\n");
    fwrite($fperror, "\n Message : " . $message . "\n");
    fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
    fclose($fperror);
  } finally {
    fclose($fpgetDataClient);
  }
});


$app->post('/getDataRecu', function (Request $request, Response $response, array $args) {

  try {
    $fpgetDataClient = fopen('log/getDataClient.log', 'a');
    $body = json_decode($request->getBody());
    $asso = $body->asso;
    // $emailClient = $body->emailClient;
    $email = $_SESSION['user_email'];


    $sql = "SELECT A.nom, D.ajout, D.montant, D.type, D.moyen, D.lien_recu,D.email   FROM Dons_Ponctuels  D LEFT JOIN Assos A ON D.asso = A.uri WHERE D.email = '$email' and LENGTH(D.lien_recu) > 1 ORDER BY D.ajout DESC";
    $dataRecu = selectDB($sql, "espaceDonateur.php/getDataRecu");

    fwrite($fpgetDataClient, "\n ############### DEBUT DE L'EXECUTION DE LA REQETE ######################");
    //$commande = selectDB($sql, "getDataClient.php/getDataClient");
    fwrite($fpgetDataClient, "\n ###################### Requête à éxécuter :  " . $sql . " #####################");

    return $response->withJson(['dataRecu' => $dataRecu]);
  } catch (Throwable $ex) {
    fwrite($fpgetDataClient, "Erreur dans le getDataClient");
    fwrite($fpgetDataClient, $ex->getMessage());
    $fperror = fopen('log/error.log', 'a');
    $message = $ex->getMessage();
    $sql = "INSERT into Erreurs (asso,message,fonction) values ('getDataClient','$message','espaceDonateur.php/getDataClient')";
    upsert($sql, "getDataClient.php/getDataClient");
    fwrite($fperror, "\n************ Erreur dans la méthode : " . $method . strftime('%d/%m/%y %H:%M') . "************\n");
    fwrite($fperror, "\n Message : " . $message . "\n");
    fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
    fclose($fperror);
  } finally {
    fclose($fpgetDataClient);
  }
});


$app->post('/generateRecuEspaceDonateur', function (Request $request, Response $response, array $args) {

  try {
    $fpRecuEspaceDonateur = fopen('log/recuEspaceDonateur.log', 'a');
    $body = json_decode($request->getBody());
    $ajout = $body->ajout;
    $email = $body->email;


    $sql = "SELECT * FROM Dons_Ponctuels where email='$email' and ajout='$ajout'";
    $recuGenerated = selectDB($sql, "espaceDonateur.php/generateRecuEspaceDonateur");
    $asso = $recuGenerated["asso"];
    $first_name = $recuGenerated["prenom"];
    $last_name = $recuGenerated["nom"];
    $address_street = $recuGenerated["adresse"];
    $address_city = $recuGenerated["ville"];
    $postal_code = $recuGenerated["code_postal"];
    $montant = $recuGenerated["cumul"];
    $raison = $recuGenerated["raison"];
    $siren = $recuGenerated["siren"];
    $moyen = "Prélèvement";


    $sql2 = "SELECT * from Assos where uri='$asso'";
    $assoBdd = selectdb($sql2, "espaceDonateur.php/generateRecuEspaceDonateur");
    $uriAsso = $assoBdd["uri"];
    $signatairePrenomAsso = $assoBdd["signataire_prenom"];
    $signataireNomAsso = $assoBdd["signataire_nom"];
    $signataireSignAsso = $assoBdd["signataire_signature"];
    $signataireRoleAsso = $assoBdd["signataire_role"];
    $nomAsso = $assoBdd["nom"];
    $adresseAsso = $assoBdd["adresse"];
    $cpAsso = $assoBdd["code_postal"];
    $villeAsso = $assoBdd["ville"];
    $typeAsso = $assoBdd["type"];
    $qualiteAsso = $assoBdd["qualite"];
    $objetAsso = $assoBdd["objet"];
    $logoAsso = $assoBdd["logoUrl"];
    $filename = recuFiscal($last_name, $first_name, $email, $address_street, $raison, $siren, $address_city, $postal_code, $montant, "ponctuel", $montant, $moyen, "ponctuel", $uriAsso, $signatairePrenomAsso, $signataireNomAsso, $signataireSignAsso, $signataireRoleAsso, $nomAsso, $adresseAsso, $cpAsso, $villeAsso, $typeAsso, $qualiteAsso, $objetAsso, $logoAsso);
    fwrite($fpRecuEspaceDonateur, "\n ############### DEBUT DE L'EXECUTION DE LA REQETE ######################");
    //$commande = selectDB($sql, "getDataClient.php/getDataClient");
    fwrite($fpRecuEspaceDonateur, "\n ###################### Requête à éxécuter :  " . $sql . " #####################");

    return $response->withJson(['recuGenerated' => $recuGenerated]);
  } catch (Throwable $ex) {
    fwrite($fpRecuEspaceDonateur, "Erreur dans le getDataClient");
    fwrite($fpRecuEspaceDonateur, $ex->getMessage());
    $fperror = fopen('log/error.log', 'a');
    $message = $ex->getMessage();
    $sql = "INSERT into Erreurs (asso,message,fonction) values ('getDataClient','$message','espaceDonateur.php/getDataClient')";
    upsert($sql, "getDataClient.php/getDataClient");
    fwrite($fperror, "\n************ Erreur dans la méthode : " . $method . strftime('%d/%m/%y %H:%M') . "************\n");
    fwrite($fperror, "\n Message : " . $message . "\n");
    fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
    fclose($fperror);
  } finally {
    fclose($fpRecuEspaceDonateur);
  }
});
