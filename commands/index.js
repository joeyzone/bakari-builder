// command - init
'use strict';

var program = require('commander'),
	cli = {};

var createCommand = function( command ){

	program.command(command._info.flags[0])
		.action(command)
		.description(command._info.shortDesc);

	// has short
	if ( command._info.Short ) {
		cli[command._info.Short] = command;
		program.command(command._info.flags[0].replace( command._info.name, command._info.Short))
			.action(command)
			.description('like `'+command._info.name+'`, just short');
	}

};

cli.init = require('./init.js');
createCommand(cli.init);

cli.lib = require('./lib.js');
createCommand(cli.lib);

cli.widget = require('./widget.js');
createCommand(cli.widget);

cli.common = require('./common.js');
createCommand(cli.common);

cli.biz = require('./biz.js');
createCommand(cli.biz);

cli.build = require('./build.js');
createCommand(cli.build);

cli.timestamp = require('./timestamp.js');
createCommand(cli.timestamp);

cli.dev = require('./dev.js');
createCommand(cli.dev);

cli.config = require('./config.js');
createCommand(cli.config);

cli.ver = require('./ver.js');
createCommand(cli.ver);

cli.fix = require('./fix.js');
createCommand(cli.fix);

cli.open = require('./open.js');
createCommand(cli.open);

// cli.cache = require('./cache.js');
// createCommand(cli.cache);

cli.help = require('./help.js');
createCommand(cli.help);

module.exports = cli;