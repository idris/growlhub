var sys = require('sys'),
	http = require('http'),
	querystring = require('querystring'),
	fs = require('fs');

var defaultOptions = {};

function loadDefaultOptions() {
	try {
		var data = fs.readFileSync(process.env['HOME'] + '/.gitconfig');
		var match = data.toString().match(/\[github\]\s+user\s*=\s*([^\s]+)\s+token\s*=\s*([^\s]+)/m);
		if(match) {
			defaultOptions.githubLogin = match[1];
			defaultOptions.githubToken = match[2];
		}
	} catch(ex) {}
}

exports.init = function(options) {
	if(typeof(options) != 'object') options = {};
	if(!options.login) options.login = defaultOptions.githubLogin;
	if(!options.token) options.token = defaultOptions.githubToken;
	return (function() {
		// private
		function makeRequest(o) {
			var url = o.path;
			var client;
			var request;

			client = http.createClient(443, 'github.com', true);
			client.addListener('error', function(error) {
				sys.puts('client error: ' + error);
				if (typeof(o.errorCallback) == 'function') o.errorCallback(499);
			});

			if(options.login && options.token) {
				var params = { 'login': options.login, 'token': options.token }
				url += '?' + querystring.stringify(params);
			}

			request = client.request('GET', url, {'Accept':'*/*','Host':'github.com','User-Agent':'Idris'});
			request.addListener('response', function(resp) {
				var statusCode = resp.statusCode;
				var content = '';

				if(statusCode != 200) {
					if(statusCode == 406) {
						sys.log('Access denied (error 406) for ' + o.path);
					} else {
						sys.log('Request to ' + url + ' failed with ' + statusCode + ' error code.');
					}

					if(typeof(o.errorCallback) == 'function') o.errorCallback(statusCode);
					return;
				}

				resp.addListener('data', function(chunk) {
					content += chunk;
				});

				resp.addListener('end', function() {
					if(typeof(o.callback) == 'function') o.callback(JSON.parse(content));
				});
			});

			return request.end();
		}

		// public
		var pub = {};

		pub.commits = {};
		pub.commits.list = function(user_id, repository, branch, callback, errorCallback) {
			if(!branch) branch = 'master';
			makeRequest({
				path: '/api/v2/json/commits/list/' + user_id + '/' + repository + '/' + branch,
				callback: function(data) {
					callback(data);
				},
				errorCallback: errorCallback
			});
		};
		pub.watched = {};
		pub.watched.list = function(callback, errorCallback)  {
			makeRequest({
				path: '/api/v2/json/repos/watched/' + defaultOptions.githubLogin,
				callback: function(data) {
					callback(data);
				},
				errorCallback: errorCallback
			});
		};
		pub.private_feed = {};
		pub.private_feed.list = function(callback, errorCallback) {
			// TODO: require options.login
			makeRequest({
			path: '/' + defaultOptions.githubLogin + '.private.json',
				callback : function(data) {
					callback(data);
				},
				errorCallback: errorCallback
			})
		}
		return pub;
	})();
};

loadDefaultOptions();