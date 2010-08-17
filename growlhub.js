#!/usr/local/bin/node

var sys = require('sys'),
	github = require('./vendor/github'),
	growl = require('./vendor/growl'),
	opts = require('./vendor/opts');


var repos = [];

function checkOne(repo) {
	hub.commits.list(repo.user, repo.repo, repo.branch, function(data) {
		for(var i=0;i<data.commits.length;i++) {
			var commit = data.commits[i];
			if(commit.id == repo.lastCommitId) break;
            var title = commit.author.name + ' on ' + repo.getPath();
            sys.puts('Notifying '+ title);
			growl.notify(commit.message, {
				'title': title,
				'image': 'github-logo-128.png',
				'name': 'growlhub'
			}, function(res){});
		}

		repo.lastCommitId = data.commits[0].id;
	});
}

function check() {
	repos.forEach(checkOne);
}

function register(repo) {
	hub.commits.list(repo.user, repo.repo, repo.branch, function(data) {
		try {
			sys.puts('Monitoring ' + repo.getPath() + ' since ' + data.commits[0].id);
			repo.lastCommitId = data.commits[0].id;
			repos.push(repo);

			if(typeof(interval) == 'undefined') interval = setInterval(check, opts.get('t') || 30000);
		} catch(ex) {
			sys.log(ex);
		}
	});
}

function registerAll(){
    hub.watched.list(function(data) {
       try {
           data.repositories.forEach(function(repository){
                path = repository.url.split('http://github.com/')[1];
                if (!path) {
                    path = repository.url.split('https://github.com/')[1]
/*                    sys.log('unable to parse ' + repository.url);
                    return;
*/                }
                register(createRepo(path));
           });
       } catch(ex) {
           sys.log(ex);
       }
    });
}

function createRepo(path) {
	var split = path.split('/');

	var repo = {
		user: split[0],
		repo: split[1],
		branch: split[2] || 'master',
		getPath: function() { return this.user + '/' + this.repo + '/' + this.branch }
	};

	return repo;
}


var options = [
	{
		short: 'v',
		long: 'version',
		description: 'Show version information',
		callback: function() { sys.puts('GrowlHub version 1.0'); process.exit(0); }
	},
	{
		short: 't',
		long: 'interval',
		description: 'Interval to check for new commits (in milliseconds)',
		value: true
	},
	{
		short: 's',
		long: 'secure',
		description: 'Use https'
	},
	{
		long: 'login',
		description: 'Github login for authentication',
		value: true
	},
	{
		long: 'token',
		description: 'Github token for authentication (Get one here: https://github.com/account )',
		value: true
	},
];
var arguments = [
	{
		name: 'repository',
		required: true,
		description: 'e.g. idris/growlhub/master'
	},
	{ name: '...' }
];
opts.parse(options, arguments, true);

var hub = github.init({
	login: opts.get('login'),
	token: opts.get('token'),
	secure: opts.get('secure')
});

opts.args().forEach(function(path) {
    if (path == 'all') {
        registerAll();
    } else {
        register(createRepo(path));
    }
});