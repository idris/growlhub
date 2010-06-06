#!/usr/local/bin/node

var sys = require('sys');

var github = require('./github');

try {
	var growl = require('growl');
} catch(ex) {
	sys.puts('You need the growl module. http://github.com/visionmedia/node-growl');
	exit(1);
}


var lastCommitId = null;

var client = github.init();


var check = function() {
	sys.puts('checking... ' + lastCommitId);
	client.commits.list('idris', 'growlhub', 'master', function(data) {
		for(var i=0;i<data.commits.length;i++) {
			var commit = data.commits[i];
			if(commit.id == lastCommitId) break;

			lastCommitId = commit.id;

			growl.notify(commit.message, {
				'title': commit.author.name,
				'image': 'github-logo-128.png',
				'name': 'growlhub'
			});
		}
	});
};

var interval = setInterval(check, 10000);

// check first time
client.commits.list('idris', 'growlhub', 'master', function(data) {
	try {
		lastCommitId = data.commits[0].id;
		growl.notify('Monitoring ' + 'idris/growlhub/master', {
			'title': 'GrowlHub started successfully.',
			'image': 'github-logo-128.png',
			'name': 'growlhub'
		});
	} catch(ex) {
		sys.puts('Failed to get first commit list. Exiting.');
		process.exit(1);
	}
});
