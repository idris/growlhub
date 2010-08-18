#!/usr/local/bin/node

var sys = require('sys'),
    url = require('url'),
	github = require('./vendor/github'),
	growl = require('./vendor/growl'),
	opts = require('./vendor/opts');


var repos = [];

/*
* @param {object} repo
*/
function checkOne(repo) {
	hub.commits.list(repo.user, repo.repo, repo.branch, function(data) {
		for(var i=0;i<data.commits.length;i++) {
			var commit = data.commits[i];
			if(commit.id == repo.lastCommitId) break;
			var title = commit.author.name + ' on ' + repo.getPath();
			sys.puts(commit.message + ' ' + title);
			growl.notify(commit.message, {
				'title': title,
				'image': 'github-logo-128.png',
				'name': 'growlhub',
				'sticky' : opts.get('sticky') === true
			}, function(res){});
		}
		repo.lastCommitId = data.commits[0].id;
	});
}

function check() {
	repos.forEach(checkOne);
}

/*
* @param {object} repo
*/
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
               // repository.url == http[s]://github.com/idris/growlhub/master
               var parsed_url = url.parse(repository.url),
                    repository_name = parsed_url.pathname.substr(1);
               register(createRepo(repository_name));
           });
       } catch(ex) {
           sys.log(ex);
       }
    });
}

/*
* @param {string} path
*/
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

function version() { 
	sys.puts('GrowlHub version 1.0');
	var child = growl.binVersion(function(err, version){
		sys.puts(version);
	})
	// also post to growl so we know it's configured correctly
	growl.notify('GrowlHub version 1.0', {
		'image': 'github-logo-128.png',
		'name': 'growlhub',
		'sticky' : opts.get('sticky') === true
	}, function(res){});
}

var options = [
	{
		short: 'v',
		long: 'version',
		description: 'Show version information',
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
	{
		long: 'sticky',
		description: 'sticky growl notifications'
	},
	{
		short: 'a',
		long: 'all',
		description: 'Track all watched repositories on github (read login from .git or --login)'
	}];
var arguments = [
	{
		name: 'repository',
		required: false,
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

if (opts.get('version') === true) {
	version();
}
else if (opts.get('help') === true){
	opts.help();
}
else if(opts.get('all') === undefined && opts.args().length === 0) {
	sys.puts('repository or --all required');
	opts.help();
}
else if (opts.get('all') === true) {
	registerAll();
} else if (opts.args()) {
	opts.args().forEach(function(path){
		register(createRepo(path));
	})
}
