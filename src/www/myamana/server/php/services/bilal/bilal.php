<?php

use Slim\Http\Request;
use Slim\Http\Response;

$app->post('/postBilal', function (Request $request, Response $response, array $args) {

    $fpUrgence = fopen('log/urgence.log', 'a');
    try {
        fwrite($fpUrgence, "Request Body: " . $request->getBody());

        $body = json_decode($request->getBody());
        $association_name = $body->association_name;
        $email = $body->email;
        $telephone = $body->telephone;
        $zone = $body->zone;
        $password = $body->password;

        $sql = "INSERT INTO Assos_colis (association,email,telephone,zone,password) 
        VALUES (\"$association_name\", \"$email\",\"$telephone\", \"$zone\", \"$password\" )";
        upsert($sql, "bilal.php/postBilal");
        fwrite($fpUrgence, $sql);

        
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


$app->get('/getVille', function (Request $request, Response $response, array $args) {

    $fpUrgence = fopen('log/urgence.log', 'a');
    try {
        fwrite($fpUrgence, "Request Body: ");

        $sql="select ville_code_postal FROM villes";
        $villes = selectDB($sql, "/getVille");

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