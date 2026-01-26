<?php
session_start();

use Slim\Http\Request;
use Slim\Http\Response;
use Stripe\Stripe;


$app->get('/finalisation', function (Request $request, Response $response, array $args) {
  // Display checkout pages
  return $response->write(file_get_contents('../client/finalisation.html'));
});

$app->get('/ponctuel[/{params:.*}]', function (Request $request, Response $response, array $args) {
  // Display checkout pages
  return $response->write(file_get_contents('../client/ponctuel.html'));
});

$app->get('/formMaraude', function (Request $request, Response $response, array $args) {
  // Display checkout pages
  return $response->write(file_get_contents('../client/formMaraude.html'));
});

$app->get('/cancelOrder', function (Request $request, Response $response, array $args) {
  // Display checkout pages
  return $response->write(file_get_contents('../client/cancelOrder.html'));
});

$app->get('/espaceDonateur', function (Request $request, Response $response, array $args) {
  // Display checkout pages
  return $response->write(file_get_contents('../client/espaceDonateur.html'));
});

$app->get('/editMensuel', function (Request $request, Response $response, array $args) {
  // Display checkout pages
  $fpSignin = fopen('./log/connexion.log', 'a');
  fwrite($fpSignin, "\nSession ID: " . session_id() . "\n");
  fwrite($fpSignin, "\nSESSION User Email Initialisation.php");
  fwrite($fpSignin, "\n Le Sub ID est: " .$_SESSION['stripe_sub_id']);
  fwrite($fpSignin, "\n Le Schedule est: " .$_SESSION['stripe_sched_sub_id']);

  fwrite($fpSignin, print_r($_SESSION, true));
  if (isset($_SESSION['isSubscription']) === true) {
    fwrite($fpSignin, "\nOn redirige vers /editMensuel");
    fwrite($fpSignin, print_r($_SESSION, true));

    //Si authentifié, servir la page backoffice.html
    return $response->write(file_get_contents('../client/editMensuel.html'));
  } else {
    fwrite($fpSignin, "\nOn redirige vers /signin");
    //Si non authentifié, rediriger vers la page de connexion
    return $response->write(file_get_contents('../client/signin.html'));
  }
  return $response->write(file_get_contents('../client/editMensuel.html'));
});

$app->get('/createHl', function (Request $request, Response $response, array $args) {
  // Display checkout pages
  return $response->write(file_get_contents('../client/createHl.html'));
});

$app->get('/adhesion', function (Request $request, Response $response, array $args) {
  // Display checkout pages
  return $response->write(file_get_contents('../client/adhesion.html'));
});

$app->get('/acdlpPay', function (Request $request, Response $response, array $args) {
  // Display checkout pages
  return $response->write(file_get_contents('../client/acdlpPay.html'));
});

$app->get('/rapportAcdlp', function (Request $request, Response $response, array $args) {
  // Display checkout pages
  return $response->write(file_get_contents('../client/rapportAcdlp.html'));
});

$app->get('/coordination-form', function (Request $request, Response $response, array $args) {
  // Display checkout pages
  return $response->write(file_get_contents('../client/coordination_form.html'));
});


$app->get('/cantine', function (Request $request, Response $response, array $args) {
  // Display checkout pages
  return $response->write(file_get_contents('../client/cantine.html'));
});

$app->get('/campagnes', function (Request $request, Response $response, array $args) {
  // Display checkout pages
  return $response->write(file_get_contents('../client/campagnes.html'));
});

$app->get('/portail[/{params:.*}]', function (Request $request, Response $response, array $args) {
  // Display checkout pages
  return $response->write(file_get_contents('../client/portail.html'));
});

$app->get('/poursuiteQuotidien[/{params:.*}]', function (Request $request, Response $response, array $args) {
  // Display checkout pages
  return $response->write(file_get_contents('../client/poursuiteQuotidien.html'));
});

$app->get('/t', function (Request $request, Response $response, array $args) {
  // Display checkout pages
  return $response->write(file_get_contents('../client/test.html'));
});

$app->get('/backoffice', function (Request $request, Response $response, array $args) {
  // Display checkout pages
  $fpSignin = fopen('./log/connexion.log', 'a');
  fwrite($fpSignin, "\nSession ID: " . session_id() . "\n");
  fwrite($fpSignin, "\nSESSION User Email Initialisation.php");
  fwrite($fpSignin, print_r($_SESSION, true));

  // Vérifier si l'utilisateur est authentifié
  if (isset($_SESSION['isLoggedIn']) === true) {
    fwrite($fpSignin, "\nOn redirige vers /backoffice");
    fwrite($fpSignin, print_r($_SESSION, true));

    // Si authentifié, servir la page backoffice.html
    return $response->write(file_get_contents('../client/backoffice.html'));
  } else {
    fwrite($fpSignin, "\nOn redirige vers /signin");
    // Si non authentifié, rediriger vers la page de connexion
    return $response->write(file_get_contents('../client/signin.html'));
  }
});

$app->get('/signup', function (Request $request, Response $response, array $args) {
  // Display checkout pages
  return $response->write(file_get_contents('../client/signup.html'));
});


$app->get('/signin', function (Request $request, Response $response, array $args) {
  // Display checkout pages
  return $response->write(file_get_contents('../client/signin.html'));
});

$app->get('/mensuel[/{params:.*}]', function (Request $request, Response $response, array $args) {
  // Display checkout page
  return $response->write(file_get_contents('../client/mensuel.html'));
});

$app->get('/dashboard', function (Request $request, Response $response, array $args) {
  // Display checkout page
  return $response->write(file_get_contents('../client/dashboard.html'));
});

$app->get('/msbar', function (Request $request, Response $response, array $args) {
  // Display checkout page
  return $response->write(file_get_contents('../client/msbar.html'));
});

$app->get('/reinit', function (Request $request, Response $response, array $args) {
  // Display checkout page
  return $response->write(file_get_contents('../client/reinit.html'));
});

$app->get('/linkGenerator', function (Request $request, Response $response, array $args) {
  // Display checkout page
  return $response->write(file_get_contents('../client/linkGenerator.html'));
});

$app->get('/coordination', function (Request $request, Response $response, array $args) {
  // Display checkout pages
  return $response->write(file_get_contents('../client/coordination.html'));
});

$app->get('/bilal', function (Request $request, Response $response, array $args) {
  // Display checkout pages
  return $response->write(file_get_contents('../client/bilal.html'));
});

$app->get('/create_asso', function (Request $request, Response $response, array $args) {
  // Display checkout pages
  return $response->write(file_get_contents('../client/create_asso.html'));
});

$app->get('/pdfa[/{params:.*}]', function (Request $request, Response $response, array $args) {
  $filename = $args['filename'];
  $privateDir = '/var/www/html/pdf/';
  // Display checkout pages
  $fpSignin = fopen('./log/connexion.log', 'a');
  fwrite($fpSignin, "\nSession ID: " . session_id() . "\n");
  fwrite($fpSignin, "\nSESSION User Email Initialisation.php");
  fwrite($fpSignin, print_r($_SESSION, true));

  // Vérifier si l'utilisateur est authentifié
  if (isset($_SESSION['isLoggedIn']) === true) {
    fwrite($fpSignin, "\n L'utilisateur est authentifié");
    fwrite($fpSignin, print_r($_SESSION, true));

    // Vérifie si le fichier existe
    $filePath = $privateDir . $filename;
    if (file_exists($filePath)) {
        return $response->withHeader('Content-Type', 'application/pdf') // Changez le type MIME selon le fichier
                        ->withHeader('Content-Disposition', 'attachment; filename="' . basename($filePath) . '"')
                        ->write(file_get_contents($filePath));
    } else {
        return $response->withStatus(404)->write('Fichier non trouvé');
    }
  } else {
    fwrite($fpSignin, "\n Accès interdit");
    // Si non authentifié, rediriger vers la page de connexion
    return $response->withStatus(403)->write('Accès interdit');
  }


});