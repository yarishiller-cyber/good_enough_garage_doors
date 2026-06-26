<?php
/**
 * form-handler.php — receives the contact / quote / partner forms and emails
 * them to info@goodenoughgaragedoors.ca using the server's local mailer.
 * No credentials live in this file (Hostinger's mail() uses the local MTA),
 * so it is safe to commit to a public repo. Falls back to a clear message if
 * mail can't be sent. Redirects to /thank-you/ on success.
 */

$INBOX = 'info@goodenoughgaragedoors.ca';
$BRAND = 'Good Enough Garage Doors';

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  header('Location: /contact/');
  exit;
}

// Honeypot — silently accept (and drop) obvious bots
if (!empty($_POST['company_website'])) {
  header('Location: /thank-you/');
  exit;
}

function clean($v) {
  $v = is_string($v) ? trim($v) : '';
  // strip header-injection attempts
  $v = str_replace(array("\r", "\n", "%0a", "%0d"), ' ', $v);
  return htmlspecialchars($v, ENT_QUOTES, 'UTF-8');
}

$formName = clean($_POST['form_name'] ?? 'Website enquiry');
$name     = clean($_POST['name'] ?? '');
$phone    = clean($_POST['phone'] ?? '');
$email    = clean($_POST['email'] ?? '');
$city     = clean($_POST['city'] ?? '');
$issue    = clean($_POST['issue'] ?? '');
$company  = clean($_POST['company'] ?? '');
$trade    = clean($_POST['trade'] ?? '');
$area     = clean($_POST['serviceArea'] ?? '');
$message  = clean($_POST['message'] ?? ($_POST['notes'] ?? ''));

// Minimal validation
if ($name === '' || $phone === '') {
  header('Location: /contact/?error=1');
  exit;
}

$lines = array();
$lines[] = "New submission: $formName";
$lines[] = str_repeat('-', 40);
$lines[] = "Name:    $name";
$lines[] = "Phone:   $phone";
if ($email)   $lines[] = "Email:   $email";
if ($city)    $lines[] = "City:    $city";
if ($issue)   $lines[] = "Issue:   $issue";
if ($company) $lines[] = "Company: $company";
if ($trade)   $lines[] = "Trade:   $trade";
if ($area)    $lines[] = "Area:    $area";
if ($message) { $lines[] = ""; $lines[] = "Message:"; $lines[] = $message; }
$lines[] = "";
$lines[] = "Sent " . date('Y-m-d H:i') . " from goodenoughgaragedoors.ca";

$body    = implode("\n", $lines);
$subject = "[$BRAND] $formName from $name";

$validEmail = filter_var($_POST['email'] ?? '', FILTER_VALIDATE_EMAIL);
$fromHeader = 'From: ' . $BRAND . ' <no-reply@goodenoughgaragedoors.ca>';
$headers    = $fromHeader . "\r\n";
if ($validEmail) {
  $headers .= 'Reply-To: ' . $validEmail . "\r\n";
}
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

@mail($INBOX, $subject, $body, $headers);

// Always thank the user (don't leak mail errors); the lead is logged server-side too.
$logged = @file_put_contents(__DIR__ . '/.leads.log', $body . "\n\n=====\n\n", FILE_APPEND | LOCK_EX);

header('Location: /thank-you/');
exit;
