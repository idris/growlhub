#!/usr/local/bin/node

var sys = require('sys'),
    url = require('url'),
	github = require('./vendor/github'),
	growl = require('./vendor/growl'),
	opts = require('./vendor/opts');


var repos = [];
// watchPrivateFeed keeps track of the last n commit id's it's seen
var seen_commits = [];

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
function watchPrivateFeed(){
    hub.private_feed.list(function(data) {
        if(typeof(interval) == 'undefined'){
            interval = setInterval(watchPrivateFeed, opts.get('t') || 30000);
        } 
        var i=0, new_id=null;
        for(;i<data.length;i+=1){
            var d = data[i];
            // skip these types of events in your user stream
            // TODO: really just need to figure out how to format notification's for these events
            if (['FollowEvent', 'PublicEvent', 'WatchEvent', 'CreateEvent', 'DeleteEvent', 'MemberEvent'].indexOf(d.type) !== -1) {
                continue;
            }
            var commit_id = d.sha || d.payload.commit || d.payload.head || d.payload.issue;
            if (seen_commits.indexOf(commit_id) !== -1) {
                return;
            }
            seen_commits.push(commit_id);
            
            if (opts.get('debug') === true) {
                sys.puts(sys.inspect(d));
                sys.log('marging as seen id' + commit_id);
            }
            
            // notify
            var repo = d.repository.name;
            if (d.type === "IssuesEvent") {
                // create/close issue
                var message = d.actor + ' ' + d.payload.action + ' Issue ' + d.payload.number;
                var title = repo + ' Issue ' + d.payload.action;
                growl.notify(message, {
                    'title': title,
                    'image': 'github-logo-128.png',
                    'name': 'growlhub',
                    'sticky' : opts.get('sticky') === true
                }, function(res){});
            }
            else if (d.type === "GistEvent") {
                // create/? Gist
                var message = d.payload.snippet;
                var title = d.actor + ' ' + d.payload.action + ' ' + d.payload.name;
                growl.notify(message, {
                    'title': title,
                    'image': 'github-logo-128.png',
                    'name': 'growlhub',
                    'sticky' : opts.get('sticky') === true
                }, function(res){});
            }
            else if (d.payload && d.payload.shas && d.payload.shas.length >= 1 && d.type === "PushEvent") {
                // code commit message. this could include several commits
                d.payload.shas.forEach(function(commit) {
                    if (opts.get('debug') === true){
                        sys.puts(sys.inspect(commit));
                    }
                    var message = 'by ' + commit[3] + '\n' + commit[2], title="Commit to " + repo;
                    growl.notify(message, {
                        'title': title,
                        'image': 'github-logo-128.png',
                        'name': 'growlhub',
                        'sticky' : opts.get('sticky') === true
                    }, function(res){});
                });
            } else if (d.type == "CommitCommentEvent") {
                // TODO: go fetch the comment contents
                growl.notify("by " + d.actor, {
                    'title': "Comment on " + repo,
                    'image': 'github-logo-128.png',
                    'name': 'growlhub',
                    'sticky' : opts.get('sticky') === true
                }, function(res){})
            } else {
                var actor = d.actor;
                growl.notify([actor, "on", repo].join(' '), {
                    'title': d.type,
                    'image': 'github-logo-128.png',
                    'name': 'growlhub',
                    'sticky' : opts.get('sticky') === true
                }, function(res){})
            }
        }
    })
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
    	short: 'd',
    	long: 'debug',
    	description: 'Print Debug information',
    },
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
});

if (opts.get('t') !== undefined && opts.get('t') < 1000)  {
    sys.puts('--interval must be in miliseconds, not seconds');
    opts.help();
    process.exit(1);
}

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
	watchPrivateFeed();
} else if (opts.args()) {
	opts.args().forEach(function(path){
		register(createRepo(path));
	})
}
