// command - init
'use strict';

var helper = require('../lib/helper'),
	resetBowerConfig,
	inquirer,
	Promise,
	tplData,
	ncp,
	_;
	
var initer = helper.init(function(){
	resetBowerConfig = require('../node_modules/bower/lib/config').reset;
	inquirer = require('inquirer');
	Promise = require('bakari-promise');
	tplData = require('../data/tpl');
	ncp = require('ncp');
	_ = require('underscore');
});

var init = function(){

	initer();
	hook.beforeCommand();

	var promise = Promise();
	promise.done(function(){
		// helper.saveProjectConfig();
		helper.log('initialization complete', '');
	});

	// set project
	inquirer.prompt([
		{
			name : 'projectName',
			type : 'input',
			message : 'project name:',
			default : P.name
		},
		{
			name : 'path',
			type : 'input',
			message : 'javascript and css path:',
			default : P.path || B.path
		}
	], function( answers ) {

		// get project name
		P.name = answers.projectName;

		// set project js path
		P.path = answers.path || B.path;

		// make builder config dir
		mkdir( P.root+B.builderPath );

		// make js dir & src & config
		if ( answers.path ) {

			// mkdir dir
			_.each( B.dir, function(v){
				mkdir( P.root+P.path+v );
			});

			// mkdir src
			_.each( B.src, function(v){
				mkdir( P.root+P.path+v );
			});

			// mkdir cache
			_.each( B.cache, function(v){
				mkdir( P.root+B.builderPath+v );
			});

			// mkdir config
			_.each( B.jsCfg, function(v){
				mkdir( P.root+B.builderPath+v );
			});

			// make bowerrc
			write( P.root+B.bowerrcPath, JSON.stringify({
				directory : P.root + P.path + B.src.lib
			}) );
			resetBowerConfig();

			// copy require.js
			ncp( global.process.mainModule.filename.replace(/index\.js$/g,'data/require.js'), P.root + P.path + '/require.js' );

			// set default tpl
			write( P.root+B.tpl.jsBiz , tplData.biz.js );
			write( P.root+B.tpl.jsCommon , tplData.common.js );

		}

		// make tpl dir
		mkdir( P.root+B.tpl.root );

		// save project config
		write( P.root+B.projectConfig, JSON.stringify( P ) );

		promise.resolve();

	});


	promise.done(hook.afterCommand);
	return promise;

};

module.exports = init;

// info
module.exports._info = {
	name : 'init',
	flags : ['init'],
	method : {},
	args : {},
	longDesc : '初始化一个项目',
	shortDesc : 'init project',
	options : []
};
