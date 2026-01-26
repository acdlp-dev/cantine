<?php

use Slim\Http\Request;
use Slim\Http\Response;
use Stripe\Stripe;

require_once './services/utils.php';

$app->post('/signup', function (Request $request, Response $response, array $args) { 

    try{

        $fpSignup= fopen('./log/createmember.log', 'a');
        fwrite($fpSignup, "\n************ Création d'un membre " . strftime('%d/%m/%y %H:%M') . "************\n");

        $url = getenv('URL_FINALISATION');
        $body = json_decode($request->getBody());
        $firstname = $body->firstname;
        $lastname = $body->lastname;
        $password = $body->password;
        $siren = $body->siren;

        if($siren === "na"){
            $role= "utilisateur";
            fwrite($fpSignup, "\n************ Création d'un utilisateur " . strftime('%d/%m/%y %H:%M') . $role."************\n");
        }else{
            $role= "association";
            fwrite($fpSignup, "\n************ Création d'une association " . strftime('%d/%m/%y %H:%M') . $role. "************\n");
        }
        $password_encr = encrypt_decrypt( $body->password, 'encrypt');
        $email = $body->email;
        $email_encr = encrypt_decrypt($email,'encrypt');
        $tod = date('Y-m-d H:i:s');

        fwrite($fpSignup, "\n************ Création d'un membre " . strftime('%d/%m/%y %H:%M') . "************\n");
        fwrite($fpSignup, $firstname." ".$lastname."\n");
        fwrite($fpSignup, "\n email : ".$email."\n");

        $sql = "SELECT prenom, password FROM members WHERE email = '$email' and siren ='$siren'";
        $personnes = selectDB($sql,"/signup");
        fwrite($fpSignup, "Requête : " . $sql . " \n resultat :". $personnes[0]["password"]."\n");

        if(empty($personnes))
        {
            $sql2 ="INSERT into members(nom, prenom, email, email_encrypted, password, actif, siren, role) values (\"$lastname\",\"$firstname\",\"$email\",\"$email_encr\",\"$password_encr\", 0,\"$siren\",\"$role\")";
            upsert($sql2,"signup");
            $dbUser = getenv('DB_USER');

            $template = 5536946;
            if($dbUser=='debi0288_testuser')
            {
                $subject="MY AMANA - Activer votre compte";
            }
            else
            {
                $subject="Activer votre compte";
            }
            //Envoi d'un email au donateur
            $variables=[];
            $variables["lien_finalisation"]=$url.'finalisation?email='.$email_encr."&?tok=".$password_encr;
            fwrite($fpSignup, "\n envoie lien de finalisation : ".$variables["lien_finalisation"]);
            sendEmail($email,$template, $subject, $variables,null);
        } else {
            $dbUser = getenv('DB_USER');
            fwrite($fpSignup, $email. "\n tente de créer un compte déjà existant : ");
            $template = 5536948;
            if($dbUser=='debi0288_testuser')
            {
                $subject="MY AMANA - Réinitialisez votre mot-de-passe";
            }
            else
            {
                $subject="Votre compte existe déjà - Réinitialisez votre mot-de-passe";
            }
            $variables=[];
            $variables["prenom"] = $firstname;
            $variables["lien_reinit_password"]=$url.'reinit?email='.$email_encr."&?tok=".$personnes[0]["password"];
            fwrite($fpSignup, "\nlien mot de passe oublie : ".$variables["lien_reinit_password"]);
            sendEmailDonator("au-coeur-de-la-precarite", $email,$template, $subject, $variables,null);
        }
        return $response->withJson(["good"]);
    }
    catch(throwable $ex)
    {
        fwrite($fpSignup, $ex->getMessage());
        $fperror= fopen('log/error.log', 'a');
        $message = $ex->getMessage();
        $asso = $body->asso;
        $sql ="INSERT into Erreurs (asso,message,fonction) values ('$asso','signup.php/signup')";
        upsert($sql,"signup.php/signup");
        fwrite($fperror, "\n************ Erreur dans la méthode : " .$method. strftime('%d/%m/%y %H:%M') . "************\n");
        fwrite($fperror, "\n Message : " . $message . "\n");
        fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
        fclose($fperror);
    }
    finally{
        fclose($fpSignup);
    }
    
});

