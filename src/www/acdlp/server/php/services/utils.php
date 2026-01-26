<?php
use Slim\Http\Request;
use Slim\Http\Response;
use Stripe\Stripe;
use PHPLicengine\Api\Api;
use PHPLicengine\Service\Bitlink;

function selectDB($sql,$method)
{

  try{

    set_time_limit(600);
    $dbHost = getenv('DB_HOST');
    $dbUser = getenv('DB_USER');
    $dbName = getenv('DB_NAME');
    $dbPWD = getenv('DB_PASSWORD');
    $env = getenv('URL_FINALISATION');
    $fpFlag = fopen('log/flagEmail.log','a');
    $fpCreateBDD= fopen('log/bdd.log','a');//opens file in append mode or create it
    //$fptaille=filesize("log/flagEmail.log");
    fwrite($fpCreateBDD, "\n ***************Demande reçu de *** " . $method . "  " . strftime('%d/%m/%y %H:%M:%s:%u') ." ***************");
    fwrite($fpCreateBDD, "\n Requête à éxécuter : " . $sql . " sur la base " . $dbHost . $dbName . "\n" );

    if ($con = mysqli_connect($dbHost, $dbUser, $dbPWD,$dbName))
    { 
      $con->query("SET NAMES 'utf8mb4'");
      $personnes=[];
      if ($result = mysqli_query($con, $sql))
      { 
        $personnes = mysqli_fetch_all($result, MYSQLI_ASSOC);
      }
      else
      {
        throw new Exception("Impossible d'effectuer la requête ". mysqli_error($con), 1);
      }
    }
    else
    {
      throw new Exception("Failed to connect to MySQL: " . mysqli_connect_error($con), 1);
    }

  }
  catch(Exception $ex)
  {
      $env = getenv('URL_FINALISATION');
      fwrite($fpCreateBDD, "\n Erreur MySql " .$ex->getMessage());
      //if ($fptaille==0){
      fwrite ($fpFlag, "coucou");
      $variables= [];
      $variables["env"]= $env." " . $method;
      $variables["error_bdd"]= "\n Erreur MySql " .$ex->getMessage();
      $variables["sql"]= $sql;
      if ($env === "https://www.myamana.fr/"){
        sendEmail("rachidboulsane@gmail.com",4098306,"Erreur dans la base de données ".$env,$variables,null);
      }
      $fperror= fopen('log/error.log', 'a');
      $message = $ex->getMessage();
      fwrite($fperror, "\n************ Erreur dans la méthode : " .$method. strftime('%d/%m/%y %H:%M') . "************\n");
      fwrite($fperror, "\n Message : " . $message . "\n");
      fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
      fclose($fperror);

    //} 
  } 
  finally{
    mysqli_close($con);
    fclose($fpCreateBDD);  
  }
  return $personnes;
}

function upsert($sql,$method)
{
  try{
    
    set_time_limit(600);
    $dbHost = getenv('DB_HOST');
    $dbUser = getenv('DB_USER');
    $dbName = getenv('DB_NAME');
    $dbPWD = getenv('DB_PASSWORD');
    $env = getenv('URL_FINALISATION');
    $fpCreateBDD= fopen('log/bdd.log','a');//opens file in append mode or create it
    //$fptaille=filesize("log/flagEmail.log");
    fwrite($fpCreateBDD, "\n ***************Demande reçu*** " . $method . "  " .strftime('%d/%m/%y %H:%M:%s%u') ." ***************");
    fwrite($fpCreateBDD, "\n Requête à éxécuter : " . $sql . " sur la base " . $dbHost . $dbName . " \n");
    
    if ($con = mysqli_connect($dbHost, $dbUser, $dbPWD,$dbName))
    {  
      $con->query("SET NAMES 'utf8mb4'");
      if (mysqli_query($con, $sql))
      { 
        $last_id = mysqli_insert_id($con);
        fwrite($fpCreateBDD, "\n BDD mise à jour last id : '$last_id' \n");
        return $last_id;
      }
      else
      {
        throw new Exception("Impossible d'effectuer la requête ". mysqli_error($con), 1);
      }
    }
    else
    {
      throw new Exception("Failed to connect to MySQL: " . mysqli_connect_error($con), 1);
    }
    
  }
    
  catch(Exception $ex)
  {
    fwrite($fpCreateBDD, "\n Erreur MySql " .$ex->getMessage());
    //if ($fptaille==0){
      $variables= [];
      $variables["error_bdd"]= "\n Erreur MySql " .$ex->getMessage();
      $variables["env"]= $env." " . $method;
      $variables["sql"]= $sql;
      if ($env === "https://www.myamana.fr/"){
        sendEmail("rachidboulsane@gmail.com",4098306,"Erreur dans la base de données ".$env,$variables,null);
      }
      $fperror= fopen('log/error.log', 'a');
      $message = $ex->getMessage();
      fwrite($fperror, "\n************ Erreur dans la méthode : " .$method. strftime('%d/%m/%y %H:%M') . "************\n");
      fwrite($fperror, "\n Message : " . $message . "\n");
      fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
      fclose($fperror);
    //} 
  } 
  finally{
    mysqli_close($con);
    fclose($fpCreateBDD);  
  }
    
}
  

$app->post('/encrypt_decrypt', function (Request $request, Response $response, array $args) {

  try{
    $fpEncryptDecrypt = fopen('./log/encrypt_decrypt.log', 'a');
    $body = json_decode($request->getBody());
    $param = $body->param;
    $type = $body->type;
    fwrite($fpEncryptDecrypt, "************ Décryptage de   " . strftime('%d/%m/%y %H:%M') . "************\n");
    fwrite($fpEncryptDecrypt, "\nrequest: " .$param . " type : " . $type);
    $param_processed = encrypt_decrypt($param,$type);
    fwrite($fpEncryptDecrypt, "\nresponse: " .$param_processed);
    return $response->withJson(['resultat' => $param_processed]);
  }
  catch(Throwable $ex)
  {
      fwrite($fpEncryptDecrypt, $ex->getMessage());
      $fperror= fopen('log/error.log', 'a');
      $message = $ex->getMessage();
      $asso = $body->asso;
      $sql ="INSERT into Erreurs (asso,message,fonction) values ('$asso','$message','utils.php/encrypt_decrypt')";
      upsert($sql,"utils.php/encrypt_decrypt");
      fwrite($fperror, "\n************ Erreur dans la méthode : " .$method. strftime('%d/%m/%y %H:%M') . "************\n");
      fwrite($fperror, "\n Message : " . $message . "\n");
      fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
      fclose($fperror);
  }
  finally{
      fclose($fpEncryptDecrypt);
  }
  
  });
  

function encrypt_decrypt($string, $action)
{
  $fpEncryptDecrypt = fopen('./log/encrypt_decrypt.log', 'a');
  fwrite($fpEncryptDecrypt, "\n************ ". $action . "   ". $string."   ". strftime('%d/%m/%y %H:%M') . "************\n");
  $encrypt_method = getenv('ENCRYPT_METHOD');
  $secret_key = getenv('SECRET_KEY'); // user define private key
  $secret_iv = getenv('SECRET_IV'); // user define secret key
  $key = hash('sha256', $secret_key);
  $iv = substr(hash('sha256', $secret_iv), 0, 16); // sha256 is hash_hmac_algo
  if ($action == 'encrypt') {
      $output = openssl_encrypt($string, $encrypt_method, $key, 0, $iv);
      $output = base64_encode($output);
      fwrite($fpEncryptDecrypt, "\n************ output : " . $output .  "************\n");
  } else if ($action == 'decrypt') {
      $output = openssl_decrypt(base64_decode($string), $encrypt_method, $key, 0, $iv);
      fwrite($fpEncryptDecrypt, "\n************ output : " . $output .  "************\n");

  }
  return $output;
}
function sendEmail($emailAddress,$templateId, $subject, $variables, $attachment) {
  $fpSendEmailLog='log/sendEmailDonator.log';
  $fpSendEmail = fopen($fpSendEmailLog, 'a');//opens file in append mode or create it

  try{
    $templateId = (int)$templateId;
    fwrite($fpSendEmail,"\n");
    fwrite($fpSendEmail, "############################ Error BDD " . " DEBUT ENVOI EMAIL " . strftime('%d/%m/%y %H:%M') . " ###############################");
    fwrite($fpSendEmail, "\n emailAddress : ". $emailAddress);
    fwrite($fpSendEmail, "\n template : ".$templateId);
    fwrite($fpSendEmail, "\n subject : ".$subject);
    fwrite($fpSendEmail, "\n attachment : ". $attachment);
    fwrite($fpSendEmail, "\n variables " .print_r($variables, true));


    $Messages=[];
    $From=[];
    $Sender=[];
    $To=[];
    $Cc=[];
    $ReplyTo=[];
    $TemplateErrorReporting=[];
    $mailjetJson=[];
    $authorization = getenv('MJ_BASIC_BEARER');
    
    
    $From["Email"]="dons@myamana.fr";
    $From["Name"]="Back Office MyAmana";
    $Sender["Email"]="dons@myamana.fr";
    $Sender["Name"]="Back Office MyAmana";
    $To = array(array('Email'=>$emailAddress));
    $ReplyTo["Email"]="dons@myamana.fr";
    $ReplyTo["Name"]="Back Office MyAmana";
    $templateLanguage=true;
    $templateErrorReporting["Email"]="Rachidboulsane@gmail.com";
    $templateErrorReporting["Name"]="Erreur Envoi Email Don";
    $templateErrorDeliver=true;
    $SandBoxMode=false;
    if($attachment===null || $attachment===""){
      $Messages = array (array('From' => $From, 'Sender' => $Sender, 'To' => $To,'Cc' => $Cc, 'ReplyTo' => $ReplyTo,'Subject' => $subject, 'Variables' => $variables, 'TemplateID' => $templateId, 'TemplateLanguage' => $templateLanguage, 'TemplateErrorReporting' => $templateErrorReporting,'TemplateErrorDeliver' => $templateErrorDeliver));   
    } else {
      $path = $attachment;
      $type = pathinfo($path, PATHINFO_EXTENSION);
      $data = file_get_contents($path);
      $base64 = base64_encode($data);
      $pj = array(array('ContentType'=>"application/x-pdf",'Filename' => basename($attachment),'Base64Content' => $base64));
      $Messages = array (array('From' => $From, 'Sender' => $Sender, 'To' => $To,'Cc' => $Cc,'ReplyTo' => $ReplyTo,'Subject' => $subject, 'Variables' => $variables, 'TemplateID' => $templateId, 'TemplateLanguage' => $templateLanguage, 'TemplateErrorReporting' => $templateErrorReporting,'TemplateErrorDeliver' => $templateErrorDeliver, 'Attachments' => $pj));
    }
    

    $mailjetJson["SandboxMode"]=$SandBoxMode;
    $mailjetJson["Messages"]=$Messages;
    
    $cURLConnectionMailjet = curl_init('https://api.mailjet.com/v3.1/send');
    curl_setopt($cURLConnectionMailjet, CURLOPT_POSTFIELDS, json_encode($mailjetJson));
    curl_setopt($cURLConnectionMailjet, CURLOPT_HTTPHEADER, array(
      'Accept: application/json',
      'Content-Type: application/json',
      'Authorization: Basic ' . $authorization
    ));
    curl_setopt($cURLConnectionMailjet, CURLOPT_RETURNTRANSFER, true);
    fwrite($fpSendEmail, "\n\n");
    fwrite($fpSendEmail, "***************Request de l'envoi d'email'******************");
    fwrite($fpSendEmail, "\n\n");
    fwrite($fpSendEmail, json_encode($mailjetJson));
       //Ajout des logs curl
    curl_setopt($cURLConnectionMailjet, CURLOPT_VERBOSE, true);
    $verbose = fopen('log/curl.log', 'w+');
    curl_setopt($cURLConnectionMailjet, CURLOPT_STDERR, $verbose);
    $apiResponseMailjet = curl_exec($cURLConnectionMailjet);
    curl_close($cURLConnectionMailjet);
    
    
    fwrite($fpSendEmail, "\n\n");
    fwrite($fpSendEmail, "***************Réponse de l'envoi d'email'******************");
    fwrite($fpSendEmail, "\n\n");
    fwrite($fpSendEmail, $apiResponseMailjet);
    
  }

  catch(Throwable $ex)
  {
    fwrite($fpSendEmail, $ex->getMessage());
    $fperror= fopen('log/error.log', 'a');
    $message = $ex->getMessage();
    $asso = "au-coeur-de-la-precarite";
    $sql ="INSERT into Erreurs (asso,message,fonction) values ('$asso','$message','utils.php-sendEmail')";
    upsert($sql,"utils.php-sendEmail");
    fwrite($fperror, "\n************ Erreur dans la méthode : " .$method. strftime('%d/%m/%y %H:%M') . "************\n");
    fwrite($fperror, "\n Message : " . $message . "\n");
    fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
    fclose($fperror); 
  }
  finally{
    fclose($fpSendEmail);  
  }
 
}




function sendEmailDonator($asso,$emailAddress,$template, $subject, $variables, $attachment) {
  //$app->get('/testEmail', function(Request $request, Response $response) {
  $fpSendEmailDonatorLog='log/sendEmailDonator.log';
  $fpSendEmailDonator = fopen($fpSendEmailDonatorLog, 'a');//opens file in append mode or create it
  
  
  try{
  fwrite($fpSendEmailDonator, "\n\n");
  fwrite($fpSendEmailDonator, "############################ ASSO " . $asso . " DEBUT ENVOI EMAIL " . strftime('%d/%m/%y %H:%M') . " ###############################");
  fwrite($fpSendEmailDonator, "\n emailAddress : ".$emailAddress);
  fwrite($fpSendEmailDonator, "\n template : ".$template);
  fwrite($fpSendEmailDonator, "\n subject : ".$subject);
  fwrite($fpSendEmailDonator, "\n attachment : ".$attachment);

  if ($variables["prenom"] != null){
    $variables["prenom"]=ucfirst($variables["prenom"]);
  }
  $Messages=[];
  $From=[];
  $Sender=[];
  $To=[];
  $Cc=[];
  $ReplyTo=[];
  $TemplateErrorReporting=[];
  $mailjetJson=[];
  $authorization = getenv('MJ_BASIC_BEARER');
  $sql3="SELECT * FROM Mailjet_Templates
  where nom='$template' order by id desc limit 1";
  $templates = selectdb($sql3,"utils.php-sendEmailDonator");
  $templateId= (int)$templates[0]["id"];
  $sql="SELECT * FROM Assos
  where uri='$asso'";
  $assoBdd = selectdb($sql,"utils.php-sendEmailDonator");
  $emailAsso= $assoBdd[0]["email"];
  $codeCouleur= $assoBdd[0]["codeCouleur"];
  $expediteur= $assoBdd[0]["expediteur"]. " de " . $assoBdd[0]["surnom"];
  $sql2="SELECT asso.nom as asso, assoc.template_id, temp.nom,var.nom as variable, assoc.valeur FROM Assos_Mailjet_Variables assoc
  left join Assos asso on assoc.asso_id= asso.id
  left join Mailjet_Templates temp on assoc.template_id=temp.id
  left join Mailjet_Variables var on assoc.variable_id=var.id
  where asso.uri='$asso'
  and temp.nom='$template'
  and var.type='statique'
  and valeur is not null";
  $mailjet = selectdb($sql2,"utils.php-sendEmailDonator");
  $index=0;
  foreach($mailjet as $clef => $valeur){
    $variables[$mailjet[$index]['variable']] = $mailjet[$index]['valeur'];
    $index++;
  }
  $variables["codeCouleur"]=$codeCouleur;
  fwrite($fpSendEmailDonator, "\n " .print_r($variables, true));
  fwrite($fpSendEmailDonator, "\n***************Flow ".$template." Template ID : ".$templateId. " ******************");
  fwrite($fpSendEmailDonator, "\n***************Envoi d'email de ".$emailAsso." Prénom : ".$expediteur. " ******************");
  fwrite($fpSendEmailDonator, "\n***************Envoi d'email à ".$emailAddress." Prénom : ".$variables["prenom"]." Montant : ".$variables["montant"]." Tous les ".$variables["frequence"]." ******************");

  $From["Email"]="dons@myamana.fr";
  $From["Name"]=$expediteur;
  $Sender["Email"]="dons@myamana.fr";
  $Sender["Name"]=$expediteur;
  $To = array(array('Email'=>$emailAddress,'Name' => $variables["prenom"]));
  $Cc = array(array('Email'=>$emailAsso,'Name' => $expediteur));

  $ReplyTo["Email"]=$emailAsso;
  $ReplyTo["Name"]=$expediteur;
  $templateLanguage=true;
  $templateErrorReporting["Email"]=$emailAsso;
  $templateErrorReporting["Name"]="Erreur Envoi Email Don";
  $templateErrorDeliver=true;
  $SandBoxMode=false;
  if($attachment===null || $attachment===""){
    $Messages = array (array('From' => $From, 'Sender' => $Sender, 'To' => $To,'Cc' => $Cc, 'ReplyTo' => $ReplyTo,'Subject' => $subject, 'Variables' => $variables, 'TemplateID' => $templateId, 'TemplateLanguage' => $templateLanguage, 'TemplateErrorReporting' => $templateErrorReporting,'TemplateErrorDeliver' => $templateErrorDeliver));   
  } else {
    $path = $attachment;
    $type = pathinfo($path, PATHINFO_EXTENSION);
    $data = file_get_contents($path);
    $base64 = base64_encode($data);
    $pj = array(array('ContentType'=>"application/x-pdf",'Filename' => basename($attachment),'Base64Content' => $base64));
    $Messages = array (array('From' => $From, 'Sender' => $Sender, 'To' => $To,'Cc' => $Cc, 'ReplyTo' => $ReplyTo,'Subject' => $subject, 'Variables' => $variables, 'TemplateID' => $templateId, 'TemplateLanguage' => $templateLanguage, 'TemplateErrorReporting' => $templateErrorReporting,'TemplateErrorDeliver' => $templateErrorDeliver, 'Attachments' => $pj));
  }
  
  
  $mailjetJson["SandboxMode"]=$SandBoxMode;
  $mailjetJson["Messages"]=$Messages;
  
  $cURLConnectionMailjet = curl_init('https://api.mailjet.com/v3.1/send');
  curl_setopt($cURLConnectionMailjet, CURLOPT_POSTFIELDS, json_encode($mailjetJson));
  curl_setopt($cURLConnectionMailjet, CURLOPT_HTTPHEADER, array(
    'Accept: application/json',
    'Authorization: Basic ' . $authorization
  ));
  curl_setopt($cURLConnectionMailjet, CURLOPT_RETURNTRANSFER, true);
  fwrite($fpSendEmailDonator, "\n\n");
  fwrite($fpSendEmailDonator, "***************Request de l'envoi d'email'******************");
  fwrite($fpSendEmailDonator, "\n\n");
  fwrite($fpSendEmailDonator, json_encode($mailjetJson));
   //Ajout des logs curl
   curl_setopt($cURLConnectionMailjet, CURLOPT_VERBOSE, true);
   $verbose = fopen('log/curl.log', 'w+');
   curl_setopt($cURLConnectionMailjet, CURLOPT_STDERR, $verbose);
  $apiResponseMailjet = curl_exec($cURLConnectionMailjet);
  curl_close($cURLConnectionMailjet);
  
  
  fwrite($fpSendEmailDonator, "\n\n");
  fwrite($fpSendEmailDonator, "***************Réponse de l'envoi d'email'******************");
  fwrite($fpSendEmailDonator, "\n\n");
  fwrite($fpSendEmailDonator, $apiResponseMailjet);
  
  }
  catch(Throwable $ex)
  {
    fwrite($fpSendEmailDonator, $ex->getMessage()); 
    $fperror= fopen('log/error.log', 'a');
    $message = $ex->getMessage();
    $sql ="INSERT into Erreurs (asso,message,fonction) values ('$asso','$message','utils.php-sendEmailDonator')";
    upsert($sql,"utils.php-sendEmailDonator");
    fwrite($fperror, "\n************ Erreur dans la méthode : " .$method. strftime('%d/%m/%y %H:%M') . "************\n");
    fwrite($fperror, "\n Message : " . $message . "\n");
    fwrite($fperror, "\n Requête à éxécuter :  " . $sql . "\n");
    fclose($fperror);
  }finally{
    fclose($fpSendEmailDonator);  
  }
}

function generateBitlyLink($params,$donType) {
  $fpGenerateLink= fopen('log/generateLink.log','a');
  fwrite($fpGenerateLink, "\n\n");
  fwrite($fpGenerateLink, "Début génération du lien par Utils.php-generateBitlyLink " . strftime('%d/%m/%y %H:%M'));
  fwrite($fpGenerateLink, "\n\n");
  $apiKey = getenv('BITLY_TOKEN');
  $api = new Api($apiKey);
  $bitlink = new Bitlink($api);
  if($donType==="mensuel"){
    $url="https://acdlp.com/";
  } else {
    $url="https://www.myamana.fr/ponctuel/au-coeur-de-la-précarite/";
  }
  $result = $bitlink->createBitlink(['long_url' => $url.$params,'group_guid'=> 'Bl2ab6Gau5l', 'domaine' => 'acdlp.fr']);
  $message = $result->getResponseObject();
  //$link = $result->getResponse()->getBody()->link;

  // if cURL error occurs.
  if ($api->isCurlError()) {
    fwrite($fpGenerateLink, "\n\n");
    fwrite($fpGenerateLink, "***************Erreur bitly '******************");
    fwrite($fpGenerateLink, "\n$api->getCurlErrno().': '.$api->getCurlError()\n");
      
  } else {

      // if Bitly response contains error message.
      if ($result->isError()) {
        fwrite($fpGenerateLink, "\n Erreurr \n");
          fwrite($fpGenerateLink, "\n".$result->getResponse());
          fwrite($fpGenerateLink, "\n".$result->getDescription());
      
      } else {
      
          // if Bitly response is 200 or 201
          if ($result->isSuccess()) {
            fwrite($fpGenerateLink, $result->getResponse());
            return $message->link;

          } else {

            fwrite($fpGenerateLink, "\n Erreurr Fail\n");
            fwrite($fpGenerateLink, $result->getResponse());

          }
      }
  }
}

function suppDiatrics($str) {
  $unwanted_array = array(    'Š'=>'S', 'š'=>'s', 'Ž'=>'Z', 'ž'=>'z', 'À'=>'A', 'Á'=>'A', 'Â'=>'A', 'Ã'=>'A', 'Ä'=>'A', 'Å'=>'A', 'Æ'=>'A', 'Ç'=>'C', 'È'=>'E', 'É'=>'E',
  'Ê'=>'E', 'Ë'=>'E', 'Ì'=>'I', 'Í'=>'I', 'Î'=>'I', 'Ï'=>'I', 'Ñ'=>'N', 'Ò'=>'O', 'Ó'=>'O', 'Ô'=>'O', 'Õ'=>'O', 'Ö'=>'O', 'Ø'=>'O', 'Ù'=>'U',
  'Ú'=>'U', 'Û'=>'U', 'Ü'=>'U', 'Ý'=>'Y', 'Þ'=>'B', 'ß'=>'Ss', 'à'=>'a', 'á'=>'a', 'â'=>'a', 'ã'=>'a', 'ä'=>'a', 'å'=>'a', 'æ'=>'a', 'ç'=>'c',
  'è'=>'e', 'é'=>'e', 'ê'=>'e', 'ë'=>'e', 'ì'=>'i', 'í'=>'i', 'î'=>'i', 'ï'=>'i', 'ð'=>'o', 'ñ'=>'n', 'ò'=>'o', 'ó'=>'o', 'ô'=>'o', 'õ'=>'o',
  'ö'=>'o', 'ø'=>'o', 'ù'=>'u', 'ú'=>'u', 'û'=>'u', 'ý'=>'y', 'þ'=>'b', 'ÿ'=>'y' );
  return strtr( $str, $unwanted_array );
}


