#!/usr/bin/env node
// ==================================================
// bakariBuilder
// ==================================================
'use strict';
var startTime = +new Date();
var version = '0.1.1';
var program = require('commander'),
	extend = require('extend'),
	grunt = require('grunt'),
	junk = require('junk'),
	helper = require('./lib/helper'),
	updateNotifier = require('update-notifier'),
	cli = require('./commands/');

// ==================================================
// builder config
// ==================================================
global.buildrc = './.buildrc';
global.B = {

	// default bakari root path
	path : '/static',

	dir : {

		pro : '/pro',
		dev : '/dev',
		src : '/src',

	},

	// js 目录 相对于jsPath
	src : {

		lib : '/src/lib',
		widget : '/src/widget',
		biz : '/src/biz',
		common : '/src/common',

		jsBiz : '/src/biz/js',
		jsCommon : '/src/common/js',

		cssBiz : '/src/biz/css',
		cssCommon : '/src/common/css',

		htmlBiz : '/../application/views/screen'

	},

	htmlFileSuffix : '.php',

	// js 文件
	file : {
		jsVersion : '/pro/.jsVersion',
		cssVersion : '/pro/.cssVersion'
	},

	jsCfg : {

		lib : '/lib',
		widget : '/widget',

		jsBiz : '/biz/js',
		jsCommon : '/common/js',

		cssBiz : '/biz/css',
		cssCommon : '/common/css'

	},

	// template
	tpl : {

		root : '/.tpl',

		jsCommon : '/.tpl/.common.js',
		cssCommon : '/.tpl/.common.css',

		jsBiz : '/.tpl/.biz.js',
		cssBiz : '/.tpl/.biz.css'

	},

	// cache dir
	cache : {

		lib : '/cache/lib',
		widget : '/cache/widget'

	},

	// builder config path
	builderPath : '/.bakari-builder',

	// bower config
	bowerrcPath : '/.bowerrc',

	// jshint config
	jshintrcPath : '/.jshintrc',

	// ugfilyjs config
	ugfilyrcPath : '/.ugfilyrc',

	// builder version file
	versionFile : '/.bakari-builder/.version',

	// project config file
	projectConfig : '/.bakari-builder/project.json',

	// tree config file
	treeData : '/.bakari-builder/tree.json',

	// bakari local config
	localConfig : {
		windows : '',
		unix : '~/'
	}

};

// ==================================================
// project config
// ==================================================
global.P = {

	// 项目名称
	name : null,

	// 项目根目录
	root : '.',

	// bakari 目录
	path : null,

	widget : {
		
		enable : false,
		source : null,

		list : null,
		info : null,
		doc : null,
		src : null

	}

};


// ==================================================
// hook
// ==================================================
global.hook = {

	afterCommand : function(){
		
		if ( program.timing ) {
			var runTime = +new Date() - +startTime;
			helper.log('runtime', runTime+'ms');
		}

		// Check for newer version of builder
		var pkg = require('./package.json');
		var notifier = updateNotifier({
		    packageName: pkg.name,
		    packageVersion: pkg.version,
		    updateCheckInterval: 1000*60*60*1
		});

		if (notifier.update && pkg.version !== notifier.update.latest) {
		    notifier.notify();
		}

	},

	beforeCommand : function(){
		
		// check version & run update script
		helper.checkUpdate();

	}

};


// ==================================================
// alias
// ==================================================
global.readJSON = grunt.file.readJSON;
global.read = grunt.file.read;
global.exists = grunt.file.exists;
global.mkdir = grunt.file.mkdir;
global.write = function(){
	// TODO debug
	// helper.log('debug', 'write '+arguments[0]);
	grunt.file.write.apply(this, arguments);
};
global.recurse = function(src, callback){
	
	grunt.file.recurse(src, function(abspath, rootdir, subdir, filename){
		if ( !junk.is(filename) ){
			callback.apply(this, arguments);
		}
	});

};
global.copy = grunt.file.copy;
global.del = grunt.file.delete;
global.cli = cli;
// config - dev build mode
global.devBuild = false;
global.v = version;

// ==================================================
// loadData
// ==================================================
// load builder config
if ( exists(buildrc) ) {
	B = extend(true, B, readJSON(buildrc));
}

// load project config
if ( exists(P.root + B.projectConfig) ) {
	P = extend(true, P, readJSON(P.root + B.projectConfig));
}

// ==================================================
// option
// ==================================================
program.option('-t, --timing', 'Uptime statistics');
program.option('-v, --use-version <version>', 'Specify a version');
program.option('-D, --forced-download', 'Forced download don\'t use cache');
program.option('-j, --js', 'Specify javascript');
program.option('-c, --css', 'Specify css');
program.option('-h, --html', 'Specify html');
program.option('-C, --complete-build', 'Complete build code');


// ==================================================
// program
// ==================================================
program.version('0.1.1');
program.command('*').description('').action(function(){
	helper.log('warning', 'no this command, use `bakari help` check all commands');
	hook.afterCommand();
});
program.parse(process.argv);

// catch null command
if ( helper.catchNullCommand() ){
	hook.beforeCommand();
	hook.afterCommand();
}
