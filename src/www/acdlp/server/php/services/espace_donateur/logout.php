<?php
session_start();

use Slim\Http\Request;
use Slim\Http\Response;

require_once './services/utils.php';

$app->get('/logout', function (Request $request, Response $response, array $args) {

    try {
        $fpSignin = fopen('./log/connexion.log', 'a');
        fwrite($fpSignin, "\n Déconnexion de " . $_SESSION['user_email']);


        // Détruire la session et autres opérations de nettoyage
        session_unset();
        session_destroy();
        return $response->withJson(["status" => "success"]);
    } catch(throwable $ex) {
        fwrite($fpSignin, $ex->getMessage());
        $fperror= fopen('log/error.log', 'a');
        $message = $ex->getMessage();
        $asso = $body->asso;
        $sql ="INSERT into Erreurs (asso,message,fonction) values ('$asso','logout.php/logout')";
        upsert($sql,"signin.php/signin");
        fwrite($fperror, "\n************ Erreur dans la méthode : logout " . strftime('%d/%m/%y %H:%M') . "************\n");
        fwrite($fperror, "\n Message : " . $message . "\n");
        fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
        fclose($fperror);
    } finally {
        fclose($fpSignin);
    }
});