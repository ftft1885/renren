var http = require('http');
var https = require('https');
var md5 = require('MD5');
var agent = require('superagent').agent();
var exec = require('child_process').exec;
var fs = require('fs');
var parseURL = require('url').parse;
var querystring = require('querystring');

//nginx on 1026 for renren
var port = 1026;
var userList = {};

http.createServer(function(req,res)
{
	if(req.url.indexOf(".pl") == req.url.length - 3)
	{
		var _arr = req.url.split('/');
		var filename = _arr[_arr.length - 1];
		//console.log('filename = ' + testname);
		//var filename = req.url.substring(1,req.url.length);
		//console.log(filename);
		perl(filename,function(stdout,st)
		{		
			res.writeHead(st,{'Content-Type':'text/html'});
			res.end(stdout);
		});
	}

	var isLogin = false;
	var id = "";

	var pathname = parseURL(req.url).pathname;
	console.log(req.url);

	//check cookie
	if(pathname.indexOf('/renren') == 0 && pathname != '/renren/login' && pathname != 'renren/redirect')//check cookie
	{
		
		if(req.headers.cookie)//no cookie
		{			
			var query_json = querystring.parse(req.headers.cookie,';');
			if(query_json.id && userList[query_json.id])
			{
				id = query_json.id;
				isLogin = true;			
			}							
		}

	}
	switch(pathname)
	{
		case '/renren':			
			if(isLogin)
			{
				res.writeHead(200,{'Content-Type':'text/html'});
				getMainPage(id,function(html)
				{
					res.end(html);
				});
				//res.end('welcome '+ id);
			}		
			else if(parseURL(req.url).query)
			{
					
				var query_id = querystring.parse(parseURL(req.url).query).id;
				
				if(userList[query_id])
				{
					id = query_id;
					res.writeHead(200,
					{
						'Content-Type'	:	'text/html',
						'Set-cookie'	:	'id='+id+'; Expires=Wed, 13-Jan-2021 22:23:01 GMT;HttpOnly'
					});
					res.end('welcome '+ id);
				}
				else
				{
					console.log("not  in list");
					res.writeHead(302,{'Location':'/renren/login'});
					res.end();
				}

			}		
			
			var mycode = querystring.parse(parseURL(req.url).query).code;
			var opts =
			{
				grant_type	:	'authorization_code',	
				client_id	:	'7b7568ae17db4eff94495695d84a8f06',
				redirect_uri	:	'http://42.121.108.75/renren',
				client_secret	:	'688c934a8acc42c8b6b55661a7231702',
				code		:	mycode		
			}
			var mypath = querystring.stringify(opts);
			//console.log("mypath = " + mypath);
			/*
			   
			var post_opts = 
			{				
				hostname:'graph.renren.com',
				path	:'/auth/token?' + mypath,
				method	:'POST'	
			}
			agent.post('https://graph.renren.com/oauth/token')
			.send(mypath).end(function(err,result)
			{
				//console.log(result.text);
				var json = JSON.parse(result.text);
				console.log(json);
				var id = json.user.id;
				userList[id] = json;
				mya_t = json.access_token;
				//console.log(userList);
				res.writeHead(200,
					{
						'Content-Type'	:	'text/html',
						'Set-Cookie'	:	'id='+id+'; Expires=Wed, 13-Jan-2021 22:23:01 GMT;HttpOnly'
					});
				res.end('<form method="get" action="/renren/send"><input type="text" name="text"/>'
				+'<input type="submit" value="submit"/></form>');
			});			
			*/
			break;
		case '/renren/login':
			res.writeHead(200,{'Content-Type':'text/html'});
			var host = 'http://graph.renren.com/oauth/grant';
			var opts = 
			{
				//host		:	'http://graph.renren.com/oauth/grant',
				client_id	:	'7b7568ae17db4eff94495695d84a8f06',
				redirect_uri	:	'http://42.121.108.75/renren/redirect',
				response_type	:	'code',
				scope		:	'status_update+'+'read_user_feed'
			};
			//var str = querystring.stringify(opts); err:will be encode
			var str = [];
			var i = 0;
			for(var key in opts)
			{
				str[i++] =  key + "=" + opts[key];
			};
			str = str.join('&');
			var url = host + "?" + str;		
			var html = '<a href="'+url+'">login oauth</a>';
			res.end(html);
			break;

		case '/renren/redirect'://for redirect and get access_token
			var mycode = querystring.parse(parseURL(req.url).query).code;
			var opts =
			{
				grant_type	:	'authorization_code',	
				client_id	:	'7b7568ae17db4eff94495695d84a8f06',
				redirect_uri	:	'http://42.121.108.75/renren/redirect',
				client_secret	:	'688c934a8acc42c8b6b55661a7231702',
				code		:	mycode		
			}
			var mypath = querystring.stringify(opts);
			//console.log("mypath = " + mypath);
			var post_opts = 
			{				
				hostname:'graph.renren.com',
				path	:'/auth/token?' + mypath,
				method	:'POST'	
			}
			agent.post('https://graph.renren.com/oauth/token')
			.send(mypath).end(function(err,result)
			{
				//console.log(result.text);
				var json = JSON.parse(result.text);
				console.log(json);
				var id = json.user.id;
				userList[id] = json;
				mya_t = json.access_token;
				//console.log(userList);
				/*
				res.writeHead(200,
					{
						'Content-Type'	:	'text/html',
						'Set-Cookie'	:	'id='+id+'; Expires=Wed, 13-Jan-2021 22:23:01 GMT;HttpOnly'
					});
				res.end('<form method="get" action="/renren/send"><input type="text" name="text"/>'
				+'<input type="submit" value="submit"/></form>');
				*/
				console.log("redirect ..");
				res.writeHead(302,{'Location':'/renren?id='+id});
				res.end();
			});			
			
			break;
		
		case '/renren/send':	
			var mytext = querystring.parse(parseURL(req.url).query).text;
			//console.log(mytext);	
			var opts = {};
			opts['v'] = "1.0";
			//opts['method'] = "users.getInfo";
			opts['method'] = "status.set";
			opts['format'] = 'JSON';
			opts['access_token'] = mya_t;
			//opts['status'] = 'this is a status from perl written by ft';

			var keys = [],sig = "";
			for(var i in opts)
			{
				keys.push(i);
			}
			keys.sort();
			keys.forEach(function(k)
			{
				sig += k + "=" + opts[k];
			});
			sig += '688c934a8acc42c8b6b55661a7231702';
			opts['sig'] = md5(sig);
			//opts['status'] = 'this is a status from perl written by ft';
			var mypath = querystring.stringify(opts);
			//console.log(mypath);
			//console.log(sig);
			agent.post('http://api.renren.com/restserver.do')
			.send(mypath).end(function(err,result)
			{
				//console.log(result.text);
			});
			break;

		case '/renren/feed_get':
			
			var id = '285922258';
			console.log("method = "+ req.method);
			
			console.log(req);
			var postdata = "";
			var opts = {
				v	:	'1.0',
				format	:	'JSON'
			}
			
			req.on('data',function(data)//only one time
			{
				postdata += data;//data is a buffer				
				var post_opts = querystring.parse(postdata);				
				for(var key in post_opts)
				{
					opts[key] = post_opts[key];
				}
				if(opts.method == 'feed.get')	opts.type = '10';
				console.log(opts);

				var keys = [],sig = "";
				for(var i in opts)
				{
					keys.push(i);
				}
				keys.sort();
				keys.forEach(function(k)
				{
					sig += k + "=" + opts[k];
				});
				sig += '688c934a8acc42c8b6b55661a7231702';
				opts['sig'] = md5(sig);
				
				var mypath = querystring.stringify(opts);//url need to be encoded
				//console.log(mypath);
				//console.log(sig);
				agent.post('http://api.renren.com/restserver.do')
				.send(mypath).end(function(err,result)
				{
					//console.log(result);
					res.end(result.text);
				});


			});
			/*
			{
				var opts = {};
				opts['v'] = "1.0";
				//opts['method'] = "users.getInfo";
				opts['method'] = "feed.get";
				opts['format'] = 'JSON';
				//opts['access_token'] = mya_t;
				opts['access_token'] = userList[id].access_token;
				
				//console.log("access_token  = " + opts['access_token']);

				opts['type'] = '10';
				//opts['status'] = 'this is a status from perl written by ft';

				var keys = [],sig = "";
				for(var i in opts)
				{
					keys.push(i);
				}
				keys.sort();
				keys.forEach(function(k)
				{
					sig += k + "=" + opts[k];
				});
				sig += '688c934a8acc42c8b6b55661a7231702';
				opts['sig'] = md5(sig);
				//opts['status'] = 'this is a status from perl written by ft';
				var mypath = querystring.stringify(opts);//url need to be encoded
				//console.log(mypath);
				//console.log(sig);
				agent.post('http://api.renren.com/restserver.do')
				.send(mypath).end(function(err,result)
				{
					//console.log(result);
					res.end(result.text);
				});

			}
			*/
			break;
	}
	
}).listen(port,function(err)
{
	console.log("server on " + port);
});

function getInfoFromRenren(req_opts,callback)
{
	//!id(access_token) and method is required
	//this func will post to localhost/renren/getinfo
	
	var postdata = 
	{
		access_token	:	userList[req_opts.id].access_token,
		method		:	req_opts.method
	}
	postdata = querystring.stringify(postdata);
	console.log(postdata);
	var html = "";
	var opts = 
	{
		headers		:	{'Content-Length':postdata.length},
		path		:	'/renren/feed_get',
		method		:	'POST',

	}
	req = http.request(opts,function(res)
	{
		res.on('data',function(data)
		{
			//console.log(data);
			html += data;
			//callback(html);
		});
		
		res.on('end',function()
		{
			//console.log(html+"");
			callback(html);
		});		
	});
	req.write(postdata+'\n');
	req.end();

}

function perl(filename,callback)
{	
	var cmd = "";
	var st = 200;
	fs.exists('./'+filename,function(exists)
	{
		console.log(exists);
		if(exists)
		{
			cmd = "perl " + filename;			
		}

		else 
		{
			cmd = "perl 404.pl";
			st = 404;
		}
		child = exec(cmd,function(err,stdout,stderr)
                {
                        if(err)
                        {
                                console.log("ERROR " + err);
                        }
                        if(stderr)
                                console.log("STDERR : " + stderr);
                        //console.log(stdout);
			//res.writeHead(200,{'Content-Type':'text/html'});
                        //res.end(stdout);
                        callback(stdout,st);
                });

	});

}

function getHTMLHead(title)
{
	var html = "";
	html += '<!DOCTYPE html>';
	html += '<html>';
	html += '<head>';
	html += '<meta id="viewport" name="viewport" content="width=device-width,initial-scale=1,user-scalable=no" charset="utf-8">';
	html += '<link type="text/css" rel="stylesheet" href="./css/renren.css"></link>';
	html += '<title>' + title + '</title>';
	html += '</head>';
	html += '<body>';
	return html;
}

function getHTMLDiv(demo)
{
	var div = '<div class="div_feed">';
	div += demo.name + '<br>';
	div += demo.message;

	div += '</div>';
	return div;
}

function getMainPage(id,callback)//can be just one func
{
	
	var opts = {
		id		:	id,
		method		:	'feed.get'
	}
	getInfoFromRenren(opts,function(renrenjson)
	{
		var html = getHTMLHead('main page');
		
		var json = JSON.parse(renrenjson);//???
		//console.log(json);
		for(var key in json)
		{	
			var demo = json[key];
			console.log(demo);
			html += getHTMLDiv(demo);
		}
		
	
		html += '</body>';
		html += '</html>';
		callback(html);	
	});
	/*
	var postdata = 
	{
		id	:	id,
		method	:	'feed.get'
	}
	postdata = querystring.stringify(postdata);
	console.log(postdata);
	var html = "";
	var opts = 
	{
		headers		:	{'Content-Length':postdata.length},
		path		:	'/renren/feed_get',
		method		:	'POST',

	}
	req = http.request(opts,function(res)
	{
		res.on('data',function(data)
		{
			//console.log(data);
			html += data;
			//callback(html);
		});
		
		res.on('end',function()
		{
			//console.log(html+"");
			callback(html);
		});
		
	});
	req.write(postdata+'\n');
	req.end();
	*/
}

function getMainPage2(id,callback)
{
	var html = ""; 
	http.get('/renren/feed_get',function(res)
	{	
		var alldata = "";
		res.on('data',function(data)
		{
			alldata += data;
		});
		res.on('end',function()
		{
			//console.log(alldata+"");
			html = alldata;
			callback(html);
		});
	
		
	});
}
