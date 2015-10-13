// command - lib
'use strict';

var helper = require('../lib/helper'),
	Promise,
	colors,
	_,
	archy,
	inquirer,
	cache,
	indent,
	tree,
	libManager;
	
var initer = helper.init(function(){
	Promise = require('bakari-promise');
	colors = require('ansi-256-colors');
	_ = require('underscore');
	archy = require('archy');
	inquirer = require('inquirer');
	cache = require('../lib/cache');
	indent = require('indent-string');
	tree = require('../lib/tree');
	libManager = require('../lib/lib');
});

// option : forced download
var forcedDownload = false;
var lib = function( method, name ){

	initer();
	hook.beforeCommand();
	
	// check method
	if ( typeof method !== 'string' ) {
		helper.log('error', 'you must input method, see help : `bakari help lib`');
		return;
	}

	// check name
	if ( ( method === 'add' ||
		   method === 'rm' ||
		   method === 'search' ) &&
			typeof name !== 'string' ) {
		helper.log('error', 'you must input name or keyword, see help : `bakari help lib`');
		return;
	}

	// check version
	var version;
	if ( arguments[2].parent.useVersion ) {
		version = arguments[2].parent.useVersion
	}

	// check forced download
	if ( arguments[2].parent.forcedDownload ) {
		forcedDownload = true;
	}

	lib.fn.run( method, name, version );

};

// ========================================
// Tool Function
// ========================================
lib.fn = {};
lib.fn.run = function( method, name, version ){
	if ( typeof lib[method] === 'function' ) {
		lib[method].call(this, name, version).always(hook.afterCommand);
	} else {
		helper.log('error', 'no this command, use `bakari help lib` check all lib commands');
		hook.afterCommand();
	}
};

// ========================================
// Sub Command
// ========================================
lib.add = function( name, version ){

	initer();
	
	var promise = Promise(),
		data = {},
		libFileExistsCheck = libManager.libFileExistsCheck,
		libFileReset = libManager.libFileReset;

	// if name is local path
	var installResult;
	if ( name.search('/') !== -1 ) {

		libManager.customInstall( name, {
			forcedDownload : forcedDownload
		})
		.done(function(){
			promise.resolve();
		})
		.fail(function(){
			promise.reject();
		});

	} else if ( version ) {

		// check has lib config
		if ( libFileExistsCheck( name, version ) ) {
			promise.reject();
			return promise;
		}	

		// check has lib files
		libFileReset( name, version );

		libManager.install([{
			name : name,
			version : version
		}], {
			forcedDownload : forcedDownload
		})
		.done(function(){
			promise.resolve();
		})
		.fail(function(){
			promise.reject();
		});

	} else {

		libManager.bowerCommand
		.info(name)
		.done(function(info){

			// check has lib config
			if ( libFileExistsCheck( info.name, info.version[0] ) ) {
				promise.reject();
				return promise;
			}	

			libManager.install([{
				name : info.name,
				version : info.version[0]
			}], {
				forcedDownload : forcedDownload
			})
			.done(function(){
				promise.resolve();
			})
			.fail(function(){
				promise.reject();
			});

		});

	}

	return promise;

};

lib.rm = function( name, version ){

	initer();

	var promise = Promise(),
		data = {};

	if ( version ) {

		libManager.uninstall([{
			name : name,
			version : version
		}])
		.done(function(){
			tree.build();
			promise.resolve();
		})
		.fail(function(){
			promise.reject();
		});

	} else {

		var liblist = cache.get('liblist');

		if ( liblist === undefined || liblist[name] === undefined ) {
			helper.log('error', 'project not install '+name+'.');
			promise.reject();
			return promise;
		}

		var removeData = [];
		_.each( liblist[name], function(v){
			removeData.push({
				name : v.name,
				version : v.version
			});
		});

		libManager.uninstall(removeData)
		.done(function(){
			tree.build();
			promise.resolve();
		})
		.fail(function(){
			promise.reject();
		});

	}

	return promise;

};

lib.search = function( keyword ){

	initer();

	var promise = Promise();
	
	libManager.bowerCommand.search( keyword )
	.done(function( results ){

		if ( results.length > 0 ) {

			helper.log(results.length+' results :');
			_.each( results, function(v){
				console.log( v.name + ' : ' + v.url );
			});

		} else {
			helper.log('no results');
		}

		promise.resolve();

	})
	.fail(function(){
		promise.reject();
	});

	return promise;

};

lib.list = function(){

	initer();
	
	var promise = Promise(),
		list = cache.get('liblist'),
		libnum = 0;

	var libs = [], str;
	_.each( list, function(lv){
		_.each( lv, function(v,k){
			libnum++;
			libs.push( v.name + '@' + v.version);
		});
	});

	helper.log( 'lib list', 'project has ' + libnum + ' libs, in ' + P.root + P.path + B.src.lib );

	// if libs is null, don't show library table
	if ( !_.isEmpty(libs) ) {

		str = archy({
			label : 'Library',
			nodes : libs
		});
		console.log(str);
		
	}

	promise.resolve();
	return promise;

};

lib.info = function( name, version ){

	initer();
	
	var promise = Promise();

	var outputInfo = function( name, version ){
		
		var info = cache.get('lib', name+'@'+version);

		// if info not found
		if ( info === undefined ) {
			helper.log('error', 'info not found');
			promise.reject();
			return;
		}

		// add path
		info.path = P.root+P.path+B.src.lib+'/'+info.dir+'/';

		helper.log('lib info', info.name+'@'+info.version);
		helper.loglist(info);
		console.log('\nchild:');
		tree.get().showChild('lib:'+name+'@'+version);
		console.log('parent:');
		tree.get().showParent('lib:'+name+'@'+version);
		promise.resolve();

	};

	var selectVersion = function( name ){
			
		var choices = _.keys(cache.get('liblist')[name]);

		// if not choiced
		if ( choices.length === 0 ) {
			helper.log('error', 'info not found');
			promise.reject();
			return;
		}

		// if just one choices
		if ( choices.length === 1 ) {
			outputInfo( name, choices[0] );
			return;
		}



		inquirer.prompt([
			{
				name : 'version',
				type : 'list',
				message : 'choose version:',
				choices : choices
			}
		], function( answers ) {

			outputInfo( name, answers.version );
			
		});

	};

	// if libs is null, just return
	if ( _.isEmpty(cache.get('liblist')) ) {
		helper.log('note', 'libaray is null');
		promise.reject();
		return promise;
	}

	// if has version
	if ( version ) {

		outputInfo( name, version );

	} else if ( name ){

		selectVersion( name );

	} else {

		inquirer.prompt([
			{
				name : 'name',
				type : 'list',
				message : 'choose lib:',
				choices : _.keys(cache.get('liblist'))
			}
		], function( answers ) {

			selectVersion( answers.name );

		});

	}

	return promise;

};

lib.clean = function(){

	initer();
	
	var promise = Promise();

	promise
	.done(function(){
		helper.log('clean', 'lib cleared');
	})
	.fail(function(){
		helper.log('clean', 'lib clean fail, try again');
	});

	helper.log('clean', 'start');

	// reset libs
	var jsLibPath = P.root + P.path + B.src.lib,
		liblist = cache.get('liblist'),
		libs = [];

	// rm path
	if ( exists( jsLibPath ) ) {
		del( jsLibPath );
	}

	// re mkdir
	mkdir( jsLibPath );

	// if lib is null, return;
	if ( _.isEmpty(liblist) ) {
		helper.log('note', 'libaray is null');
		promise.resolve();
		return promise;
	}

	_.each( liblist, function(lv){
		_.each( lv, function(v){
			libs.push(v);
		});
	});

	libManager
	.install( libs, {
		showNote : true,
		forcedDownload : forcedDownload
	})
	.done(function(){
		promise.resolve();
	})
	.fail(function(){
		promise.reject();
	});
	
	return promise;

};

lib.cache = function(){

	initer();
	
	var promise = Promise(),
		list = cache.get('cache', 'lib'),
		str;

	helper.log( 'cache', list.length + ' libs cached' );

	// if list is null, don't show library table
	if ( list.length === 0 ) {
		promise.resolve();
		return promise;
	}

	str = archy({
		label : 'Library Cache',
		nodes : list
	});
	console.log(str);

	promise.resolve();
	return promise;

};

module.exports = lib;

// info
module.exports._info = {
	name : 'lib',
	flags : [
		'lib <method> [<name>]',
		'lib <method> [<name|keyword>] [-v <version>] [-D] [-t]',
		'lib add <name> [-v <version>] [-D] [-t]',
		'lib add <folder> [-t]',
		'lib rm <name> [-v <version>] [-t]',
		'lib info [<name>] [-v <version>]',
		'lib search <keyword> [-t]',
		'lib list [-t]',
		'lib clean [-D] [-t]',
		'lib cache [-t]'
	],
	method : {
		'add' : 'Add a library',
		'rm' : 'Remove a library',
		'info' : 'Display library detail',
		'search' : 'Use keywords to find the library',
		'list' : 'Display all the libraries in the project',
		'clean' : 'Clear library dir',
		'cache' : 'Display local library cache'
	},
	args : {
		'method' : 'Operation type',
		'name' : 'Select the lib name',
		'folder' : 'A local javascript folder',
		'keyword' : 'Search lib keyword',
		'version' : 'Select the lib version'
	},
	longDesc : '对项目的库进行操作，可以添加、移除、搜索、清理库，查看库列表及详情。',
	shortDesc : 'change libs for project',
	options : ['-v', '-D', '-t']
};
