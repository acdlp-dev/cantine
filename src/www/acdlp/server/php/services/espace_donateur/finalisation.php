<?php

use Slim\Http\Request;
use Slim\Http\Response;
use Stripe\Stripe;

require_once './services/utils.php';


$app->post('/finalisation', function (Request $request, Response $response, array $args) {

 
    $fpFinalisation = fopen('./log/finalisation.log', 'a');
    $body = json_decode($request->getBody());
    $email = $body->email;
    $email = encrypt_decrypt($email,'decrypt');
    fwrite($fpFinalisation, "\n ************ Finalisation de création de compte ". $email. " ". strftime('%d/%m/%y %H:%M') . "************\n");
    
    $sql = "SELECT actif FROM members WHERE email = '$email'";
    
    try{
        //faire un token 
        $statut = selectDB($sql,"finalisation.php/finalisation");
        
        if (empty($statut)) {
            fwrite($fpFinalisation, "\n Impossible d'activer le compte car il n'existe pas " . $email);
            return $response->withJson(false);
        } else {
            $sql2 = "UPDATE members SET actif = true WHERE email = '$email'";
            upsert($sql2,"finalisation.php/finalisation");
            fwrite($fpFinalisation, "\n Activation du compte ok " . $email);
            return $response->withJson(true);
        }
        
    }
    catch(Throwable $ex)
    {
        fwrite($fpFinalisation, $ex->getMessage());
        $fperror= fopen('log/error.log', 'a');
        $message = $ex->getMessage();
        $asso = $body->asso;
        $sql ="INSERT into Erreurs (asso,message,fonction) values ('$asso','finalisation.php/finalisation')";
        upsert($sql,"finalisation.php/finalisation");
        fwrite($fperror, "\n************ Erreur dans la méthode : " .$method. strftime('%d/%m/%y %H:%M') . "************\n");
        fwrite($fperror, "\n Message : " . $message . "\n");
        fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
        fclose($fperror);
    }
    finally{
        fclose($fpFinalisation);
    }
    
    });