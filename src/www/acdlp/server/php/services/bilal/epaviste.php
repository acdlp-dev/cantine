<?php

use Slim\Http\Request;
use Slim\Http\Response;

$app->get('/getVille2', function (Request $request, Response $response, array $args) {

    $fpUrgence = fopen('log/urgence.log', 'a');
    try {
        fwrite($fpUrgence, "Request Body: ");

        $sql="select ville_code_postal FROM villes";
        $villes = selectDB($sql, "/getVille2");

        echo $villes;


    } catch (Exception $ex) {
        $error = array('result' => false, 'message' => 'Bad Request', 'dev' => '', 'data' => []);
        $fperror = fopen('log/error.log', 'a');
        $message = $ex->getMessage();
        $sql = "INSERT into Erreurs (asso,message,fonction) values ('$asso','$message','ponctuel.php/configAssosPortail')";
        upsert($sql, "portail.php/configAssosPortail");
        fwrite($fperror, "\n************ Erreur dans la méthode : " . $method . strftime('%d/%m/%y %H:%M') . "************\n");
        fwrite($fperror, "\n Message : " . $message . "\n");
        fwrite($fperror, "\n Requête à exécuter :  " . $sql . "\n");
        fclose($fperror);
        return $response->withJson(['status' => 'error'])->withStatus(500);
    }
});
