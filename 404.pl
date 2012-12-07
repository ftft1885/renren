#!usr/bin/perl
use CGI;

$q = new CGI;
print $q->start_html('404 not found'),
$q->h1('404 not found'),
$q->end_html();
