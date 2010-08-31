GrowlHub
========
GrowlHub is a script that will watch specified [Github](http://github.com/)
repositories and [growl](http://growl.info/) whenever a new commit is pushed
to Github.


Requirements
------------
- [growl](http://growl.info/) (including [growlnotify](http://growl.info/documentation/growlnotify.php))
- [node.js](http://nodejs.org/)


Usage
-----

To track one or more repositories:

`node growlhub.js user/repository/branch`

To track your github.com user/repository watch list

`node growlhub.js --all`

For more options:

`node growlhub.js --help`