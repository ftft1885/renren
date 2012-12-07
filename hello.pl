#!usr/bin/perl -w
use CGI;

my $q = new CGI;
{
#print $q->header(),
print $q->start_html("hello perl"),
$q->h1("hello world"),
$q->end_html();
}
