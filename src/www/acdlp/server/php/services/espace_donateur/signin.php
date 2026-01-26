<?php
session_start();


use Slim\Http\Request;
use Slim\Http\Response;

require_once './services/utils.php';

$app->post('/signin', function (Request $request, Response $response, array $args) {
    try {
        $fpSignin = fopen('./log/connexion.log', 'a');

        if (headers_sent()) {
            fwrite($fpSignin, "\nHeader");
            fwrite($fpSignin, print_r(headers_list(), true));
            fwrite($fpSignin, "\nSESSION");
            fwrite($fpSignin, print_r($_SESSION, true));
            fwrite($fpSignin, "\nSESSION STATUS");
            fwrite($fpSignin, print_r(session_status(), true));
            if (session_status() == PHP_SESSION_NONE) {
            }
        }
        // Set session timeout
        $timeout = 1800; // 30 minutes
        if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity'] > $timeout)) {
            session_unset();     // unset $_SESSION variable for the run-time
            session_destroy();   // destroy session data in storage
            return $response->withJson(["status" => "session_expired"]);
        }
        $_SESSION['last_activity'] = time(); // update last activity time stamp

        $body = json_decode($request->getBody());
        $email = $body->email;
        $password = $body->password;
        $role = $body->role;
        $isAsso = $body->isAsso;
        $password = encrypt_decrypt($password, 'encrypt');
        $wichConnexion = "";
        fwrite($fpSignin, "\n************" . strftime('%d/%m/%y %H:%M') . "************");
        fwrite($fpSignin, "\nemail : " . $email);

        // Use prepared statements for SQL query

        if ($isAsso === "true" ) {
            $sql = "SELECT id, siren, raison, creation, nom, prenom, email, email_encrypted, password FROM members WHERE email = '$email' AND password = '$password' and siren is not null and actif=true and role = '$role'";
            $wichConnexion = "Association";
        }else{
            $sql = "SELECT id, raison, creation, nom, prenom, email, email_encrypted, password FROM members WHERE email = '$email' AND password = '$password' and role = '$role'";
            $wichConnexion = "Client";

        }
        $personnes = selectDB($sql, "/signin");
        $isLoggedIn=false;


        if (empty($personnes)) {
            fwrite($fpSignin, "\nAuthentification failed for " . $body->email . " - Incorrect credentials or account not found ");
        } else {
            fwrite($fpSignin, "\nAuthentification success for " . $body->email . "");
            fwrite($fpSignin, "\n L'id Asso est:  " . $isAsso . "");
            $isLoggedIn=true;
            // Set user information in session
            $_SESSION['user_id'] = $personnes[0]['id'];
            $_SESSION['user_email'] = $email;
            $_SESSION['isLoggedIn'] = $isLoggedIn;
            if ($isAsso === "true" ) {
                $_SESSION['siren'] = $personnes[0]['siren'];
                fwrite($fpSignin, "\n Le siren de session est : " . $_SESSION['siren'] . "");

            }

            fwrite($fpSignin, "\nSESSION User Email SIgnin");
            fwrite($fpSignin, print_r($_SESSION, true));
            fwrite($fpSignin, "\nSession ID: " . print_r(session_id(),true) . "\n");

            $sql2 = "UPDATE members SET connexion = '" . strftime('%Y-%m-%d %H:%M:%S') . "' WHERE email = '$email'";
            fwrite($fpSignin, "\n Exécution de la requete " . $sql2);
            upsert($sql2, "/signin");
        }

        return $response->withJson(['isLoggedIn' => $isLoggedIn, 'siren' => $siren,'wichConnexion' => $wichConnexion]);
    } catch (Throwable $ex) {
        fwrite($fpSignin, $ex->getMessage());
        $fperror = fopen('log/error.log', 'a');
        $message = $ex->getMessage();
        $asso = $body->asso;
        $sql = "INSERT into Erreurs (asso,message,fonction) values ('$asso','signin.php/signin')";
        upsert($sql, "signin.php/signin");
        fwrite($fperror, "************ Error in method : " . $method . strftime('%d/%m/%y %H:%M') . "************");
        fwrite($fperror, "Message : " . $message . "");
        fwrite($fperror, "Request to execute :  " . $sql . "");
        fclose($fperror);
    } finally {
        fclose($fpSignin);
    }
});