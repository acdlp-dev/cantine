
<?php

use Slim\Http\Request;
use Slim\Http\Response;
use Stripe\Stripe;

require_once './services/utils.php';


$app->post('/get-meta', function (Request $request, Response $response, array $args) {
  
    try {
        $body = json_decode($request->getBody());
        $fpInfos= fopen('./log/infos_customer.log', 'a');
        fwrite($fpInfos, "************ Récupréation des infos du donateur" . strftime('%d/%m/%y %H:%M') . "************\n");
        fwrite($fpInfos, $body->email . "\n");
        $email = $body->email;
        $sql = "SELECT adresse, code_postal, amana, ville, pays, nom, prenom FROM Dons_Ponctuels WHERE email ='$email'";
        $personnes = selectDB($sql,"/get-meta");
        return $response->withJson(['resultat' => $personnes]);
    }
    catch(throwable $ex) {
        fwrite($fpInfos, $ex->getMessage());
        $fperror= fopen('log/error.log', 'a');
        $message = $ex->getMessage();
        $asso = $body->asso;
        $sql ="INSERT into Erreurs (asso,message,fonction) values ('$asso','member.php/get-meta')";
        upsert($sql,"member.php/get-meta");
        fwrite($fperror, "\n************ Erreur dans la méthode : " .$method. strftime('%d/%m/%y %H:%M') . "************\n");
        fwrite($fperror, "\n Message : " . $message . "\n");
        fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
        fclose($fperror);
    } finally {
        fclose($fpInfos);
    }

});

$app->post('/update-meta', function (Request $request, Response $response, array $args) {
    try {
        $body = json_decode($request->getBody());
        $prenom = $body->prenom;
        $nom = $body->nom;
        $adresse = $body->adresse;
        $ville = $body->ville;
        $codePostal = $body->codePostal;
        $pays = $body->pays;
        $email = $body->email;
        $sql = "UPDATE Dons_Ponctuels SET prenom = '$prenom' , nom =  '$nom', adresse = '$adresse', ville = '$ville', pays = '$pays', code_postal = '$codePostal' WHERE email = '$email'";
        $personnes = upsert($sql,"/update-meta");
    
        return $response->withJson("ok");
    }
    catch(throwable $ex) {
        $fperror= fopen('log/error.log', 'a');
        $message = $ex->getMessage();
        $asso = $body->asso;
        $sql ="INSERT into Erreurs (asso,message,fonction) values ('$asso','member.php/update-meta')";
        upsert($sql,"member.php/update-meta");
        fwrite($fperror, "\n************ Erreur dans la méthode : " .$method. strftime('%d/%m/%y %H:%M') . "************\n");
        fwrite($fperror, "\n Message : " . $message . "\n");
        fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
        fclose($fperror);
    }
});

$app->post('/getId', function (Request $request, Response $response, array $args) {
    $body = json_decode($request->getBody());
    $email = $body->email;
    $sql = "SELECT stripe_cus_id FROM Personnes WHERE email ='$email'";
    $personnes = selectDB($sql,"/getId");
    return $response->withJson(['resultat' => $personnes]);

});

$app->post('/data-member', function (Request $request, Response $response, array $args) {

    $body = json_decode($request->getBody());
    $emailEncrypted = $body->emailEncrypted;
    $email=encrypt_decrypt($emailEncrypted,"decrypt");
    $type = $body->type;
    $sql = "SELECT asso, ajout, montant, amana, moyen, nom, prenom, code_postal, adresse, ville, pays  FROM Dons_Ponctuels WHERE email = '$email' AND type = '$type'";
    $personnes = selectDB($sql,"/data-member");
    return $response->withJson(['resultat' => $personnes]);
});

$app->post('/get-email-decrypted', function (Request $request, Response $response, array $args) {
    try {

        $body = json_decode($request->getBody());
        $email = $body->email;
        $email = encrypt_decrypt($email,'decrypt');
        $fpInfos= fopen('log/infos_customer.log', 'a');
        $sql = "SELECT password, email FROM members WHERE email = '$email'";
        $personnes = selectDB($sql,"/get-email-decrypted");
        fwrite($fpInfos, "************" . strftime('%d/%m/%y %H:%M') . "************\n");
        fwrite($fpInfos, "\n requete sql : ".$sql);
        fwrite($fpInfos, "\n email encrypté :". $body->email."\n");
        fwrite($fpInfos, "\n email décrypté :". $personnes[0]["email"]."\n");
        fwrite($fpInfos, "\n password encrypté :". $personnes[0]["password"]."\n");


        return $response->withJson(['resultat' => $personnes]);
    }
    catch(Exception $ex) {
    fwrite($fpInfos, $ex->getMessage());
    $fperror= fopen('log/error.log', 'a');
    $message = $ex->getMessage();
    $asso = $body->asso;
    $sql ="INSERT into Erreurs (asso,message,fonction) values ('$asso','member.php/get-email-decrypted')";
    upsert($sql,"member.php/get-email-decrypted");
    fwrite($fperror, "\n************ Erreur dans la méthode : " .$method. strftime('%d/%m/%y %H:%M') . "************\n");
    fwrite($fperror, "\n Message : " . $message . "\n");
    fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
    fclose($fperror);
    } 
    finally {
    fclose($fpInfos);
    }
});

$app->post('/get-donateur-by-sub-id', function (Request $request, Response $response, array $args) {
    try {

        $body = json_decode($request->getBody());
        $oldSubId = $body->oldSubId;
        $fpInfos= fopen('log/infos_customer.log', 'a');
        $nobody=false;
        $sql = "SELECT montant, prenom, nom, email FROM Personnes WHERE stripe_sub_id = '$oldSubId'";
        $personnes = selectDB($sql,"/get-donateur-by-sub-id");
        fwrite($fpInfos, "************" . strftime('%d/%m/%y %H:%M') . "************\n");
        fwrite($fpInfos, "\n requete sql : ".$sql);
        fwrite($fpInfos, "\n oldSubId :". $oldSubId."\n");
        if(empty($personnes)){
            $nobody=true;
        }
        fwrite($fpInfos, "\n Personnes :". print_r($personnes,true)."\n");
        return $response->withJson(['resultat' => $personnes,'nobody' => $nobody]);
    }
    catch(throwable $ex) {
        fwrite($fpInfos, $ex->getMessage());
        $fperror= fopen('log/error.log', 'a');
        $message = $ex->getMessage();
        $asso = $body->asso;
        $sql ="INSERT into Erreurs (asso,message,fonction) values ('$asso','member.php/get-donateur-by-sub-id')";
        upsert($sql,"member.php/get-donateur-by-sub-id");
        fwrite($fperror, "\n************ Erreur dans la méthode : " .$method. strftime('%d/%m/%y %H:%M') . "************\n");
        fwrite($fperror, "\n Message : " . $message . "\n");
        fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
        fclose($fperror);
    } 
    finally {
        fclose($fpInfos);
    }
});

$app->post('/get-subscription', function (Request $request, Response $response, array $args) {
    try {

        $body = json_decode($request->getBody());
        $emailEncrypted = $body->emailEncrypted;
        $email=encrypt_decrypt($emailEncrypted,"decrypt");
        $fpInfos= fopen('log/infos_customer.log', 'a');
        $nobody=false;
        $sql = "SELECT montant, moyen, prenom, nom, email, montant, recurrence, last4, brand, stripe_sub_id, statut FROM Personnes WHERE email = '$email' order by id desc limit 1";
        $personnes = selectDB($sql,"/get-subscription");
        fwrite($fpInfos, "************" . strftime('%d/%m/%y %H:%M') . "************\n");
        fwrite($fpInfos, "\n requete sql : ".$sql);
        if(empty($personnes)){
            $nobody=true;
        }

        return $response->withJson(['resultat' => $personnes,'nobody' => $nobody]);
    }
    catch(throwable $ex) {
        fwrite($fpInfos, $ex->getMessage());
        $fperror= fopen('log/error.log', 'a');
        $message = $ex->getMessage();
        $asso = $body->asso;
        $sql ="INSERT into Erreurs (asso,message,fonction) values ('$asso','member.php/get-subscription')";
        upsert($sql,"member.php/get-subscription");
        fwrite($fperror, "\n************ Erreur dans la méthode : " .$method. strftime('%d/%m/%y %H:%M') . "************\n");
        fwrite($fperror, "\n Message : " . $message . "\n");
        fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
        fclose($fperror);
    } 
    finally {
        fclose($fpInfos);
    }
});
