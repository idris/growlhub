var sys = require('sys'),
	http = require('http'),
	querystring = require('querystring');

exports.init = function(login, token, secure) {
	secure = secure ? true : false;
	return (function() {
		// private
		function makeRequest(o) {
			var url = '/api/v2/json/' + o.path;
			var client;
			var request;

			client = http.createClient((secure ? 443 : 80), 'github.com', secure);

			if(login && token) {
				var params = { 'login': login, 'token': token }
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
				path: 'commits/list/' + user_id + '/' + repository + '/' + branch,
				callback: function(data) {
					callback(data);
				},
				errorCallback: errorCallback
			});
		};

		return pub;
	})();
};