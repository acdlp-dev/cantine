<?php

use Slim\Http\Request;
use Slim\Http\Response;
use Stripe\Stripe;

$stripe = null;

$app->post('/stripe', function (Request $request, Response $response) {
  //Documentation event customer.subscription.updated
  //https://dashboard.stripe.com/events/evt_1J9zMcKTTpb3WzrmRn62g8pA

  // Parse the message body (and check the signature if possible)
  $fpStripeWebservice = fopen('log/stripews.log', 'a');

  $pub_key = $request->getQueryParam('pub_key');
  $camp = $request->getQueryParam('camp');

  if ($camp === "zk") {
    $sql = "SELECT * FROM Assos where stripe_publishable_key_zakat='$pub_key' limit 1";
    $assoBdd = selectdb($sql, "stripe_webservice.php-stripe");
    $webhookSecret = $assoBdd[0]["stripe_webhook_secret_key_zakat"];
  } else {
    $sql = "SELECT * FROM Assos where stripe_publishable_key='$pub_key' limit 1";
    $assoBdd = selectdb($sql, "stripe_webservice.php-stripe");
    $webhookSecret = $assoBdd[0]["stripe_webhook_secret_key"];
  }
  $sec_key = $assoBdd[0]["stripe_secret_key"];
  global $stripe;
  $stripe = new \Stripe\StripeClient(
    $sec_key
  );
  $asso = $assoBdd[0]["uri"];

  if ($webhookSecret) {
    try {
      $event = \Stripe\Webhook::constructEvent(
        $request->getBody(),
        $request->getHeaderLine('stripe-signature'),
        $webhookSecret
      );
    } catch (Exception $ex) {
      $fperror = fopen('log/error.log', 'a');
      $message = $ex->getMessage() . " " . $pub_key;
      $sql = "INSERT into Erreurs (asso,message,fonction) values ('$asso','$message','stripe_webservice.php/stripe')";
      upsert($sql, "stripe_webservice.php/stripe");
      fwrite($fperror, "\n************ Erreur dans la méthode : " . $method . strftime('%d/%m/%y %H:%M') . "************\n");
      fwrite($fperror, "\n Message : " . $message . "\n");
      fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
      fclose($fperror);
      return $response->withJson(['error' => $ex->getMessage()])->withStatus(403);
    }
  }

  $headers = $request->getHeaders();
  fwrite($fpStripeWebservice, "\n Headers \n");
  foreach ($headers as $name => $values) {
    fwrite($fpStripeWebservice, $name . ": " . implode(", ", $values));
  }
  // $event = $request->getParsedBody();
  fwrite($fpStripeWebservice, "\n\n");
  fwrite($fpStripeWebservice, "############################ Asso " . $asso . " DEBUT TRANSACTION " . $event['type'] . " ###############################");
  fwrite($fpStripeWebservice, "\n\n");
  fwrite($fpStripeWebservice, "***************Notification Stripe RECU*** " . strftime('%d/%m/%y %H:%M') . " ***************");
  fwrite($fpStripeWebservice, "\n Wehbhook Secret = " . $webhookSecret);
  fwrite($fpStripeWebservice, "\n Api Secret  = " . $sec_key);
  fwrite($fpStripeWebservice, "\n " . $event['type']);
  fwrite($fpStripeWebservice, "\n " . $event);
  dispatcher($event, $asso, $assoBdd);
  fclose($fpStripeWebservice);
  return $response->withJson(['status' => 'success'])->withStatus(202);
});

function dispatcher($event, $asso, $assoBdd)
{
  $fpStripeWebservice = fopen('log/stripews.log', 'a');
  fwrite($fpStripeWebservice, "\n" . $event['type']);

  if ($event['type'] == 'charge.succeeded' && $event['data']['object']['metadata']['source'] == "Don Ponctuel Stripe") {
    webPonctuel($event, $asso, $assoBdd);
  }

  if ($event['type'] == 'payment_intent.succeeded' && $event['data']['object']['description'] == "Subscription update" || $event['type'] == 'payment_intent.succeeded' && $event['data']['object']['description'] == "Subscription creation" || $event['type'] == 'payment_intent.succeeded' && strpos($event['data']['object']['description'], 'invoice') !== false) {
    fwrite($fpStripeWebservice, "\n Nous sommes tous ds palestiniens");
    webMensuel($event, $asso);
  }

  if ($event['type'] == 'customer.subscription.created') {
    majSubId($event, $asso);
  }

  if ($event['type'] == 'customer.subscription.deleted') {
    disableMensuelBDD($event, $asso);
  }

  if ($event['type'] == 'payment_intent.payment_failed' && $event['data']['object']['metadata']['source'] != "Don Ponctuel Stripe") {
    failedMensuel($event, $asso);
  }

  if ($event['type'] == 'subscription_schedule.aborted') {
    //failedMensuel($event,$asso);
  }
  if ($event['type'] == 'charge.dispute.created') {
    //failedMensuel($event,$asso);
    dispute($event, $asso, $assoBdd);
  }
}
function dispute($event, $asso, $assoBdd)
{

  try {

    $fpDispute = fopen('log/dispute.log', 'a');
    $eventId = $event['id'];
    $eventType = $event['type'];
    $payement_intent = $event['data']['object']['payment_intent'];
    $reason = $event['data']['object']['reason'];
    $paymentIntent = $event['data']['object']['payment_intent'];
    $sec_key = $assoBdd[0]["stripe_secret_key"];
    global $stripe;
    $response = $stripe->paymentIntents->retrieve($paymentIntent);
    $cusId = $response['charges']['data'][0]['customer'];
    $sql2 = "SELECT * FROM Personnes where stripe_cus_id = '$cusId' and asso = '$asso' ";
    $personne = selectDB($sql2, "stripe_webservice.php-dispute");
    $subId = $personne[0]["stripe_sub_id"];
    $montant = $personne[0]["montant"];
    $email = $personne[0]["email"];
    $prenom = $personne[0]["prenom"];
    $nom = $personne[0]["nom"];
    $template = "InsufficientFunds";
    $subject = "Echec de votre don mensuel";
    $variables = [];
    $url = getenv('URL_FINALISATION');
    $errorMessage = str_replace("'", "", $event['data']['object']['charges']['data'][0]['outcome']['seller_message']);
    $errorMessage = str_replace("'", "", $errorMessage);
    $errorCode = str_replace("'", "", $event['data']['object']['charges']['data'][0]['failure_code']);
    $errorDeclineCode = str_replace("'", "", $event['data']['object']['charges']['data'][0]['outcome']['reason']);
    $errorDeclineCode = str_replace("'", "", $errorDeclineCode);
    $disableMensuelDispute = $assoBdd[0]["disable_mensuel"];

    Stripe::setApiKey($sec_key);
    $invoices = \Stripe\Invoice::all([
      'subscription' => $subId,
      'limit' => 3
    ]);

    $failedCount = 0;

    foreach ($invoices->data as $invoice) {
      $paymentIntent = \Stripe\PaymentIntent::retrieve($invoice->payment_intent);

      if ($paymentIntent->status == 'requires_payment_method' || $paymentIntent->status == 'failed') {
        $failedCount++;
      }
    }

    // Si les 3 derniers paiements ont échoué
    if ($failedCount == 3) {
      // Écrire dans le log
      fwrite($fpDispute, "\n Les trois derniers paiements pour la souscription {$subId} ont échoué \n");

    }
    $dernierPaiement = $personne[0]["dernierPaiement"];
    $tracking = $personne[0]["tracking"];
    $recurrence = $personne[0]["recurrence"];
    $ajout = $personne[0]["ajout"];
    $moyen = "Iban";
    $montant = $personne[0]["montant"];
    $email = $personne[0]["email"];
    $prenom = $personne[0]["prenom"];
    $nom = $personne[0]["nom"];
    $template = "InsufficientFunds";
    $subject = "Echec de votre don mensuel";
    $variables = [];
    $url = getenv('URL_FINALISATION');
    $template = "InsufficientFunds";
    $variables["feesSepa"] = "⚠️ Attention en plus du remboursement, chaque échec sur un prélèvement coûte 7,50 € à l'association...";


    fwrite($fpDispute, "\n\n");
    fwrite($fpDispute, "############################ Asso " . $asso . " DEBUT TRANSACTION Don Mensuel " . " ###############################");
    fwrite($fpDispute, "\n\n");
    fwrite($fpDispute, "***************Notification Stripe RECU*** " . strftime('%d/%m/%y %H:%M') . " ***************");
    fwrite($fpDispute, "\n Evennement : \n");
    fwrite($fpDispute, $event["id"] . "\n");
    fwrite($fpDispute, "customerID = " . $cusId);

    if ($disableMensuelDispute == "false") {
      switch ($reason) {
        case "insufficient_funds":
          $errorMailSent = "Vous ne disposez pas de fonds suffisants ou votre plafond n\'est pas assez élevé.";
          break;
        case "incorrect_account_details":
          $errorMailSent = "Erreur dans les informations bancaires.";
          disableMensuel($subId, $asso, $eventId, $eventType, $errorMailSent, $reason);
          break;
        case "general":
          $errorMailSent = "Aucune raison n\'a été donnée.";
          break;
        case "debit_not_authorized":
          $errorMailSent = "Le titulaire du compte n\'a pas reconnu le paiement et l\'a considéré comme frauduleux.";
          break;
        case "customer_initiated":
          $errorMailSent = "Le titulaire du compte n\'est pas satisfait mais ne donne pas de raison précise.";
          break;
        case "bank_cannot_process":
          $errorMailSent = "La banque a rejeté ce paiement.";
          break;
        case "fraudulent":
          $errorMailSent = "Le paiement est considéré comme frauduleux.";
          disableMensuel($subId, $asso, $eventId, $eventType, $errorMailSent, $reason);
          break;

        default:
          $errorMailSent = "Votre prélévement a été refusée pour une raison inconnue.";
      }
    } else {
      fwrite($fpDispute, "\n A la demande de l'association $asso ce litige entraine une désactivation de l'abonnement \n");
      $errorMailSent = "Un litige a été crée concernant votre paiement.";
      $variables["feesSepa"] = "⚠️ Attention en plus du remboursement, chaque échec sur un prélèvement coûte 7,50 € à l'association, c'est pourquoi nous avons désactivé votre don mensuel.";
      //disableMensuel($subId,$asso,$eventId,$eventType);
    }
    $errorMailSent = str_replace('"', '', $errorMailSent);
    $errorMailSent = str_replace("'", "", $errorMailSent);
    $variables["prenom"] = $prenom;
    $variables["montant"] = $montant;
    $variables["lienReinit"] = $url . "mensuel?asso=" . $asso . "&oldSubId=" . $subId;
    $variables["error_message"] = $errorMailSent;
    //fwrite($$fpDispute, "\n Erreur code " . $errorCode . "\n");
    //fwrite($fpDispute, "\n Erreur Decline code " . $errorDeclineCode . "\n");
    sendEmailDonator($asso, $email, $template, $subject, $variables, null);

    $sql3 = "insert into Dons_Mensuel_Failed(asso,error_code, error_decline_code,error_message,error_mail_sent,tracking,stripe_cus_id,stripe_sub_id,ajout,dernierPaiement,montant,recurrence,nom,moyen,prenom,email,source) values (\"$asso\",\"$errorCode\",\"$errorDeclineCode\",\"$errorMessage\",\"$errorMailSent\",\"$tracking\",\"$cusId\",\"$subId\",\"$ajout\",\"$dernierPaiement\",\"$montant\",\"$recurrence\",\"$nom\",\"$moyen\",\"$prenom\",\"$email\",\"site\")";
    fwrite($fpDispute, "\n Execution de la requête " . $sql3 . "\n");
    upsert($sql3, "stripe_webservice.php-dispute");

    $sql4 = "update Personnes set statut='failed', error_date=NOW(), error_decline_code='$reason', error_mail_sent=\"" . $errorMailSent . "\" where stripe_cus_id in ('$cusId') and asso = '$asso' and statut != 'inactif' ";
    fwrite($fpDispute, "\n Execution de la requête " . $sql4 . "\n");
    upsert($sql4, "stripe_webservice.php-dispute");
  } catch (Throwable $ex) {
    fwrite($fpDispute, "\n Erreur globale pour " . $cusId);
    fwrite($fpDispute, $ex->getMessage());
    $fperror = fopen('log/error.log', 'a');
    $ligne = $ex->getLine();
    $file = $ex->getFile();
    $message = $ex->getMessage();
    $message = $file . " " . $ligne . " " .  $message . " Api Key = " . $sec_key;
    $sql = "INSERT into Erreurs (asso, message,fonction, event, eventType) values ('$asso','$message','stripe_webservice.php-dispute','$eventId','$eventType')";
    upsert($sql, "stripe_webservice.php-dispute");
    fwrite($fperror, "\n************ Erreur dans la méthode : stripe_webservice.php-dispute " . strftime('%d/%m/%y %H:%M') . "************\n");
    fwrite($fperror, "\n Message : " . $message . "\n");
    fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
    fclose($fperror);
  } finally {
    fclose($fpDispute);
  }
}

function webMensuel($event, $asso)
{
  // Set the default payment method on the customer

  try {
    $eventId = $event['id'];
    $eventType = $event['type'];
    $fpStripeWebserviceMensuel = fopen('log/stripewsms.log', 'a');
    $customerId = $event['data']['object']['customer'];
    $sql = "SELECT * FROM Personnes where stripe_cus_id='$customerId' and asso ='$asso' order by id desc limit 1";

    fwrite($fpStripeWebserviceMensuel, "\n\n");
    fwrite($fpStripeWebserviceMensuel, "############################ Asso " . $asso . " DEBUT TRANSACTION Don Mensuel " . $customerId . " ###############################");
    fwrite($fpStripeWebserviceMensuel, "\n\n");
    fwrite($fpStripeWebserviceMensuel, "***************Notification Stripe RECU*** " . strftime('%d/%m/%y %H:%M') . " ***************");
    fwrite($fpStripeWebserviceMensuel, "\n Evennement : \n");
    fwrite($fpStripeWebserviceMensuel, $event["id"] . "\n");
    $personnes = selectDB($sql, "stripe_webservice.php-webMensuel");
    $customer = $personnes[0];
    $address_street = $customer["adresse"];
    $address_zip = $customer["code_postal"];
    $address_city = $customer["ville"];
    $address_country = $customer["pays"];
    $address_country_code = null;
    $payer_email = $customer["email"];
    $first_name = $customer["prenom"];
    $last_name = $customer["nom"];
    $nomArbre = $customer["nomArbre"];
    $parrain_prenom = $customer["parrainPrenom"];
    $parrain_email = $customer["parrainEmail"];
    $subId = $customer["stripe_sub_id"];
    $description = $event['data']['object']['description'];
    $amana = 'Fonds Généraux';
    $amount = $event['data']['object']['amount'];
    $amount = (int)$amount;
    $amount = $amount / 100;
    $type = $customer['occurence'];
    $object = $event['data']['object'];
    $origin = $event['data']['object']['metadata']['origin'];
    $siren = $event['data']['object']['metadata']['siren'];
    $raison = $event['data']['object']['metadata']['raison'];

    if ($event['data']['object']['charges']['data'][0]['payment_method_details']['type'] == "card") {
      $moyen = "CB";
      $expirationCBMois = $event['data']['object']['charges']['data'][0]['payment_method_details']['card']['exp_month'];
      $expirationCBAnnee = $event['data']['object']['charges']['data'][0]['payment_method_details']['card']['exp_year'];
      $expirationDate = new DateTime();
      $expirationDate->setDate($expirationCBAnnee, $expirationCBMois, 1);
      $dateExpire = $expirationDate->format('Y-m-d');
      $sql2 = "update Personnes set dernierPaiement=current_timestamp, montant=" . $amount . " , source=\"site\", moyen = \"CB\" , expirationCB = STR_TO_DATE('" . $dateExpire . "', '%Y-%m-%d'), statut = 'actif' where stripe_cus_id in ('" . $customerId . "')";
    } else {
      $moyen = "IBAN";
      $sql2 = "update Personnes set dernierPaiement=current_timestamp, montant=" . $amount . " , source=\"site\", moyen = \"IBAN\" , statut = 'actif' where stripe_cus_id in ('" . $customerId . "')";
    }
    $sql3 = "insert into Dons_Ponctuels(asso,tracking,nom,prenom,montant,adresse,code_postal,ville,pays,email,source,amana,moyen,type,siren, raison, stripe_cus_id, stripe_sub_id, stripe_ch_id, stripe_desc,nomArbre) values(\"$asso\",\"$origin\",\"$last_name\",\"$first_name\",\"$amount\",\"$address_street\",\"$address_zip\",\"$address_city\",\"$address_country\",\"$payer_email\",\"site\",\"$amana\",\"$moyen\",\"$type\",\"$siren\",\"$raison\",\"$customerId\",\"$subId\",\"\",\"$description\",\"$nomArbre\")";
  } catch (Throwable $ex) {
    fwrite($fpStripeWebserviceMensuel, "\n Erreur globale pour "  . $customerId);
    fwrite($fpStripeWebserviceMensuel, $ex->getMessage());
    $fperror = fopen('log/error.log', 'a');
    $message = $ex->getMessage();
    $sql = "INSERT into Erreurs (asso,message,fonction,event,eventType) values ('$asso','$message','stripe_webservice.php-webMensuel','$eventId','$eventType')";
    upsert($sql, "stripe_webservice.php-webMensuel");
    fwrite($fperror, "\n************ Erreur dans la méthode : " . $method . strftime('%d/%m/%y %H:%M') . "************\n");
    fwrite($fperror, "\n Message : " . $message . "\n");
    fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
    fclose($fperror);
  }
  try {
    fwrite($fpStripeWebserviceMensuel, "***************Update BDD Donateurs mensuels******************");
    fwrite($fpStripeWebserviceMensuel, "\n\n");
    fwrite($fpStripeWebserviceMensuel, "Execution de la requête " . $sql2 . "\n");
    upsert($sql2, "stripe_webservice.php-webMensuel-Personnes");
  } catch (Throwable $ex) {
    fwrite($fpStripeWebserviceMensuel, "\n Don Mensuel : Impossible de mettre à jour Personnes pour " . $customerId);
    fwrite($fpStripeWebserviceMensuel, $ex->getMessage());
    $fperror = fopen('log/error.log', 'a');
    $message = $ex->getMessage();
    $sql = "INSERT into Erreurs (asso,message,fonction,event,eventType) values ('$asso','$message','stripe_webservice.php-webMensuel','$eventId','$eventType')";
    upsert($sql, "stripe_webservice.php-webMensuel");
    fwrite($fperror, "\n************ Erreur dans la méthode : " . $method . strftime('%d/%m/%y %H:%M') . "************\n");
    fwrite($fperror, "\n Message : " . $message . "\n");
    fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
    fclose($fperror);
  }

  try {
    fwrite($fpStripeWebserviceMensuel, "***************Insert BDD Donateurs Mensuels pour " . $customerId  . " *******************");
    fwrite($fpStripeWebserviceMensuel, "\n\n");
    fwrite($fpStripeWebserviceMensuel, "Execution de la requête " . $sql3 . "\n");
    upsert($sql3, "stripe_webservice.php-webMensuel-Dons_Ponctuels");
  } catch (Throwable $ex) {
    fwrite($fpStripeWebserviceMensuel, "\n Don Mensuels : Impossible de mettre à jour Dons_Ponctuels pour " . $customerId);
    fwrite($fpStripeWebserviceMensuel, $ex->getMessage());
    $fperror = fopen('log/error.log', 'a');
    $message = $ex->getMessage();
    $sql = "INSERT into Erreurs (asso,message,fonction,event,eventType) values ('$asso','$message','stripe_webservice.php-webMensuel','$eventId','$eventType')";
    upsert($sql, "stripe_webservice.php-webMensuel");
    fwrite($fperror, "\n************ Erreur dans la méthode : " . $method . strftime('%d/%m/%y %H:%M') . "************\n");
    fwrite($fperror, "\n Message : " . $message . "\n");
    fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
    fclose($fperror);
  } finally {
    fwrite($fpStripeWebserviceMensuel, "\n ############################ FIN TRANSACTION Don Mensuel " . $customerId . " ###############################");
    fclose($fpStripeWebserviceMensuel);
  }
}
function webPonctuel($event, $asso, $assoBdd)
{
  $eventId = $event['id'];
  $eventType = $event['type'];
  $ohmeClientName = getenv('OHME_CLIENT_NAME');
  $ohmeClientSecret = getenv('OHME_CLIENT_SECRET');
  $authorization = getenv('OHME_BASIC_BEARER');
  $adhesionYear = "2024";
  $montant = null;
  $payment_date = null;
  $payment_status = null;
  $payment_type = null;
  $nomArbre = $event['data']['object']['metadata']['nomArbre'];
  $customerId = $event['data']['object']['customer'];
  $address_street = $event['data']['object']['metadata']['line1'];
  $address_zip = $event['data']['object']['metadata']['postal_code'];
  $address_city = $event['data']['object']['metadata']['city'];
  $address_country = $event['data']['object']['metadata']['country'];
  $address_country_code = null;
  $payer_email = $event['data']['object']['metadata']['email'];
  $first_name = $event['data']['object']['metadata']['firstname'];
  $last_name = $event['data']['object']['metadata']['lastname'];
  $amana = $event['data']['object']['metadata']['campagne'];
  $demande_recu = $event['data']['object']['metadata']['recu'];
  $postal_code = $event['data']['object']['metadata']['postal_code'];
  $tel = $event['data']['object']['metadata']['tel'];
  $amount = $event['data']['object']['amount'];
  $amount = (int)$amount;
  $amount = $amount / 100;
  $siren = $event['data']['object']['metadata']['siren'];
  $raison = $event['data']['object']['metadata']['raison'];
  $txn_id = null;
  $addJSON = [];
  $conJSON = [];
  $payJSON = [];
  $jsonArrayResponse = [];
  $conIdJSON = [];
  $type = $event['type'];
  $object = $event['data']['object'];
  $isMosquee = $assoBdd[0]["isMosquee"];
  $demande_adresse = $assoBdd[0]["demande_adresse"];
  $asso_recu = $assoBdd[0]["recu"];
  $fpStripeWebservicePonctuel = fopen('log/stripewspl.log', 'a');
  $filename = "";
  if ($event['data']['object']['payment_method_details']['type'] == "card") {
    $payJSON["payment_method_name"] = "CB";
    $moyen = "CB";
  } else {
    $payJSON["payment_method_name"] = "IBAN";
    $moyen = "IBAN";
  };
  $datePayment = $event['created'];
  fwrite($fpStripeWebservicePonctuel, "\n\n");
  fwrite($fpStripeWebservicePonctuel, "############################ Asso " . $asso . " DEBUT TRANSACTION Don Ponctuel " . $event['data']['object']['metadata']['email'] . " ###############################");
  fwrite($fpStripeWebservicePonctuel, "\n\n");
  fwrite($fpStripeWebservicePonctuel, "***************Notification Stripe RECU*** " . strftime('%d/%m/%y %H:%M') . " ***************");
  fwrite($fpStripeWebservicePonctuel, "\n Evennement : \n");
  fwrite($fpStripeWebservicePonctuel, $event["id"] . "\n");
  try {
    if ($amana === "adhesion" || $amana === "cantine") {
      $demande_recu === "true";
    }
    if ($demande_recu === "true" || ($demande_adresse === "mandatory" && $asso_recu === "true")) {
      fwrite($fpStripeWebservicePonctuel, "Un reçu doit être généré. \n");
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
      $qualiteAsso = $assoBdd[0]["qualite"];
      $objetAsso = $assoBdd[0]["objet"];
      $logoAsso = $assoBdd[0]["logoUrl"];
      $contactAsso = $assoBdd[0]["email"];
      if ($amana == "adhesion") {
        $filename = adhesionPdf($first_name, $last_name, $address_street, $postal_code, $address_city, $nomAsso, $logoAsso, $adresseAsso, $villeAsso, $cpAsso, $contactAsso);
      } elseif ($amana == "cantine") {
        $sql2 = "SELECT * FROM Commandes where asso='$asso'";
        $cantineBdd = selectdb($sql2, "stripe_webservice.php-webponctuel");
        $totalQuantite = $cantineBdd[0]["total_quantite"];
        $livraison = $cantineBdd[0]["livraison"];
        $numeroFacture = "#F" . strtoupper(substr(uniqid(), -7));
      } else {
        $filename = recuFiscal($first_name, $last_name, $payer_email, $address_street, $raison, $siren, $address_city, $postal_code, $amount, $type, $datePayment, $moyen, "ponctuel", $uriAsso, $signatairePrenomAsso, $signataireNomAsso, $signataireSignAsso, $signataireRoleAsso, $nomAsso, $adresseAsso, $cpAsso, $villeAsso, $typeAsso, $qualiteAsso, $objetAsso, $logoAsso);
      }
    }

    /** Création du Prospect */
    $addJSON["street"] = $event['data']['object']['metadata']['line1'];
    $addJSON["post_code"] = $event['data']['object']['metadata']['postal_code'];
    $addJSON["country"] = $event['data']['object']['metadata']['country'];
    $addJSON["city"] = $event['data']['object']['metadata']['city'];
    $addJSON["street_prefix_1"] = null;
    $addJSON["street_prefix_2"] = null;
    $addJSON["street_2"] = null;

    $conJSON["email"] = $event['data']['object']['metadata']['email'];
    $conJSON["firstname"] = $event['data']['object']['metadata']['firstname'];
    $conJSON["lastname"] = $event['data']['object']['metadata']['lastname'];
    $conJSON["address"] = $addJSON;

    fwrite($fpStripeWebservicePonctuel, "\n\n");
    fwrite($fpStripeWebservicePonctuel, "***************Request  de la création du contact******************");
    fwrite($fpStripeWebservicePonctuel, "\n\n");
    fwrite($fpStripeWebservicePonctuel, json_encode($conJSON));
    fwrite($fpStripeWebservicePonctuel, "\n\n");

    $cURLConnectionContact = curl_init('https://api-ohme.oneheart.fr/api/v1/contacts');
    curl_setopt($cURLConnectionContact, CURLOPT_POSTFIELDS, json_encode($conJSON));
    curl_setopt($cURLConnectionContact, CURLOPT_HTTPHEADER, array(
      'Accept: application/json',
      'client-name: ' . $ohmeClientName,
      'client-secret: ' . $ohmeClientSecret,
      $authorization
    ));
    curl_setopt($cURLConnectionContact, CURLOPT_RETURNTRANSFER, true);
    $apiResponseContact = curl_exec($cURLConnectionContact);
    curl_close($cURLConnectionContact);
    fwrite($fpStripeWebservicePonctuel, "\n\n");
    fwrite($fpStripeWebservicePonctuel, "***************Réponse de la création du contact******************");
    fwrite($fpStripeWebservicePonctuel, "\n\n");
    fwrite($fpStripeWebservicePonctuel, $apiResponseContact);
    fwrite($fpStripeWebservicePonctuel, "\n\n");
    fwrite($fpStripeWebservicePonctuel, "***************idCon******************");
    fwrite($fpStripeWebservicePonctuel, "\n\n");
    $apiResponseContact = json_decode($apiResponseContact, true);
    $idCon = $apiResponseContact["data"]["id"];
    $conIdJSON["id"] = $idCon;
    fwrite($fpStripeWebservicePonctuel, $idCon);

    $payJSON["contact"] = $conIdJSON;
    $payJSON["payment_status"] = "confirmed";
    $payJSON["date"] = $datePayment;
    $payJSON["amount"] = $amount;
    $payJSON["payment_type_id"] = "1";
    $payJSON["donation_nature"] = "cash";
    $payJSON["donation_form"] = "manual";
    $payJSON["donator_nature"] = "individual";
    $payJSON["can_edit_receipt"] = true;
    $payJSON["payment_source_name"] = "aucoeurdelaprecarite.com";
    $payJSON["je_veux_un_recu"] = $event['data']['object']['metadata']['recu'];
    $payJSON["amana"] = $event['data']['object']['metadata']['campagne'];
    if ($event['data']['object']['metadata']['source'] == "Don Mensuel Stripe") {
      $payJSON["recurring"] = true;
    }

    fwrite($fpStripeWebservicePonctuel, "\n\n");
    fwrite($fpStripeWebservicePonctuel, "***************Request de la création du payment pour " . $emailAddress . " ******************");
    fwrite($fpStripeWebservicePonctuel, "\n\n");
    fwrite($fpStripeWebservicePonctuel, json_encode($payJSON));

    $cURLConnectionPayment = curl_init('https://api-ohme.oneheart.fr/api/v1/payments');
    curl_setopt($cURLConnectionPayment, CURLOPT_POSTFIELDS, json_encode($payJSON));
    curl_setopt($cURLConnectionPayment, CURLOPT_HTTPHEADER, array(
      'Accept: application/json',
      'client-name: ' . $ohmeClientName,
      'client-secret: ' . $ohmeClientSecret,
      $authorization
    ));
    curl_setopt($cURLConnectionPayment, CURLOPT_RETURNTRANSFER, true);
    $apiResponsePayment = curl_exec($cURLConnectionPayment);
    curl_close($cURLConnectionPayment);

    fwrite($fpStripeWebservicePonctuel, "\n\n");
    fwrite($fpStripeWebservicePonctuel, "***************Réponse de la création du payment pour " . $emailAddress . " *******************");
    fwrite($fpStripeWebservicePonctuel, "\n\n");
    fwrite($fpStripeWebservicePonctuel, $apiResponsePayment);
    $apiResponsePayment = json_decode($apiResponsePayment, true);

    fwrite($fpStripeWebservicePonctuel, "\n\n");
    fwrite($fpStripeWebservicePonctuel, "***************idPayment pour " . $emailAddress . " *******************");
    fwrite($fpStripeWebservicePonctuel, "\n\n");
    $idPay = $apiResponsePayment["data"]["id"];
    fwrite($fpStripeWebservicePonctuel, $idPay);
    fwrite($fpStripeWebservicePonctuel, "\n\n");
  } catch (Throwable $ex) {
    fwrite($fpStripeWebservicePonctuel, "\n Don Ponctuel : Impossible de mettre à jour Ohme pour " . $conJSON["email"]);
    fwrite($fpStripeWebservicePonctuel, $ex->getMessage());
    $fperror = fopen('log/error.log', 'a');
    $message = $ex->getMessage();
    $sql = "INSERT into Erreurs (asso,message,fonction,event,eventType) values ('$asso','$message','stripe_webservice.php-webPonctuel','$eventId','$eventType')";
    upsert($sql, "stripe_webservice.php-webPonctuel");
    fwrite($fperror, "\n************ Erreur dans la méthode : " . $method . strftime('%d/%m/%y %H:%M') . "************\n");
    fwrite($fperror, "\n Message : " . $message . "\n");
    fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
    fclose($fperror);
  }

  try {
    fwrite($fpStripeWebservicePonctuel, "***************Insert BDD Donateurs ponctuels pour " . $payer_email . " *******************");
    fwrite($fpStripeWebservicePonctuel, "\n");
    $addJSON["street"] = $event['data']['object']['metadata']['line1'];
    $addJSON["post_code"] = $event['data']['object']['metadata']['postal_code'];
    $addJSON["country"] = $event['data']['object']['metadata']['country'];
    $addJSON["city"] = $event['data']['object']['metadata']['city'];
    $addJSON["street_prefix_1"] = null;
    $addJSON["street_prefix_2"] = null;
    $addJSON["street_2"] = null;

    $conJSON["email"] = $event['data']['object']['metadata']['email'];
    $conJSON["firstname"] = $event['data']['object']['metadata']['firstname'];
    $conJSON["lastname"] = $event['data']['object']['metadata']['lastname'];
    $conJSON["address"] = $addJSON;
    $origin = $event['data']['object']['metadata']['origin'];
    $sql3 = "insert into Dons_Ponctuels(asso,tracking,nom,prenom,montant,adresse,code_postal,ville,pays,email,source,amana,demande_recu,moyen,siren,raison,tel,lien_recu,stripe_cus_id,nomArbre) values(\"$asso\",\"$origin\",\"$last_name\",\"$first_name\",\"$amount\",\"$address_street\",\"$address_zip\",\"$address_city\",\"$address_country\",\"$payer_email\",\"site\",\"$amana\",\"$demande_recu\",\"$moyen\",\"$siren\",\"$raison\",\"$tel\",\"$filename\",\"$customerId\",\"$nomArbre\")";
    fwrite($fpStripeWebservicePonctuel, "\n Execution de la requête " . $sql3 . "\n");
    upsert($sql3, "stripe_webservice.php-webPonctuel-Dons_Ponctuels");

    if ($amana == "cantine") {
      $livraison = $event['data']['object']['metadata']['livraison'];
      fwrite($fpStripeWebservicePonctuel, "\n Date de livraison l'ami " . $livraison . "\n");


      // Formater l'objet DateTime au format souhaité     
      $repasQuantite = $event['data']['object']['metadata']['repasQuantite'];
      $colisQuantite = $event['data']['object']['metadata']['colisQuantite'];
      $filename = cantineFacture($first_name, $last_name, $payer_email, $address_street, $address_city, $address_zip, $uriAsso, $nomAsso, $adresseAsso, $cpAsso, $villeAsso, $logoAsso, $tel, $signatairePrenomAsso, $signataireNomAsso, $totalQuantite, $colisQuantite, $repasQuantite, $moyen, $livraison, $numeroFacture);
      $assoCantine = $event['data']['object']['metadata']['assoCantine'];
      $total_quantite = $repasQuantite + $colisQuantite;

      $sql4 = "insert into Commandes(asso,livraison,repas_quantite,colis_quantite,tel,total_quantite,moyen,addresse,city,postal_code,total_prix,type,email) values(\"$assoCantine  \",STR_TO_DATE('$livraison', '%Y-%m-%d'),\"$repasQuantite\",\"$colisQuantite\",\"$tel\",\"$total_quantite\",\"$moyen\",\"$address_street\",\"$address_city\",\"$address_zip\",($repasQuantite + $colisQuantite)/2,'cantine',\"$payer_email\")";
      fwrite($fpStripeWebservicePonctuel, "\n Execution de la requête " . $sql4 . "\n");
      upsert($sql4, "stripe_webservice.php-webPonctuel-Dons_Ponctuels");
    }
  } catch (Throwable $ex) {
    fwrite($fpStripeWebservicePonctuel, "\n Don Ponctuel : Impossible de mettre à jour Dons_Ponctuels pour " . $payer_email);
    fwrite($fpStripeWebservicePonctuel, $ex->getMessage());
    $fperror = fopen('log/error.log', 'a');
    $message = $ex->getMessage();
    $sql = "INSERT into Erreurs (asso,message,fonction,event,eventType) values ('asso','$message','stripe_webservice.php-webPonctuel','$eventId','$eventType')";
    upsert($sql, "stripe_webservice.php-webPonctuel");
    fwrite($fperror, "\n************ Erreur dans la méthode : " . $method . strftime('%d/%m/%y %H:%M') . "************\n");
    fwrite($fperror, "\n Message : " . $message . "\n");
    fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
    fclose($fperror);
  }

  try {
    fwrite($fpStripeWebservicePonctuel, "\n ***************Request de l'envoi d'email à " . $payer_email . " ******************");
    fwrite($fpStripeWebservicePonctuel, "\n");
    //Envoi de l'email de confirmation au donateur
    if ($filename === "") {
      $variables["lienRecu"] = "";
    }
    if ($isMosquee === "oui") {
      $variables["campagne"] = "";
    } else {
      $variables["campagne"] = "Conformément à votre souhait ce don sera utilisé pour notre campagne " . $amana;
    }
    if ($amana == "cantine") {
      $jour = getNumeroJourSemaine($livraison);

      $sql = "select creneau_debut, creneau_fin from Quotas where day_of_week = $jour";
      fwrite($fpCantine, "\n Récupération du Créneau de cantine :  " . $sql . " \n");

      $creneau = selectDb($sql, "cantine.php-create-gratuit");
      $template = "cantine";
      $subject = "Confirmation de votre commande";
      $variables["numeroCommande"] = $numeroFacture;
      $variables["jourRecup"] = date("d-m-Y", strtotime($livraison));
      $variables["nbRepas"] = $repasQuantite;
      $variables["nbColis"] = $colisQuantite;
      $variables["lienFacture"] = "Vous trouverez votre facture en cliquant <b><a href=$filename>ici</a></b>";
      $variables["creneau"] = $creneau[0]["creneau_debut"] . " - " . $creneau[0]["creneau_fin"];

      sendEmailDonator($asso, $payer_email, $template, $subject, $variables, null);
    } elseif ($amana == "adhesion") {
      $template = "adhesion";
      $subject = "Confirmation de votre adhésion";
      $variables["adhesionYear"] = $adhesionYear;
      $variables["prenom"] = $first_name;
      $variables["lienCarte"] = "Vous trouverez votre carte d'adhérent en cliquant <a href=$filename><b>Ici</b></a>";
      $variables["monAsso"] = $uriAsso;
      $variables["logoUrl"] = "https://www.myamana.fr/assets/images/acmp.png";
      if ($asso === "mosquee-ar-rahma") {
        $variables["logoUrl"] = "https://www.myamana.fr/assets/images/arahma.png";
      }
      $variables["codeCouleur"] = $assoBdd[0]["codeCouleur"];
      sendEmailDonator($asso, $payer_email, $template, $subject, $variables, null);
    } elseif ($amana === "Plantez un arbre") {
      //Envoie du mail au partenaire
      $nbArbres = (int)$amount / 25;
      $template = "arbre";
      $subject = "Nouvelle commande - " . $prenom . " " . $nom . " " . $nbArbres . " arbres";
      $variables["prenom"] = $first_name;
      $variables["nom"] = $last_name;
      $variables["telephone"] = $tel;
      $variables["nb_arbres"] = $nbArbres;
      $variables["noms_arbres"] = $nomArbre;
      sendEmailDonator($asso, "tsiorinirinafanie@gmail.com", $template, $subject, $variables, null);

      $variables = [];
      $variables["campagne"] = "Conformément à votre souhait ce don sera utilisé pour notre campagne " . $amana;


      //Envoie du mail au donateur 
      $template = "ponctuel";
      $subject = "Confirmation de votre don ponctuel";
      $variables["prenom"] = $first_name;
      $variables["montant"] = $amount;
      if ($demande_recu === "true" || ($demande_adresse === "mandatory" && $asso_recu === "true")) {
        $variables["lienRecu"] = "Vous trouverez votre recu fiscal en cliquant <a href=$filename>ici</a>";
      } else {
        $variables["lienRecu"] = "";
      }
      sendEmailDonator($asso, $payer_email, $template, $subject, $variables, null);
    } elseif ($amana === "Adha" && $asso === "la-ruee-vers-l-eau") {
      //Envoie du mail au partenaire
      $nbSacrifices = (int)$amount / 129;
      fwrite($fpStripeWebservicePonctuel, " amount Adha = \n" . $amount . " nbSacrifices = " . $nbSacrifices);

      $template = "adhaRuee";
      $subject = "Nouvelle commande - " . $prenom . " " . $nom . " " . $nbSacrifices . " sacrifices ";
      $variables["prenom"] = $first_name;
      $variables["nom"] = $last_name;
      $variables["telephone"] = $tel;
      $variables["nb_sacrifices"] = $nbSacrifices;
      sendEmailDonator($asso, "tsiorinirinafanie@gmail.com", $template, $subject, $variables, null);

      $variables = [];
      $variables["campagne"] = "Conformément à votre souhait ce don sera utilisé pour notre campagne " . $amana;


      //Envoie du mail au donateur 
      $template = "ponctuel";
      $subject = "Confirmation de votre don ponctuel";
      $variables["prenom"] = $first_name;
      $variables["montant"] = $amount;
      if ($demande_recu === "true" || ($demande_adresse === "mandatory" && $asso_recu === "true")) {
        $variables["lienRecu"] = "Vous trouverez votre recu fiscal en cliquant <a href=$filename>ici</a>";
      } else {
        $variables["lienRecu"] = "";
      }
      sendEmailDonator($asso, $payer_email, $template, $subject, $variables, null);
    } else {
      $template = "ponctuel";
      $subject = "Confirmation de votre don ponctuel";
      $variables["prenom"] = $first_name;
      $variables["montant"] = $amount;
      if ($demande_recu === "true" || ($demande_adresse === "mandatory" && $asso_recu === "true")) {
        $variables["lienRecu"] = "Vous trouverez votre recu fiscal en cliquant <a href=$filename>ici</a>";
      } else {
        $variables["lienRecu"] = "";
      }
      sendEmailDonator($asso, $payer_email, $template, $subject, $variables, null);
    }
    fwrite($fpStripeWebservicePonctuel, "\n Email envoyé à " . $payer_email);
    //addContactMailjet($payer_email,"donateur_ponctuel");
  } catch (Throwable $ex) {
    fwrite($fpStripeWebservicePonctuel, "\n Don Ponctuel : Impossible d'envoyer un email à '" . $payer_email);
    fwrite($fpStripeWebservicePonctuel, $ex->getMessage());
    $fperror = fopen('log/error.log', 'a');
    $message = $ex->getMessage();
    $sql = "INSERT into Erreurs (asso,message,fonction,event,eventType) values ('$asso','$message','stripe_webservice.php-webPonctuel','$eventId','$eventType')";
    upsert($sql, "stripe_webservice.php-webPonctuel");
    fwrite($fperror, "\n************ Erreur dans la méthode : " . $method . strftime('%d/%m/%y %H:%M') . "************\n");
    fwrite($fperror, "\n Message : " . $message . "\n");
    fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
    fclose($fperror);
  } finally {
    fwrite($fpStripeWebservicePonctuel, "\n \n ############################ FIN TRANSACTION Don Ponctuel " . $payer_email . " ###############################");
    fclose($fpStripeWebservicePonctuel);
  }
}

function majSubId($event, $asso)
{
  $eventId = $event['id'];
  $eventType = $event['type'];
  $cusId = $event['data']['object']['customer'];
  $subId = $event['data']['object']['id'];
  $fpStripeWebserviceSubIdMaj = fopen('log/stripewssubidmaj.log', 'a');


  try {
    fwrite($fpStripeWebserviceSubIdMaj, "\n\n");
    fwrite($fpStripeWebserviceSubIdMaj, "############################  Asso " . $asso . " DEBUT Maj BDD customer " . $cusId . " et Subscription ID " . $subId . " ###############################");
    fwrite($fpStripeWebserviceSubIdMaj, "\n\n");
    fwrite($fpStripeWebserviceSubIdMaj, "***************Notification Stripe RECU*** " . strftime('%d/%m/%y %H:%M') . " ***************");
    fwrite($fpStripeWebserviceSubIdMaj, "\n\n");
    $sql = "update Personnes set stripe_sub_id= '" . $subId . "', statut='actif' where stripe_cus_id in ('" . $cusId . "') and asso = '" . $asso . "'";
    fwrite($fpStripeWebserviceSubIdMaj, "\n Execution de la requête " . $sql . "\n");
    upsert($sql, "stripe_webservice.php-majSubId");
  } catch (Exception $ex) {
    fwrite($fpStripeWebserviceSubIdMaj, "\n Impossible de mettre à jour le sub id  pour " . $cusId);
    fwrite($fpStripeWebserviceSubIdMaj, $ex->getMessage());
    $fperror = fopen('log/error.log', 'a');
    $message = $ex->getMessage();
    $sql = "INSERT into Erreurs (asso,message,fonction,event,eventType) values ('$asso','$message','stripe_webservice.php-majSubId','$eventId','$eventType')";
    upsert($sql, "stripe_webservice.php-majSubId");
    fwrite($fperror, "\n************ Erreur dans la méthode : " . $method . strftime('%d/%m/%y %H:%M') . "************\n");
    fwrite($fperror, "\n Message : " . $message . "\n");
    fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
    fclose($fperror);
  } finally {
    fwrite($fpStripeWebserviceSubIdMaj, "\n \n ############################ FIN TRANSACTION " . $cusId . " ###############################");
    fclose($fpStripeWebserviceSubIdMaj);
  }
}

function disableMensuelBDD($event, $asso)
{
  $eventId = $event['id'];
  $subId = $event['data']['object']['id'];
  $eventType = $event['type'];
  $fpStripeWebserviceDisableMensuel = fopen('log/stripewssubdisable.log', 'a');

  try {
    fwrite($fpStripeWebserviceDisableMensuel, "\n\n");
    fwrite($fpStripeWebserviceDisableMensuel, "############################  Asso " . $asso . " DEBUT Maj BDD Disable Mensuel " . $subId . " ###############################");
    fwrite($fpStripeWebserviceDisableMensuel, "\n\n");
    fwrite($fpStripeWebserviceDisableMensuel, "***************Notification Stripe RECU*** " . strftime('%d/%m/%y %H:%M') . " ***************");
    fwrite($fpStripeWebserviceDisableMensuel, "\n\n");
    $sql = "update Personnes set statut='inactif' where stripe_sub_id in ('" . $subId . "') and asso = '" . $asso . "'";
    fwrite($fpStripeWebserviceDisableMensuel, "\n Execution de la requête " . $sql . "\n");
    upsert($sql, "stripe_webservice.php/disableMensuel");
    $sql2 = "SELECT * FROM Personnes where stripe_sub_id = '$subId' and asso = '$asso' ";
    $personne = selectDB($sql2, "stripe_webservice.php/disableMensuel");
    $variables = [];
    $variables["prenom"] = $personne["prenom"];
    $variables["montant"] = $personne["montant"];
  } catch (Exception $ex) {
    fwrite($fpStripeWebserviceDisableMensuel, "\n Impossible de rendre inactif en bdd la souscription " . $subId);
    fwrite($fpStripeWebserviceDisableMensuel, $ex->getMessage());
    $fperror = fopen('log/error.log', 'a');
    $message = $ex->getMessage();
    $sql = "INSERT into Erreurs (asso,message,fonction,event,eventType) values ('$asso','$message','stripe_webservice.php-disableMensuelBDD','$eventId','$eventType')";
    upsert($sql, "stripe_webservice.php-disableMensuelBDD");
    fwrite($fperror, "\n************ Erreur dans la méthode : " . $method . strftime('%d/%m/%y %H:%M') . "************\n");
    fwrite($fperror, "\n Message : " . $message . "\n");
    fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
    fclose($fperror);
  } finally {
    fwrite($fpStripeWebserviceDisableMensuel, "\n \n ############################ FIN TRANSACTION " . $subId . " ###############################");
    fclose($fpStripeWebserviceDisableMensuel);
  }
}

function failedMensuel($event, $asso)
{
  $eventId = $event['id'];
  $eventType = $event['type'];
  $fpStripeWebserviceFailedMensuel = fopen('log/stripewsmsfailed.log', 'a');
  $cusId = $event['data']['object']['customer'];
  $errorCode = str_replace("'", "", $event['data']['object']['charges']['data'][0]['failure_code']);
  $errorDeclineCode = str_replace("'", "", $event['data']['object']['charges']['data'][0]['outcome']['reason']);
  $errorDeclineCode = str_replace('"', '', $errorDeclineCode);
  $errorRiskLevel = $event['data']['object']['charges']['data'][0]['outcome']['risk_level'];
  $errorMessage = str_replace("'", "", $event['data']['object']['charges']['data'][0]['outcome']['seller_message']);
  $errorMessage = str_replace('"', '', $errorMessage);


  try {
    fwrite($fpStripeWebserviceFailedMensuel, "\n\n");
    fwrite($fpStripeWebserviceFailedMensuel, "############################  Asso " . $asso . " DEBUT Maj BDD Failed Mensuel " . $cusId . " ###############################");
    fwrite($fpStripeWebserviceFailedMensuel, "\n\n");
    fwrite($fpStripeWebserviceFailedMensuel, "***************Notification Stripe RECU*** " . strftime('%d/%m/%y %H:%M') . " ***************");
    fwrite($fpStripeWebserviceFailedMensuel, "\n\n");
    $sql = "update Personnes set statut='failed', error_date=NOW(), error_code='$errorCode', error_decline_code='$errorDeclineCode', error_message='$errorMessage' where stripe_cus_id in ('$cusId') and asso = '$asso' and statut != 'inactif' ";
    fwrite($fpStripeWebserviceFailedMensuel, "\n Execution de la requête " . $sql . "\n");
    upsert($sql, "stripe_webservice.php-failedMensuel");
    $sql2 = "SELECT * FROM Personnes where stripe_cus_id = '$cusId' and asso = '$asso' ";
    fwrite($fpStripeWebserviceFailedMensuel, "\n Execution de la requête " . $sql2 . "\n");
    $personne = selectDB($sql2, "stripe_webservice.php/failedMensuel");
    $last4 = $personne[0]["last4"];
    $brand = $personne[0]["brand"];
    $montant = $personne[0]["montant"];
    $email = $personne[0]["email"];
    $subId = $personne[0]["stripe_sub_id"];
    $tracking = $personne[0]["tracking"];
    $ajout = $personne[0]["ajout"];
    $dernierPaiement = $personne[0]["dernierPaiement"];
    $recurrence = $personne[0]["recurrence"];
    $moyen = $personne[0]["moyen"];
    $prevExpirationCB = $personne[0]["prevExpirationCB"];
    $prenom = $personne[0]["prenom"];
    $nom = $personne[0]["nom"];



    $expirationCB = date("d/m/Y", strtotime($personne[0]["expirationCB"]));
    $url = getenv('URL_FINALISATION');
    $subject = "Echec de prélèvement de votre don de $montant euros";
    $variables = [];
    $errorMailSent = "";
    //ajouter l'envoi d'email au donateur pour l'informer de que son paiement est en echec
    if ($moyen == "IBAN") {
      $errorMailSent = "Votre compte iban ***$last4 a été refusé pour une raison inconnue.";
    } else {
      switch ($errorCode) {
        case "expired_card":
          $errorMailSent = "Votre CB $brand ***$last4 a expiré le $expirationCB";
          disableMensuel($subId, $asso, $eventId, $eventType, $errorMailSent);
          break;
        case "card_declined":
          switch ($errorDeclineCode) {
            case 'do_not_honor':
            case 'generic_decline':
            case 'transaction_not_allowed':
            case 'try_again_later':
            case 'previously_declined_do_not_retry': {
                $errorMailSent = "Votre CB $brand ***$last4 a été refusée pour une raison inconnue.";
                break;
              }
            case 'pickup_card':
            case 'restricted_card': {
                $errorMailSent = "Votre CB $brand ***$last4 a peut être été déclarée perdue ou changée.";
                disableMensuel($subId, $asso, $eventId, $eventType, $errorMailSent);
                break;
              }
            case 'stolen_card': {
                $errorMailSent = "Votre CB $brand ***$last4 a peut être été déclarée volée";
                disableMensuel($subId, $asso, $eventId, $eventType, $errorMailSent);
                break;
              }
            case 'insufficient_funds': {
                $errorMailSent = "Vous ne disposez pas de fonds suffisants ou votre plafond n\'est pas assez élevé.";
                break;
              }
            case 'invalid_account':
            case 'invalid_pin': {
                $errorMailSent = "Votre CB $brand ***$last4 ou le compte auquel elle est connecté n\'est pas valide";
                disableMensuel($subId, $asso, $eventId, $eventType, $errorMailSent);
                break;
              }
          }
          break;
        case "incorrect_number":
          $errorMailSent = "Le numéro de votre CB $brand ***$last4 est incorrect";
          disableMensuel($subId, $asso, $eventId, $eventType, $errorMailSent);
          break;
        default:
          $errorMailSent = "Votre CB $brand ***$last4 a été refusée pour une raison inconnue.";
      }
    }

    $errorMailSent = str_replace('"', '', $errorMailSent);
    $errorMailSent = str_replace("'", "", $errorMailSent);

    if ($personne[0]["occurence"] == "quotidien") {
      $variables["prenom"] = $prenom;
      $template = "SubscriptionError_quotidien";
      $variables["error_message"] = $errorMailSent;
      $variables["lienReinit"] = $url . "mensuel?asso=" . $asso . "&oldSubId=" . $personne[0]["stripe_sub_id"] . "&occurence=quotidien";
    } else {
      $variables["prenom"] = $prenom;
      $variables["montant"] = $montant;
      $template = "SubscriptionError";
      $variables["lienReinit"] = $url . "mensuel?asso=" . $asso . "&oldSubId=" . $personne[0]["stripe_sub_id"];
      $variables["error_message"] = $errorMailSent;
      $variables["feesSepa"] = "";
    }
    fwrite($fpStripeWebserviceFailedMensuel, "\n Erreur code " . $errorCode . "\n");
    fwrite($fpStripeWebserviceFailedMensuel, "\n Erreur Decline code " . $errorDeclineCode . "\n");
    sendEmailDonator($asso, $email, $template, $subject, $variables, null);

    $sql3 = "insert into Dons_Mensuel_Failed(asso,error_code,error_decline_code,error_message,error_mail_sent,risk_level,tracking,stripe_cus_id,stripe_sub_id,ajout,dernierPaiement,montant,recurrence,moyen,expirationCB,prevExpirationCB,last4,brand,nom,prenom,email,source) values(\"$asso\",\"$errorCode\",\"$errorDeclineCode\",\"$errorMessage\",\"$errorMailSent\",\"$errorRiskLevel\",\"$tracking\",\"$cusId\",\"$subId\",\"$ajout\",\"$dernierPaiement\",\"$montant\",\"$recurrence\",\"$moyen\",\"$expirationCB\",\"$prevExpirationCB\",\"$last4\",\"$brand\",\"$nom\",\"$prenom\",\"$email\",\"site\")";
    fwrite($fpStripeWebserviceFailedMensuel, "\n Execution de la requête " . $sql3 . "\n");
    upsert($sql3, "stripe_webservice.php-failedMensuel");

    $sql4 = "update Personnes set error_mail_sent=\"" . $errorMailSent . "\" where stripe_cus_id in ('$cusId') and asso = '$asso'";
    fwrite($fpStripeWebserviceFailedMensuel, "\n Execution de la requête " . $sql4 . "\n");
    upsert($sql4, "stripe_webservice.php-failedMensuel");
  } catch (Exception $ex) {
    fwrite($fpStripeWebserviceFailedMensuel, "\n Impossible de traiter l'erreur de mensualisation de " . $cusId);
    fwrite($fpStripeWebserviceFailedMensuel, $ex->getMessage());
    $fperror = fopen('log/error.log', 'a');
    $message = $ex->getMessage();
    $sql = "INSERT into Erreurs (asso,message,fonction,event,eventType) values ('$asso','$message','stripe_webservice.php-failedMensuel','$eventId','$eventType')";
    upsert($sql, "stripe_webservice.php-failedMensuel");
    fwrite($fperror, "\n************ Erreur dans la méthode : " . $method . strftime('%d/%m/%y %H:%M') . "************\n");
    fwrite($fperror, "\n Message : " . $message . "\n");
    fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
    fclose($fperror);
  } finally {
    fwrite($fpStripeWebserviceFailedMensuel, "\n \n ############################ FIN TRANSACTION " . $cusId . " ###############################");
    fclose($fpStripeWebserviceFailedMensuel);
  }
}

function disableMensuel($subId, $asso, $eventId, $eventType, $reason)
{
  $fpStripeWebserviceDisableMensuel = fopen('log/stripewssubdisable.log', 'a');

  try {
    fwrite($fpStripeWebserviceDisableMensuel, "\n\n");
    fwrite($fpStripeWebserviceDisableMensuel, "#############" . strftime('%d/%m/%y %H:%M') . "###############  Asso " . $asso . " DEBUT Maj BDD Disable Mensuel " . $subId . " ###############################");
    fwrite($fpStripeWebserviceDisableMensuel, "\n Annulation de la subscription " . $subId . "Event Type " . $eventType . " Event ID" . $eventId);
    global $stripe;
    $stripe->subscriptions->update(
      $subId,
      [
        'metadata' => [
          'reason' => $reason
        ]
      ]
    );

    $stripe->subscriptions->cancel($subId, []);
  } catch (Exception $ex) {
    fwrite($fpStripeWebserviceDisableMensuel, "\n Impossible de rendre inactif en bdd la souscription " . $subId) . " ";
    fwrite($fpStripeWebserviceDisableMensuel, $ex->getMessage());
    $fperror = fopen('log/error.log', 'a');
    $message = $ex->getMessage();
    $sql = "INSERT into Erreurs (asso,message,fonction,event,eventType) values ('$asso','$message','stripe_webservice.php-disableMensuel','$eventId','$eventType')";
    upsert($sql, "stripe_webservice.php-disableMensuel");
    fwrite($fperror, "\n************ Erreur dans la méthode : " . $method . strftime('%d/%m/%y %H:%M') . "************\n");
    fwrite($fperror, "\n Message : " . $message . "\n");
    fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
    fclose($fperror);
  } finally {
    fwrite($fpStripeWebserviceDisableMensuel, "\n \n ############################ FIN TRANSACTION " . $subId . " ###############################");
    fclose($fpStripeWebserviceDisableMensuel);
  }
}

$app->post('/terminator', function (Request $request, Response $response, array $args) {
  try {
    $fpTerminator = fopen('log/terminator.log', 'a');
    fwrite($fpTerminator, "#############" . strftime('%d/%m/%y %H:%M') . "###############  Debut Terminator ###############################");
    fwrite($fpTerminator, "\n\n");
    $sql = "select * from Personnes where occurence='quotidien' and year(ajout) > '2023' and asso='au-coeur-de-la-precarite' and quotidien_ok is null and terminator_email is null";
    $personnes = selectdb($sql, "stripe_webservice.php-terminator");
    $template = "finQuotidien";
    $subject = "Le meilleur pour la faim";
    $body = json_decode($request->getBody());
    $pub_key = $body->pub_key;
    $sql = "SELECT * FROM Assos where stripe_publishable_key='$pub_key' limit 1";
    $assoBdd = selectdb($sql, "stripe_webservice.php-stripe");
    $sec_key = $assoBdd[0]["stripe_secret_key"];
    global $stripe;
    $stripe = new \Stripe\StripeClient(
      $sec_key
    );
    $count = 0;
    foreach ($personnes as $key => $personne) {
      try {
        $count++;
        $subId = $personne["stripe_sub_id"];
        $prenom = $personne["prenom"];
        $asso = $personne["asso"];
        $email = $personne["email"];
        fwrite($fpTerminator, "\n Traitement " . $count . " / " . sizeof($personnes) . " subId = " . $subId . "\n");
        fwrite($fpTerminator, "\n subId : " . $subId);
        fwrite($fpTerminator, "\n prenom : " . $prenom);
        fwrite($fpTerminator, "\n email : " . $email);
        fwrite($fpTerminator, "\n\n");
        if ($subId !== "" || $subId !== null) {
          fwrite($fpTerminator, "\n Lancement de l'annulation \n");
          $stripe->subscriptions->cancel(
            $subId,
            []
          );
          $variables = [];
          $variables["prenom"] = $prenom;
          $variables["subId"] = $subId;
          sendEmailDonator($asso, $email, $template, $subject, $variables, null);
          $sql2 = "update Personnes set terminator_email=now() where stripe_sub_id ='$subId'";
          fwrite($fpTerminator, "Execution de la requête " . $sql2 . "\n");
          upsert($sql2, "stripe_webservice.php/terminator");
        } else {
          fwrite($fpTerminator, "\n SubId vide = pas d'annulation \n");
        }
      } catch (Exception $ex) {
        $error = array('result' => false, 'message' => 'Bad Request', 'dev' => '', 'data' => []);
        //return $response->withJson([ 'status' => 'error' ])->withStatus(500);
        $fperror = fopen('log/error.log', 'a');
        $message = $ex->getMessage();
        $sql = "INSERT into Erreurs (asso,message,fonction) values ('$asso','$message','stripe_webservice.php/terminator')";
        upsert($sql, "stripe_webservice.php/terminator");
        fwrite($fperror, "\n************ Erreur dans la méthode : stripe_webservice.php/terminator " . strftime('%d/%m/%y %H:%M') . "************\n");
        fwrite($fperror, "\n Message : " . $message . "\n");
        fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
        fclose($fperror);
      }
    }

    return $response->withJson(200);
  } catch (Exception $ex) {
    $error = array('result' => false, 'message' => 'Bad Request', 'dev' => '', 'data' => []);

    //return $response->withJson([ 'status' => 'error' ])->withStatus(500);
    $fperror = fopen('log/error.log', 'a');
    $message = $ex->getMessage();
    $sql = "INSERT into Erreurs (asso,message,fonction) values ('$asso','$message','stripe_webservice.php/terminator')";
    upsert($sql, "stripe_webservice.php/terminator");
    fwrite($fperror, "\n************ Erreur dans la méthode : stripe_webservice.php/terminator " . strftime('%d/%m/%y %H:%M') . "************\n");
    fwrite($fperror, "\n Message : " . $message . "\n");
    fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
    fclose($fperror);
    return $response->withJson($error, 500);
  }
});

$app->get('/doublonsMensuels', function (Request $request, Response $response, array $args) {
  try {
    $fpTerminator = fopen('log/terminator.log', 'a');
    fwrite($fpTerminator, "#############" . strftime('%d/%m/%y %H:%M') . "###############  Debut Doublons Mensuels ###############################");
    fwrite($fpTerminator, "\n\n");
    $sql = "select * from Feuille1";
    $personnes = selectdb($sql, "stripe_webservice.php-dounlonsMensuels");
    $template = "doublonsMensuels";
    $body = json_decode($request->getBody());
    foreach ($personnes as $key => $personne) {
      try {
        $count++;
        $codeCouleur = $personne["codeCouleur"];
        $logoUrl = $personne["logoUrl"];
        $asso = $personne["asso"];
        $email = $personne["email"];
        $lienRecu = $personne["lien_recu"];
        $prenom = $personne["prenom"];
        $nomAsso = $personne["nomAsso"];
        fwrite($fpTerminator, "\n Traitement " . $count . " / " . sizeof($personnes) . " email = " . $email . "\n");

        fwrite($fpTerminator, "\n logoUrl : " . $logoUrl);
        fwrite($fpTerminator, "\n prenom : " . $prenom);
        fwrite($fpTerminator, "\n asso : " . $asso);
        fwrite($fpTerminator, "\n\n");
        $variables = [];
        $variables["prenom"] = $prenom;
        $variables["codeCouleur"] = $codeCouleur;
        $variables["logoUrl"] = $logoUrl;
        $variables["monAsso"] = $asso;
        $variables["lienRecuFiscal"] = $lienRecu;
        $subject = "Erratum - Votre recu 2022 pour " . $nomAsso;
        sendEmailDonator($asso, $email, $template, $subject, $variables, null);
      } catch (Exception $ex) {
        $error = array('result' => false, 'message' => 'Bad Request', 'dev' => '', 'data' => []);
        //return $response->withJson([ 'status' => 'error' ])->withStatus(500);
        $fperror = fopen('log/error.log', 'a');
        $message = $ex->getMessage();
        $sql = "INSERT into Erreurs (asso,message,fonction) values ('$asso','$message','stripe_webservice.php/doublonsMensuels')";
        upsert($sql, "stripe_webservice.php/terminator");
        fwrite($fperror, "\n************ Erreur dans la méthode : stripe_webservice.php/terminator " . strftime('%d/%m/%y %H:%M') . "************\n");
        fwrite($fperror, "\n Message : " . $message . "\n");
        fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
        fclose($fperror);
      }
    }

    return $response->withJson(200);
  } catch (Exception $ex) {
    $error = array('result' => false, 'message' => 'Bad Request', 'dev' => '', 'data' => []);

    //return $response->withJson([ 'status' => 'error' ])->withStatus(500);
    $fperror = fopen('log/error.log', 'a');
    $message = $ex->getMessage();
    $sql = "INSERT into Erreurs (asso,message,fonction) values ('$asso','$message','stripe_webservice.php/terminator')";
    upsert($sql, "stripe_webservice.php/terminator");
    fwrite($fperror, "\n************ Erreur dans la méthode : stripe_webservice.php/terminator " . strftime('%d/%m/%y %H:%M') . "************\n");
    fwrite($fperror, "\n Message : " . $message . "\n");
    fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
    fclose($fperror);
    return $response->withJson($error, 500);
  }
});


$app->get('/mailjetRefresh', function (Request $request, Response $response, array $args) {
  $fpBddToMailejt = fopen('log/mailjetRefresh.log', 'a');
  fwrite($fpBddToMailejt, "\n************" . strftime('%d/%m/%y %H:%M') . "************");

  try {

    $datePayment = strftime('%d/%m/%y %H:%M');
    $sql = "SELECT * FROM Dons_Ponctuels WHERE source <> 'centrale' AND asso = 'au-coeur-de-la-precarite' AND ajout >= NOW() - INTERVAL 120 DAY AND ajout < NOW() - INTERVAL 90 DAY ORDER BY ajout ASC;";
    $personnes = selectDB($sql, "/mailjetRefresh");
    $nbPersonne = sizeof($personnes);

    if (!empty($personnes)) {

      // output data of each row
      for ($m = 0; $m < $nbPersonne; $m++) {
        fwrite($fpBddToMailejt, "\n\n");
        fwrite($fpBddToMailejt, "############################ DEBUT " . " / " . $personnes[$m] . " Traitement " . $personnes[$m]["prenom"] . " " . $personnes[$m]["email"] . " ###############################");
        fwrite($fpBddToMailejt, "\n\n");
        fwrite($fpBddToMailejt, "****** " . strftime('%d/%m/%y %H:%M') . " *****");
        fwrite($fpBddToMailejt, "\n\n");
        $isFitr = null;
        $isAdha = null;
        $isMaal = null;
        $isFondsGeneraux = null;
        $isPonctuel = null;
        $isMensuel = null;
        $isQuotidien = null;
        $isDrive = null;
        $isKaffara = null;

        /** Création du Prospect */

        $amana = $personnes[$m]["amana"];
        $type = $personnes[$m]["type"];
        $ajoutBDD = $personnes[$m]["ajout"];
        $ajoutTime = strtotime($ajoutBDD);
        $ajout = date('Y/m/d h:m:s', $ajoutTime);
        $email = $personnes[$m]["email"];
        $subId = $personnes[$m]["stripe_sub_id"];
        $cusId = $personnes[$m]["stripe_cus_id"];
        $moyen = $personnes[$m]["moyen"];
        $source = $personnes[$m]["source"];
        $conJSON["Name"] = $personnes[$m]["prenom"];
        $conJSON["Email"] = $email;
        $dataAmana = [];
        $dataType = [];
        $dataMoyen = [];
        $dataSource = [];

        $dataMoyen = array(
          "Name" => "moyen",
          "Value" => $moyen
        );

        $dataSource = array(
          "Name" => "source",
          "Value" => $source
        );

        $dataSubId = array(
          "Name" => "subId",
          "Value" => $subId
        );

        $dataCusId = array(
          "Name" => "cusId",
          "Value" => $cusId
        );

        $dataSubId = array(
          "Name" => "subid_mensuel",
          "Value" => $subId
        );

        $dataCusId = array(
          "Name" => "cusId",
          "Value" => $cusId
        );

        switch ($amana) {
          case "Fidya":
            $dataAmana = array(
              "Name" => "fidya",
              "Value" => $ajout
            );
            break;
          case "maal":
            $dataAmana = array(
              "Name" => "maal",
              "Value" => $ajout
            );
            break;
          case "fitr":
            $dataAmana = array(
              "Name" => "fitr",
              "Value" => $ajout
            );
            break;
          case "Aid El Adha":
            $dataAmana = array(
              "Name" => "adha",
              "Value" => $ajout
            );
            break;
          case "Adha":
            $dataAmana = array(
              "Name" => "adha",
              "Value" => $ajout
            );
            break;
          case "Fonds Spécifiques":
            $dataAmana = array(
              "Name" => "drive",
              "Value" => $ajout
            );
            break;
          case "Kaffara":
            $dataAmana = array(
              "Name" => "kaffara",
              "Value" => $ajout
            );
            break;
          default:
            $dataAmana = array(
              "Name" => "generaux",
              "Value" => $ajout
            );
        }

        switch ($type) {
          case "Ponctuel":
            $dataType = array(
              "Name" => "ponctuel",
              "Value" => $ajout
            );
            break;
          case "mensuel":
            $dataType = array(
              "Name" => "mensuel",
              "Value" => $ajout
            );
            break;
          case "quotidien":
            $dataType = array(
              "Name" => "quotidien",
              "Value" => $ajout
            );
            break;
          default:
            $dataType = array(
              "Name" => "ponctuel",
              "Value" => $ajout
            );
        }

        $data["Data"] = array($dataAmana, $dataType, $dataSubId, $dataCusId, $dataMoyen, $dataSource);
        fwrite($fpBddToMailejt, "\n\n");
        fwrite($fpBddToMailejt, "******Request  de la création du contact*******");
        fwrite($fpBddToMailejt, "\n\n");
        fwrite($fpBddToMailejt, json_encode($conJSON));
        fwrite($fpBddToMailejt, "\n\n");
        $mjBearerACDLP = getenv('MJ_BASIC_BEARER_ACDLP');
        $cURLConnectionContact = curl_init('https://api.mailjet.com/v3/REST/contact');
        curl_setopt($cURLConnectionContact, CURLOPT_POSTFIELDS, json_encode($conJSON));
        curl_setopt($cURLConnectionContact, CURLOPT_HTTPHEADER, array(
          'Content-Type: application/json',
          'Authorization: Basic ' . $mjBearerACDLP
        ));
        curl_setopt($cURLConnectionContact, CURLOPT_RETURNTRANSFER, true);
        $apiResponseContact = curl_exec($cURLConnectionContact);
        curl_close($cURLConnectionContact);
        $apiResponseContact = json_decode($apiResponseContact, true);
        fwrite($fpBddToMailejt, "\n\n");
        fwrite($fpBddToMailejt, "******Réponse de la création du contact*******");
        fwrite($fpBddToMailejt, "\n\n");
        fwrite($fpBddToMailejt, json_encode($apiResponseContact));
        fwrite($fpBddToMailejt, "\n\n");
        fwrite($fpBddToMailejt, "******idCon*******");
        fwrite($fpBddToMailejt, "\n\n");

        // $apiResponseContact = json_decode($apiResponseContact, true);
        $idCon = $apiResponseContact["Data"][0]["ID"];
        //$conIdJSON["id"]=$idCon;
        fwrite($fpBddToMailejt, "idCon : " . $idCon);



        fwrite($fpBddToMailejt, "\n\n");
        fwrite($fpBddToMailejt, "******Request  de la mise à jour des propriétés du contact*******");
        fwrite($fpBddToMailejt, "\n\n");
        fwrite($fpBddToMailejt, "Ajout Bdd : " . $ajoutBDD . "\n");
        fwrite($fpBddToMailejt, "Email : " . $email . "\n");
        fwrite($fpBddToMailejt, "Amana : " . $amana . "\n");
        fwrite($fpBddToMailejt, "Type : " . $type . "\n");
        fwrite($fpBddToMailejt, "Ajout : " . $ajout . "\n");
        fwrite($fpBddToMailejt, "Source : " . $source . "\n");
        fwrite($fpBddToMailejt, "Moyen : " . $moyen . "\n");
        fwrite($fpBddToMailejt, "Sub Id : " . $subId . "\n");
        fwrite($fpBddToMailejt, "Cus Id : " . $cusId . "\n");



        fwrite($fpBddToMailejt, json_encode($data));
        fwrite($fpBddToMailejt, "\n\n");
        $cURLConnectionContactData = curl_init('https://api.mailjet.com/v3/REST/contactdata/' . $email);
        curl_setopt($cURLConnectionContactData, CURLOPT_CUSTOMREQUEST, "PUT");
        curl_setopt($cURLConnectionContactData, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($cURLConnectionContactData, CURLOPT_HTTPHEADER, array(
          'Content-Type: application/json',
          'Authorization: Basic ' . $mjBearerACDLP
        ));
        curl_setopt($cURLConnectionContactData, CURLOPT_RETURNTRANSFER, true);
        /*
              curl_setopt($cURLConnectionContactData, CURLOPT_VERBOSE, true);
              $verbose = fopen('curl.log', 'w+');
              curl_setopt($cURLConnectionContactData, CURLOPT_STDERR, $verbose);
              */
        $apiResponseContactData = curl_exec($cURLConnectionContactData);
        curl_close($cURLConnectionContactData);
        $apiResponseContact = json_decode($apiResponseContactData, true);
        fwrite($fpBddToMailejt, "\n\n");
        fwrite($fpBddToMailejt, "******Réponse de la mise à jour des propriétés*******");
        fwrite($fpBddToMailejt, "\n\n");
        fwrite($fpBddToMailejt, json_encode($apiResponseContact));
        fwrite($fpBddToMailejt, "\n\n");

        $listJSON["ContactAlt"] = $conJSON["Email"];
        $listJSON["ListID"] = 2426772;

        $cURLConnectionList = curl_init('https://api.mailjet.com/v3/REST/listrecipient');
        curl_setopt($cURLConnectionList, CURLOPT_POSTFIELDS, json_encode($listJSON));
        curl_setopt($cURLConnectionList, CURLOPT_HTTPHEADER, array(
          'Content-Type: application/json',
          'Authorization: Basic ' . $mjBearerACDLP
        ));
        curl_setopt($cURLConnectionList, CURLOPT_RETURNTRANSFER, true);
        fwrite($fpBddToMailejt, "\n\n");
        fwrite($fpBddToMailejt, "******Request ajout du contact " . $listJSON["ContactAlt"] . " dans la liste " . $listJSON["ListID"] . "*******");
        fwrite($fpBddToMailejt, "\n\n");
        fwrite($fpBddToMailejt, json_encode($listJSON));
        //Ajout des logs curl
        /*
              curl_setopt($cURLConnectionList, CURLOPT_VERBOSE, true);
              $verbose = fopen('curl.log', 'w+');
              curl_setopt($cURLConnectionList, CURLOPT_STDERR, $verbose);
              */
        $apiResponseList = curl_exec($cURLConnectionList);
        curl_close($cURLConnectionList);

        fwrite($fpBddToMailejt, "\n\n");
        fwrite($fpBddToMailejt, "******Réponse de l'ajout du contact *******");
        fwrite($fpBddToMailejt, "\n\n");
        fwrite($fpBddToMailejt, $apiResponseList);
        $apiResponseList = json_decode($apiResponseList, true);
        fwrite($fpBddToMailejt, "\n\n");
      }
    } else {
      fwrite($fpBddToMailejt, "\n\n");
      fwrite($fpBddToMailejt, "****** " . strftime('%d/%m/%y %H:%M') . " *****");
      fwrite($fpBddToMailejt, "\n Aucun contact ponctuel à ajouter\n");
    }
  } catch (Exception $ex) {
    fwrite($fpBddToMailejt, "Erreur dans sessionEditMensuel");
    fwrite($fpBddToMailejt, $ex->getMessage());
    $fperror = fopen('log/error.log', 'a');
    $message = $ex->getMessage();
    $sql = "INSERT into Erreurs (asso,message,fonction) values ('bddToMailjet','$message','stripe_web_service.php/mailjetRefresh')";
    upsert($sql, "stripe_web_service.php/mailjetRefresh");
    fwrite($fperror, "\n************ Erreur dans la méthode : " . $method . strftime('%d/%m/%y %H:%M') . "************\n");
    fwrite($fperror, "\n Message : " . $message . "\n");
    fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
    fclose($fperror);
  } finally {
    fclose($fpBddToMailejt);
  }
});



$app->get('/updatemailjetRefresh', function (Request $request, Response $response, array $args) {
  try {
    $fpTerminator = fopen('log/mailjetRefresh.log', 'a');
    fwrite($fpTerminator, "#############" . strftime('%d/%m/%y %H:%M') . "###############  Debut Doublons Mensuels ###############################");
    fwrite($fpTerminator, "\n\n");
    $sql = "UPDATE mailjetRefresh m INNER JOIN Personnes p ON p.email = m.email SET m.cusId = p.stripe_cus_id, m.subId=p.stripe_sub_id,m.subid_mensuel=p.stripe_sub_id;";
    $personnes = upsert($sql, "stripe_webservice.php-updatemailjetRefresh");
  } catch (Exception $ex) {
    $error = array('result' => false, 'message' => 'Bad Request', 'dev' => '', 'data' => []);

    //return $response->withJson([ 'status' => 'error' ])->withStatus(500);
    $fperror = fopen('log/error.log', 'a');
    $message = $ex->getMessage();
    $sql = "INSERT into Erreurs (asso,message,fonction) values ('$asso','$message','stripe_webservice.php/terminator')";
    upsert($sql, "stripe_webservice.php/terminator");
    fwrite($fperror, "\n************ Erreur dans la méthode : stripe_webservice.php/terminator " . strftime('%d/%m/%y %H:%M') . "************\n");
    fwrite($fperror, "\n Message : " . $message . "\n");
    fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
    fclose($fperror);
    return $response->withJson($error, 500);
  }
});
