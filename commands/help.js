// command - help
'use strict';

var helper = require('../lib/helper'),
	program,
	colors,
	Table,
	helper,
	_;

var initer = helper.init(function(){
	program = require('commander');
	colors = require('ansi-256-colors');
	Table = require('cli-table');
	helper = require('../lib/helper');
	_ = require('underscore');
});

var help = function( command ){

	initer();
	hook.beforeCommand();
	
	if ( typeof command !== 'string' ) {
		program.outputHelp();
	}

	if ( cli[command] !== undefined && cli[command]._info ) {
		help._outputHelp(cli[command]._info);
	}

	hook.afterCommand();

};

help._outputHelp = function( data ){

	var tableConfig = {
	    chars: { 'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': ''
         , 'bottom': '' , 'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': ''
         , 'left': '' , 'left-mid': '' , 'mid': '' , 'mid-mid': ''
         , 'right': '' , 'right-mid': '' , 'middle': ' ' },
  		style: { 'padding-left': 8, 'padding-right': 0 }
	},
	argsTable = new Table(tableConfig),
	methodTable = new Table(tableConfig),
	optionTable = new Table(tableConfig);
	
	// short
	if ( data.Short ) {
		console.log('\n'+colors.fg.getRgb(0,2,5)+'Short:\n'+colors.reset+'\n\t'+data.Short);
	}
	
	// usage
	console.log('\n'+colors.fg.getRgb(0,2,5)+'Usage:\n'+colors.reset);

	_.each( data.flags, function(v){
		console.log('\tbakari '+v);
	});

	console.log('');
	// description
	console.log(colors.fg.getRgb(0,2,5)+'Description:'+colors.reset+'\n\n\t'+data.longDesc+'\n');

	// check has method
	if ( !_.isEmpty(data.method) ) {

		console.log(colors.fg.getRgb(0,2,5)+'Method:'+colors.reset+'\n');
		_.each( data.method, function(v, k){
			methodTable.push([
				colors.fg.getRgb(0,4,5)+k+colors.reset,
				v
			]);
		});
		console.log(methodTable.toString()+'\n');

	}

	// check has args
	// args table
	if ( !_.isEmpty(data.args) ) {

 		console.log(colors.fg.getRgb(0,2,5)+'Arguments:'+colors.reset+'\n');
		_.each( data.args, function(v, k){
			argsTable.push([
				colors.fg.getRgb(0,4,5)+k+colors.reset,
				v
			]);
		});
		console.log(argsTable.toString()+'\n');

	}

 	// check has options
 	// options tabls
 	if ( data.options && data.options.length > 0 ) {

 		console.log(colors.fg.getRgb(0,2,5)+'Valid options:'+colors.reset+'\n');
		_.each( data.options, function(v){
			_.find( program.options, function(ov){
				if ( ov.short === v ) {
					optionTable.push([
						colors.fg.getRgb(0,4,5)+ov.flags+colors.reset,
						ov.description
					]);
					return;
				}	
			});
		});
		console.log(optionTable.toString());

 	}

	console.log('\n');

};

module.exports = help;

// info
module.exports._info = {
	name : 'help',
	flags : [
		'help [<sub-command>]'
	],
	method : {},
	args : {
		'sub-command' : 'Need help sub-command'
	},
	longDesc : 'Show specific command',
	shortDesc : 'Show specific command',
	options : ['-t']
};


