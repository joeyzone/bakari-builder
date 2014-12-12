#!/usr/bin/env node
// ==================================================
// bakariBuilder 0.0.1
// ==================================================
'use strict';
var chalk = require('chalk');
var inquirer = require('inquirer');
var moment = require('moment');
var program = require('commander');
var shell = require('shelljs');
var grunt = require('grunt');
var bower = require('bower');
var _ = require('underscore');
var Promise = require('./lib/promise.js');
var extend = require('extend');
var resetBowerConfig = require('./node_modules/bower/lib/config').reset;

// ==================================================
// builder config
// ==================================================
var builder = {

	// js root path
	jsPath : '/script',

	// js 目录 相对于jsPath
	jsDir : {

		dev : '/dev',
		pro : '/pro',

		src : '/src',
		lib : '/src/lib',
		biz : '/src/biz'

	},

	// bower config
	bowerrcPath : '/.bowerrc',

	// builder config path
	builderPath : '/.bakari-builder',

	// libs config file
	libConfig : '/.bakari-builder/libs',

	// project config file
	projectConfig : '/.bakari-builder/project.json'

};

// ==================================================
// project config
// ==================================================
var project = {

	// 项目名称
	name : null,

	// 项目根目录
	rootPath : null,

	// 初始化js
	initJs : null,

	// 项目js目录
	jsPath : null,

	// 配置最后更新
	lastupdate : null,

	// lib信息 @notsave
	libs : {}

};

// ==================================================
// bowerrc config
// ==================================================
var bowerrc = {
	directory : null
};

// ==================================================
// helper
// ==================================================
var helper = {

	log : function( status, msg ){
		console.log( chalk.red('bakari ') + chalk.green(status.toLocaleUpperCase()+' ') + (msg || '') );
	},

	// 保存项目配置
	saveProjectConfig : function(){
		delete project.libs;
		project.lastupdate = moment().format('YYYY-MM-DD HH:mm:ss');
		grunt.file.write( project.rootPath+builder.projectConfig, JSON.stringify( project ) );
	}

};


// ==================================================
// lib function
// ==================================================
var lib = {

	// 根据名称搜索包信息
	search : function( libs ){
		
		var promise = Promise(),
			info = {},
			num = libs.length;

		_.each( libs, function(v,k){
			
			helper.log('search', v);

			bower.commands
			.info(v)
			.on('end', function (results) {

				var pkg = results.name,
					version = results.versions[0]; //取最新版本

				info[pkg] = {};
				info[pkg][version] = {
					dir : pkg + '-' + version,
					version : version,
					pkg : pkg
				}

				if ( !--num ) {
					promise.resolve( info );
				}

			});

		});

		return promise;

	},

	// 安装包
	install : function( libs, cfg ){

		cfg = extend(true, {
			note : 'installed',
			showGet : true
		}, cfg);

		var promise = Promise(),
			num = 0;

		_.each(libs, function(lv){
			_.each(lv, function(v,k){

				num++;
			
				var installName = v.dir+'='+v.pkg+'#'+v.version;

				bower.commands
				.install([installName], { save: true }, {})
				.on('log', function( data ){
					if ( data.level === 'info' && cfg.showGet  ) {
						helper.log('get', v.pkg+'#'+v.version + ' : ' + data.message);
					}
				})
				.on('end', function(installed){

					_.find(installed, function(){

						helper.log( cfg.note, v.pkg + '@' + v.version );

						// set config
						grunt.file.mkdir(project.rootPath + builder.libConfig + '/' + v.pkg);
						grunt.file.write(project.rootPath + builder.libConfig + '/' + v.pkg + '/' + v.version + '.json', JSON.stringify(v));

						if ( !--num ) {
							promise.resolve();
						}
						return true;

					});
					
				})
				.on('error', function(error){
					helper.log('error', v.pkg + '#' + v.version + ' : ' + error.details);
				});

			});
		});

		return promise;

	},

	// 卸载包
	uninstall : function( libs, cfg ){
		
		cfg = extend(true, {
			note : 'uninstalled'
		}, cfg);

		var promise = Promise(),
			num = 0;

		_.each(libs, function(lv){
			_.each(lv, function(v,k){

				num++;

				bower.commands
				.uninstall([v.dir], { save: true }, {})
				.on('end', function(uninstall){

					// set config
					var libConfig = project.rootPath + builder.libConfig + '/' + v.pkg + '/' + v.version + '.json',
						libDir = project.rootPath + builder.libConfig + '/' + v.pkg,
						libNum = 0;

					if ( grunt.file.exists(libDir) ) {

						if ( grunt.file.exists(libConfig) ) {
							grunt.file.delete(libConfig);
							helper.log( cfg.note, v.pkg + '@' + v.version );
						} else {
							helper.log( 'error', 'project not install ' + v.pkg + '@' + v.version );
						}

						grunt.file.recurse( libDir, function(abspath, rootdir, subdir, filename){
							libNum++;
						});

						if ( libNum === 0 ) {
							grunt.file.delete(libDir);
						}

					} else {
						helper.log( 'error', 'project not install ' + v.pkg );
					}

				})
				.on('error', function(error){
					helper.log('error', v.pkg + '#' + v.version + ' : ' + error.details);
				});


			});
		});

		return promise;

	},

	// 卸载所有的包
	uninstallAll : function( cfg ){
		// TODO
	},

};

var cli = {};

// ==================================================
// loading project
// ==================================================
// load project config
if ( grunt.file.exists( shell.pwd() + builder.projectConfig ) ){
	project = extend( true, project, grunt.file.readJSON( shell.pwd() + builder.projectConfig ) );
}

// load libs config
grunt.file.recurse( shell.pwd() + builder.libConfig, function(abspath, rootdir, subdir, filename){

	if ( project.libs[subdir] === undefined ) {
		project.libs[subdir] = {};
	}

	project.libs[subdir][filename.replace(/\.json$/,'')] = grunt.file.readJSON( abspath );
	
});

// ==================================================
// command
// ==================================================
// init @early
cli.init = function(){
		
	var promise = Promise();
	promise.done(function(){
		helper.saveProjectConfig();
		helper.log('initialization complete', '');
	});

	inquirer.prompt([
		{
			name : 'rootPath',
			type : 'input',
			message : 'project root path:',
			default : shell.pwd()
		},
		{
			name : 'projectName',
			type : 'input',
			message : 'project name:',
			default : project.name
		},
		{
			name : 'initJs',
			type : 'confirm',
			message : 'init javascript?',
			default : (project.initJs === null ) ? true : project.initJs
		},
		{
			name : 'jsPath',
			type : 'input',
			message : 'javascript path:',
			default : builder.jsPath,
			when : function(answers){
				return answers.initJs;
			}
		},
		{
			name : 'libs',
			type : 'checkbox',
			message : 'use lib:',
			choices : [
				'jquery',
				'underscore',
				'js-md5',
				'json3',
				'moment',
				'js-base64',
				'jquery.cookie'
			],
			when : function(answers){
				return answers.jsPath;
			}
		}
		// {
		// 	name : 'initJavascript',
		// 	type : 'confirm',
		// 	message : 'init javascript?',
		// 	default : (buildConfig.initJs === null ) ? true : buildConfig.initJs
		// },
		// 
	], function( answers ) {

		// get project root path
		project.rootPath = answers.rootPath;

		// make dir
		grunt.file.mkdir( project.rootPath+builder.builderPath );

		// make lib config dir
		grunt.file.mkdir( project.rootPath+builder.libConfig );

		// get project name
		project.name = answers.projectName;

		// set project js path
		project.jsPath = answers.jsPath || builder.jsPath;

		// set init js
		project.initJs = answers.initJs;

		// make js dir
		if ( answers.initJs && answers.jsPath ) {
			_.each( builder.jsDir, function(v){
				grunt.file.mkdir( project.rootPath+project.jsPath+v );
			});
		}

		// make bowerrc & libs
		if ( answers.libs && answers.libs.length > 0 ) {

			bowerrc.directory = '.' + project.jsPath + builder.jsDir.lib;
			grunt.file.write( project.rootPath+builder.bowerrcPath, JSON.stringify(bowerrc) );
			resetBowerConfig();

			lib
			.search( answers.libs )
			.done(function(data){
				lib
				.install(data)
				.done(function(){
					promise.resolve();
				});
			});

		} else {
			promise.resolve();
		}

	});

	return promise;

};
program
	.command('init')
	.description('init project')
	.action(cli.init);

// clean @early
cli.clean = function(){
	
	var promise = Promise();
	promise.done(function(){
		helper.log('cleared project');
	});
	
	// reset bowerrc
	bowerrc.directory = '.' + project.jsPath + builder.jsDir.lib;
	grunt.file.write( project.rootPath+builder.bowerrcPath, JSON.stringify(bowerrc) );
	resetBowerConfig();
	helper.log('cleared', '.bowerrc');

	// reset libs
	cli.cleanlib()
	.done(function(){
		promise.resolve();
	});

	return promise;

};
program
	.command('clean')
	.description('clean project')
	.action(cli.clean);

// test @early
cli.test = function(){
	helper.log('run builder');
};
program
	.command('test')
	.description('just test builder')
	.action(cli.test); 

// addlib @early
cli.addlib = function(name){
	
	// check name
	if ( typeof name !== 'string' ) {
		helper.log('error', 'you must input a package name');
		return;
	}

	var version, promise = Promise();

	if ( arguments[1].parent.useVersion ) {
		version = arguments[1].parent.useVersion
	}

	if ( version ) {

		var data = {};
		data[name] = {};
		data[name][version] = {
			dir : name + '-' + version,
			pkg : name,
			version : version
		};

		lib
		.install(data)
		.done(function(){
			promise.resolve();
		})

	} else {

		lib
		.search([name])
		.done(function(data){
			lib
			.install(data)
			.done(function(){
				promise.resolve();
			})
		});

	}

	return promise;

};
program
	.command('addlib')
	.description('add a package for project')
	.action(cli.addlib); 

// rmlib @early
cli.rmlib = function(name){

	// check name
	if ( typeof name !== 'string' ) {
		helper.log('error', 'you must input a package name');
		return;
	}

	var version, promise = Promise();

	if ( arguments[1].parent.useVersion ) {
		version = arguments[1].parent.useVersion
	}

	if ( version ) {

		var data = {};
		data[name] = {};
		data[name][version] = {
			dir : name + '-' + version,
			pkg : name,
			version : version
		};
		lib.uninstall(data)
		.done(function(){
			promise.resolve();
		});

	} else {

		var data = {};
		data[name] = project.libs[name];

		if ( data[name] === undefined ) {
			helper.log('error', 'project not install '+name+'.');
			return;
		}

		lib.uninstall(data)
		.done(function(){
			promise.resolve();
		});

	}

	return promise;

};
program
	.command('rmlib')
	.description('remove a package from project')
	.action(cli.rmlib);

// cleanlib @early
cli.cleanlib = function(){

	var promise = Promise();

	// reset libs
	var jsLibPath = project.rootPath + project.jsPath + builder.jsDir.lib;
	if ( grunt.file.exists( jsLibPath ) )
	grunt.file.delete( jsLibPath );

	lib
	.install(project.libs, {
		showGet : false,
		note : 'cleared'
	})
	.done(function(){
		promise.resolve();
	});

	return promise;

};
program
	.command('cleanlib')
	.description('clean libs')
	.action(cli.cleanlib);

// liblist @early
cli.liblist = function(){

	var promise = Promise();

	console.log('project ' + chalk.cyan( project.name ) + '\t' + project.rootPath + project.jsPath + builder.jsDir.lib );

	var libs = [];
	_.each( project.libs, function(lv){
		_.each( lv, function(v,k){
			libs.push(v.pkg + '@' + v.version);
		});
	});

	_.each( libs, function(v,k){
		if ( (k+1) === libs.length ) {
			console.log( '└──' + v );	
		} else {
			console.log( '├──' + v );	
		}
	});

	promise.resolve();
	return promise;

};
program
	.command('liblist')
	.description('package info')
	.action(cli.liblist);

// ==================================================
// option
// ==================================================
program.option('-v, --use-version <version>', 'specify a version');

// ==================================================
// program
// ==================================================
program.version('0.0.1');
program.parse(process.argv);
