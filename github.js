var sys = require('sys');
var http = require('http');

exports.init = function(login, token, secure) {
	secure = secure ? true : false;
	return (function() {
		// private
		function makeRequest(o) {
			var url = '/api/v2/json/' + o.path;
			var client;
			var request;

			if(login && token) {
				client = http.createClient(80, 'github.com', secure, {});
			} else {
				client = http.createClient(80, 'github.com', secure);
			}

			request = client.request('GET', url, {'Accept':'*/*','Host':'github.com','User-Agent':'Idris'});
			request.addListener('response', function(resp) {
				var statusCode = resp.statusCode;
				var content = '';

				if(statusCode != 200) return sys.puts('Request to ' + url + ' failed with ' + statusCode + ' error code.');

				resp.addListener('data', function(chunk) {
					content += chunk;
				});

				resp.addListener('end', function() {
					if(typeof(o.callback == 'function')) o.callback(JSON.parse(content));
				});
			});

			return request.end();
		}

		// public
		var pub = {};

		pub.commits = {};
		pub.commits.list = function(user_id, repository, branch, callback) {
			if(!branch) branch = 'master';
			makeRequest({
				path: 'commits/list/' + user_id + '/' + repository + '/' + branch,
				callback: function(data) {
					callback(data);
				}
			});
		};

		return pub;
	})();
};