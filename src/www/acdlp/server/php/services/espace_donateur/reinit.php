<?php

use Slim\Http\Request;
use Slim\Http\Response;
use Stripe\Stripe;

require_once './services/utils.php';


/** Envoi d'un email de réinitialisation de mot de passe lors du formulaire dédié */
$app->post('/sendDemandeReinit', function (Request $request, Response $response, array $args) { 
 
    try {
        $url = getenv('URL_FINALISATION');

        $body = json_decode($request->getBody());
        $email = $body->email;
        $dbUser = getenv('DB_USER');

        $fpReinit= fopen('./log/reinit.log', 'a');
        fwrite($fpReinit, "************ Envoi email mot de passe oublie *" . strftime('%d/%m/%y %H:%M') . "***********\n");
        fwrite($fpReinit, "\n email : ".$email);
        $templateId = "bo_reinit";

        if($dbUser=='debi0288_testuser')
        {
            $subject="Test ACDLP - Réinitialisez votre mot-de-passe";
        }
        else
        {
            $subject="Reinitialisez votre mot-de-passe";
        }

        $sql = "SELECT prenom, password, email_encrypted FROM members WHERE email = '$email'";
        $personnes = selectDB($sql,"/sendDemandeReinit");

        /* Ajouter ici le cas ou le compte n'existe pas*/
        foreach ($personnes as $key => $personne)
        { 
            //Envoi d'un email au donateur
            $firstname=$personnes[0]["prenom"];
            $pass=$personne["password"];
            $email_encr=$personne["email_encrypted"];
            fwrite($fpReinit, "\nprenom : " .$firstname);
            fwrite($fpReinit, "\npass : " .$pass);
        }

        $variables=[];
        $variables["prenom"] = $firstname;
        $variables["lien_reinit_password"]=$url.'reinit?email='.$email_encr.'&?tok='.$pass;
        fwrite($fpReinit, "\nlien mot de passe oublie : ".$variables["lien_reinit_password"]."\n");
        fwrite($fpReinit, "\n Le prénom est: ". $firstname. " \n");
        sendEmailDonator('au-coeur-de-la-precarite',$email,$templateId, $subject, $variables,null);
        return $response->withJson(['personnes' => $personnes]);
    }
    catch(throwable $ex)
    {
        fwrite($fpReinit, $ex->getMessage());
        $fperror= fopen('log/error.log', 'a');
        $message = $ex->getMessage();
        $asso = $body->asso;
        $sql ="INSERT into Erreurs (asso,message,fonction) values ('$asso','reinit.php/sendDemandeReinit')";
        upsert($sql,"reinit.php/sendDemandeReinit");
        fwrite($fperror, "\n************ Erreur dans la méthode : " .$method. strftime('%d/%m/%y %H:%M') . "************\n");
        fwrite($fperror, "\n Message : " . $message . "\n");
        fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
        fclose($fperror);
    }
    finally{
        fclose($fpReinit);
    }
});

/** Mise à jour de la BDD avec le nouveau password via l'espace donateur ou le parcours de réinit*/
$app->post('/reinitMdp', function (Request $request, Response $response, array $args) { 
 
 try{
    $fpReinit= fopen('./log/reinit.log', 'a');
    fwrite($fpReinit, "\n************ Réinitialisation du password " . strftime('%d/%m/%y %H:%M') . "************\n");
    $body = json_decode($request->getBody());
    $isEmailCrypted=$body->isEmailCrypted;
    $pwd = $body->pwd;
    $email = $body->email;
    if($isEmailCrypted){
        fwrite($fpReinit, "\n email encrypté \n".$email."\n");
        $email = encrypt_decrypt($email, 'decrypt');
    }
    fwrite($fpReinit, "\n email clair \n".$email."\n");
    $pwd = encrypt_decrypt($pwd, 'encrypt');
    fwrite($fpReinit, "\n password encrypté \n".$pwd."\n");

    $sql = "UPDATE members SET password = '$pwd' WHERE email = '$email'";
    fwrite($fpReinit, "\n requete : ".$sql);
    upsert($sql,"/reinitMdp");
    
    return $response->withJson(["good"]);
    }
    catch(Throwable $e)
    {
        fwrite($fpReinit, $ex->getMessage());
        $fperror= fopen('log/error.log', 'a');
        $message = $ex->getMessage();
        $asso = $body->asso;
        $sql ="INSERT into Erreurs (asso,message,fonction) values ('$asso','reinit.php/reinitMdp')";
        upsert($sql,"reinit.php/reinitMdp");
        fwrite($fperror, "\n************ Erreur dans la méthode : " .$method. strftime('%d/%m/%y %H:%M') . "************\n");
        fwrite($fperror, "\n Message : " . $message . "\n");
        fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
        fclose($fperror);
    }
    finally{
        fclose($fpReinit);
    }
});


