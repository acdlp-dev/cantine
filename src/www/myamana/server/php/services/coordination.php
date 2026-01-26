<?php

use Slim\Http\Request;
use Slim\Http\Response;

$app->post('/urgenceAsso', function (Request $request, Response $response,array $args) {

  $fpUrgence = fopen('log/urgenceMaroc.log', 'a');
  try{
    $body = json_decode($request->getBody());
    $association_name=$body->association_name;
    $telephone=$body->telephone;
    $siege=$body->siege;
    $zone=$body->zone;
    $operation=$body->operation;
    $sql = "INSERT INTO Markers (association_name, telephone, siege, zone) 
    VALUES ('$association_name', '$telephone','$siege','$zone')";
    fwrite($fpUrgence, "\n Requete SQL : " . $sql);

    upsert($sql, 'urgence-maroc.php-urgence');

    return $response->withJson(['results'=> $siege]);
    }
  catch (Exception $ex) {
      $error = array('result' => false, 'message' => 'Bad Request', 'dev'=>'', 'data' => []);
      $fperror= fopen('log/error.log', 'a');
      $message = $ex->getMessage();
      $sql ="INSERT into Erreurs (asso,message,fonction) values ('$asso','$message','ponctuel.php/configAssosPortail')";
      upsert($sql,"portail.php/configAssosPortail");
      fwrite($fperror, "\n************ Erreur dans la méthode : " .$method. strftime('%d/%m/%y %H:%M') . "************\n");
      fwrite($fperror, "\n Message : " . $message . "\n");
      fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
      fclose($fperror);
      fwrite($fpJira, "erreurr");
      return $response->withJson([ 'status' => 'error' ])->withStatus(500);
    }
}); 

$app->post('/markers', function (Request $request, Response $response,array $args) {

  $fpUrgence = fopen('log/urgenceMaroc.log', 'a');
  try{
    $body = json_decode($request->getBody());
    $operation=$body->operation;
    $sql = "select * from Markers where statut ='validated' and operation='$operation'";
    $assos = selectDb($sql, 'urgence-maroc.php-urgence');

    return $response->withJson(['results'=> $assos]);
    }
  catch (Exception $ex) {
      $error = array('result' => false, 'message' => 'Bad Request', 'dev'=>'', 'data' => []);
      $fperror= fopen('log/error.log', 'a');
      $message = $ex->getMessage();
      $sql ="INSERT into Erreurs (asso,message,fonction) values ('$asso','$message','ponctuel.php/configAssosPortail')";
      upsert($sql,"portail.php/configAssosPortail");
      fwrite($fperror, "\n************ Erreur dans la méthode : " .$method. strftime('%d/%m/%y %H:%M') . "************\n");
      fwrite($fperror, "\n Message : " . $message . "\n");
      fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
      fclose($fperror);
      fwrite($fpJira, "erreurr");
      return $response->withJson([ 'status' => 'error' ])->withStatus(500);
    }
}); 

$app->post('/dataActus', function (Request $request, Response $response,array $args) {

  $fpUrgence = fopen('log/urgenceMaroc.log', 'a');
  try{
    $body = json_decode($request->getBody());
    $operation=$body->operation;
    $sql = "select * from Actus where operation ='$operation' order by ajout desc";
    $actus = selectDb($sql, 'urgence-maroc.php-urgence');

    return $response->withJson(['results'=> $actus]);
    }
  catch (Exception $ex) {
      $error = array('result' => false, 'message' => 'Bad Request', 'dev'=>'', 'data' => []);
      $fperror= fopen('log/error.log', 'a');
      $message = $ex->getMessage();
      $sql ="INSERT into Erreurs (asso,message,fonction) values ('$asso','$message','ponctuel.php/configAssosPortail')";
      upsert($sql,"portail.php/configAssosPortail");
      fwrite($fperror, "\n************ Erreur dans la méthode : " .$method. strftime('%d/%m/%y %H:%M') . "************\n");
      fwrite($fperror, "\n Message : " . $message . "\n");
      fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
      fclose($fperror);
      fwrite($fpJira, "erreurr");
      return $response->withJson([ 'status' => 'error' ])->withStatus(500);
    }
}); 





