// command - biz
'use strict';

var helper = require('../lib/helper'),
	Promise,
	_,
	archy,
	dev,
	build,
	inquirer,
	tree,
	cache;

var initer = helper.init(function(){
	Promise = require('bakari-promise');
	_ = require('underscore');
	archy = require('archy');
	dev = require('./dev');
	build = require('./build');
	inquirer = require('inquirer');
	tree = require('../lib/tree'),
	cache = require('../lib/cache');
});

var type = false;
var biz = function( method, name ){

	initer();

	hook.beforeCommand();
	
	// check method
	if ( typeof method !== 'string' ) {
		helper.log('error', 'you must input method, see help : `bakari help biz`');
		return;
	}

	// check name
	if ( ( method === 'rm' ||
		   method === 'set' ) &&
			typeof name !== 'string' ) {
		helper.log('error', 'you must input name, see help : `bakari help biz`');
		return;
	}

	// get type
	if ( arguments[2].parent.js ) {
		type = 'js';
	} else if ( arguments[2].parent.css ) {
		type = 'css';
	}

	var bizlist = cache.get('bizlist');

	// check js or css
	if ( ( method === 'add' ) && !type ) {

		inquirer.prompt([
			{
				name : 'type',
				type : 'list',
				message : 'choose type:',
				choices : ['js', 'css']
			}
		], function( answers ) {
			type = answers.type;
			biz.fn.run( method, name );
		});

	} else if ( ( method === 'rm' ||
				  method === 'set' ||
				  method === 'info' ) && !type ) {

		// if has name, check type is exists
		if ( name && bizlist && !bizlist.js[name] && bizlist.css[name] ) {
			type = 'css'
			biz.fn.run( method, name );
		} else if ( name && bizlist && bizlist.js[name] && !bizlist.css[name] ) {
			type = 'js'
			biz.fn.run( method, name );
		} else {

			inquirer.prompt([
				{
					name : 'type',
					type : 'list',
					message : 'choose type:',
					choices : ['js', 'css']
				}
			], function( answers ) {
				type = answers.type;
				biz.fn.run( method, name );
			});

		}

	} else if ( ( method === 'list' ||
				  method === 'clean' ) && !type ) {

		// has all option
		inquirer.prompt([
			{
				name : 'type',
				type : 'list',
				message : 'choose type:',
				choices : ['all', 'js', 'css']
			}
		], function( answers ) {
			type = (answers.type === 'all') ? false : answers.type ;
			biz.fn.run( method, name );
		});

	} else {
		biz.fn.run( method, name );
	}

};

// ========================================
// Tool Function
// ========================================
biz.fn = {};
biz.fn.run = function( method, name ){
	if ( typeof biz[method] === 'function' ) {
		biz[method].call(this, name).always(hook.afterCommand);
	} else {
		helper.log('error', 'no this command, use `bakari help biz` check all biz commands');
		hook.afterCommand();
	}
};

biz.fn.modifyBizFile = function( data ){
	
	var file = read(P.root + P.path + B.src[data.type+'Biz'] + '/' + data.name + '.'+data.type),
		code = '',
		con = /\{((\n|.)+)\}\)\;$/.exec(file);
	
	if ( con ) {
		code = con[1];
	}

	if ( data.type === 'js' ) {
		file = helper.renderFile( 'biz', data, code );
	}
	
	write( P.root + P.path + B.src[data.type+'Biz'] + '/' + data.name + '.'+data.type, file );

};

biz.fn.createBizFile = function( data ){

	// save biz file
	write( P.root + P.path + B.src[data.type+'Biz'] + '/' + data.name  + '.'+data.type,  helper.renderFile( 'biz', data ) );

};

biz.fn.createBiz = function( data ){

	// set config
	var promise = Promise(),
		bizInfo = {
			type : type,
			name : data.path,
			relyCommon : data.relyCommon,
			relyWidget : data.relyWidget,
			relyLib : data.relyLib
		},
		filename = data.path.replace(/\//g, '-');

	var configSrc = P.root + B.builderPath + B.jsCfg[type+'Biz'] + '/' + filename + '.json',
		fileSrc = P.root + P.path + B.src[type+'Biz'] + '/' + (data.path || data.name) + '.'+type;
	
	// save config file
	write( configSrc, JSON.stringify( bizInfo ) );

	biz.fn.createBizFile( bizInfo );

	// clean cache
	cache.clean('bizlist');

	// rebuild tree
	tree.build();

	// build new biz
	build.fn.list([type+'@'+(data.path || data.name)])
	.always(function(){
		helper.log('success', data.path + ' biz created, in '+fileSrc);
		promise.resolve();
	});

	return promise;

};

biz.fn.cleanFiles = function( type ){
	
	var promise = Promise(),
		surplus = [],
		hasfiles = [],
		fileSrc = P.root+P.path+B.src[type+'Biz']+'/',
		bizlist = cache.get('bizlist');

	// check surplus
	recurse( fileSrc, function(abspath, rootdir, subdir, filename){

		var reg = new RegExp('\.'+type+'$','g'),
			name = (subdir?(subdir+'/'):'') + filename.replace(reg,'');

		if ( bizlist[type][name] === undefined ) {
			surplus.push(rootdir+(subdir?(subdir+'/'):'')+filename);
		} else {
			hasfiles.push(name);
		}

	});

	// check del surplus files
	if ( surplus.length > 0 ) {
		inquirer.prompt([
			{
				name : 'del',
				type : 'checkbox',
				message : 'want remove surplus files?',
				choices : surplus,
				default : surplus
			}
		], function( answers ){

			_.each( answers.del, function(v){
				del( v );
				helper.log('remove file', v );
			});

			promise.resolve();

		});
	} else {
		promise.resolve();
	}

	promise.done(function(){

		// add missing files
		_.each( _.difference( _.keys(bizlist[type]), hasfiles ), function(v){
			
			biz.fn.createBizFile( bizlist[type][v] );
			helper.log('completion file', fileSrc+v+'.'+type);

		});

	});

	return promise;

};

// ========================================
// Sub Command
// ========================================
biz.add = function( name ){
	
	initer();
	
	var promise = Promise(),
		liblist = helper.getLibArray( type ),
		commonlist = cache.get('commonlist'),
		widgetlist = cache.get('widgetlist'),
		wlist = [];

	_.each( widgetlist, function(wv){
		_.each( wv, function(v){
			wlist.push(v.name+'@'+v.version);
		});
	});

	// set biz
	inquirer.prompt([
		{
			name : 'recheckType',
			type : 'confirm',
			message : 'create a '+type+' biz?'
		},
		{
			name : 'path',
			type : 'input',
			message : 'biz path:',
			default : name,
			when : function(answers){
				return answers.recheckType;
			}
		},
		{
			name : 'relyLib',
			type : 'checkbox',
			message : 'use lib:',
			choices : liblist,
			when : function(answers){
				return answers.path;
			}
		},
		{
			name : 'relyWidget',
			type : 'checkbox',
			message : 'use widget:',
			choices : wlist
		},
		{
			name : 'relyCommon',
			type : 'checkbox',
			message : 'use common:',
			choices : _.keys(commonlist[type]),
			when : function(answers){
				return answers.path;
			}
		}
	], function( answers ) {

		// check type is incorrect
		if ( answers.recheckType === false ) {

			helper.log('error', 'recheck type is fail');
			promise.reject();
			return;

		}

		// check name is null
		if ( !answers.path ) {

			helper.log('error', 'biz must have a path');
			promise.reject();
			return;

		}

		var filename = answers.path.replace(/\//g, '-'),
			configSrc = P.root + B.builderPath + B.jsCfg[type+'Biz'] + '/' + filename + '.json',
			fileSrc = P.root + P.path + B.src[type+'Biz'] + '/' + answers.path + '.'+type;

		// check config is exists
		if ( exists(configSrc) ) {
			helper.log('error', answers.path+' already exists in '+fileSrc+', if can\'t found file, use `bakari biz clean`');
			promise.reject();
			return;
		}

		// check file is exists
		if ( exists(fileSrc) ) {

			helper.log('warning', fileSrc+' already exists');
			inquirer.prompt([
				{
					name : 'replace',
					type : 'confirm',
					message : 'do you want replace?',
					default : false
				}
			], function( answers2 ){

				if ( answers2.replace ) {
					biz.fn.createBiz( answers )
					.done(function(){
						promise.resolve();
					});
				} else {
					promise.reject();
				}

			});
			
		} else {
			biz.fn.createBiz( answers )
			.done(function(){
				promise.resolve();
			});
		}

	});

	return promise;

};

biz.rm = function( name ){
	
	initer();
	
	var promise = Promise(),
		bizlist = cache.get('bizlist'),
		filename = name.replace(/\//g, '-'),
		configSrc = P.root + B.builderPath + B.jsCfg[type+'Biz'] + '/' + filename + '.json',
		fileSrc = P.root + P.path + B.src[type+'Biz'] + '/' + name + '.'+type;

	// check install
	if ( bizlist === undefined || bizlist[type][name] === undefined ) {
		helper.log('error', 'project not has ' + type + ' '+name+' biz');
		promise.reject();
		return promise;
	}

	// biz not need check rely

	// del file
	del( fileSrc );

	// del config
	del( configSrc );

	// clean cache
	cache.clean('bizlist');

	// rebuild tree
	tree.build();

	helper.log('success', type+' biz '+name+' removed');
	promise.resolve();
	return promise;

};

biz.list = function(){
	
	initer();
	
	var promise = Promise(),
		list = cache.get('bizlist'),
		jsnum = 0,
		cssnum = 0,
		jslist = [],
		csslist = [];

	var libs = [], str;
	_.each( list.js, function(v){
		jsnum++;
		jslist.push( v.name );
	});

	_.each( list.css, function(v){
		cssnum++;
		csslist.push( v.name );
	});

	helper.log( 'biz list', 'project has ' + (jsnum + cssnum) + ' bizs' );

	// if biz is null, don't show biz table
	if ( !_.isEmpty(jslist) && ( !type || type === 'js' ) ) {
		str = archy({
			label : 'JavaScript bizs('+jsnum+'), in '+P.root+P.path+B.src.jsBiz,
			nodes : jslist
		});
		console.log(str);
	}

	if ( !_.isEmpty(csslist) && ( !type || type === 'css' ) ) {
		str = archy({
			label : 'CSS bizs('+cssnum+'), in '+P.root+P.path+B.src.cssBiz,
			nodes : csslist
		});
		console.log(str);
	}

	promise.resolve();
	return promise;

};

biz.info = function( name ){
	
	initer();
	
	var promise = Promise(),
		bizlist = cache.get('bizlist');

	var outputInfo = function(){
		
		var info = bizlist[type][name];

		// if info not found
		if ( info === undefined ) {
			helper.log('error', 'info not found');
			promise.reject();
			return;
		}

		// add path
		info.path = P.root+P.path+B.src.jsBiz+'/'+info.name+'.js';

		helper.log('biz info', info.name);
		helper.loglist(info);
		console.log('\nparent:');
		tree.get().showParent('biz:'+info.name+'@'+info.type);
		promise.resolve();

	};

	var selectName = function(){

		var jsKeys = _.keys( bizlist.js ),
			cssKeys = _.keys( bizlist.css ),
			allKeys;

		if ( type === 'js' ) {
			allKeys = jsKeys;
		} else if ( type === 'css' ) { 
			allKeys = cssKeys;
		} else {
			allKeys = _.uniq( jsKeys.concat(cssKeys) )
		}

		inquirer.prompt([
			{
				name : 'name',
				type : 'list',
				message : 'choose biz name:',
				choices : allKeys
			}
		], function( answers ) {
			name = answers.name;
			outputInfo();
		});

	};

	// if biz is null, just return
	if ( _.isEmpty(bizlist.js) && _.isEmpty(bizlist.css) ) {
		helper.log('note', 'biz is null');
		promise.reject();
		return promise;
	}

	if ( !name ){
		selectName();
	} else {
		outputInfo();
	}

	return promise;

};

biz.clean = function(){
	
	initer();

	var promise = Promise();

	// clean css & js
	if ( !type ) {

		biz.fn.cleanFiles( 'js' )
		.done(function(){
			biz.fn.cleanFiles( 'css' )
			.done(function(){
				helper.log('cleared', 'all js and css file is clean');
				promise.resolve();				
			});
		});

	} else if ( type === 'js' ) {
		biz.fn.cleanFiles( 'js' )
		.done(function(){
			helper.log('cleared', 'all js file is clean');
			promise.resolve();
		});
	} else if ( type === 'css' ) {
		biz.fn.cleanFiles( 'css' )
		.done(function(){
			helper.log('cleared', 'all css file is clean');
			promise.resolve();
		});
	}

	return promise;

};

biz.set = function( name ){
	
	initer();
	
	var promise = Promise(),
		commonlist = cache.get('commonlist'),
		bizlist = cache.get('bizlist'),
		liblist = helper.getLibArray( type ),
		config = bizlist[type][name],
		widgetlist = cache.get('widgetlist'),
		wlist = [];

	_.each( widgetlist, function(wv){
		_.each( wv, function(v){
			wlist.push(v.name+'@'+v.version);
		});
	});

	// check config is exists
	if ( config === undefined ) {
		helper.log('error', type + ' biz ' + name + ' is not exists.');
		promise.reject();
		return promise;
	}

	// set config
	inquirer.prompt([
		{
			name : 'relyLib',
			type : 'checkbox',
			message : 'use lib:',
			choices : liblist,
			default : config.relyLib
		},
		{
			name : 'relyWidget',
			type : 'checkbox',
			message : 'use widget:',
			choices : wlist,
			default : config.relyWidget
		},
		{
			name : 'relyCommon',
			type : 'checkbox',
			message : 'use common:',
			choices : _.keys(commonlist[type]),
			default : config.relyCommon
		}
	], function( answers ) {

		var filename = config.name.replace(/\//g, '-'),
			configSrc = P.root + B.builderPath + B.jsCfg[type+'Biz'] + '/' + filename + '.json';

		// save config
		config.relyCommon = answers.relyCommon || [];
		config.relyWidget = answers.relyWidget || [];
		config.relyLib = answers.relyLib || [];

		write( configSrc, JSON.stringify(config) );

		// clean cache
		cache.clean('bizlist');

		// rewrite file
		biz.fn.modifyBizFile( config );
		
		// rebuild tree
		tree.build();

		// rebuild rely code
		dev.fn.change({
			id : config.type+'@'+config.name,
			type : 'biz'
		})
		.always(function(){
			helper.log('set success');
			promise.resolve();
		});

	});
	
	return promise;

};

module.exports = biz;

// info
module.exports._info = {
	name : 'biz',
	flags : [
		'biz <method> [<name>]',
		'biz <method> [<name>] [-c|-j] [-t]',
		'biz add [<path>] [-c|-j] [-t]',
		'biz rm <name> [-c|-j] [-t]',
		'biz set <name> [-c|-j] [-t]',
		'biz info [<name>] [-c|-j]',
		'biz list [-c|-j] [-t]',
		'biz clean [-c|-j] [-t]'
	],
	method : {
		'add' : 'Add a biz',
		'rm' : 'Remove a biz',
		'biz' : 'Reset a biz',
		'info' : 'Display biz detail',
		'list' : 'Display all the biz in the project',
		'clean' : 'Clear biz dir'
	},
	args : {
		'method' : 'Operation type',
		'name' : 'Select the biz name',
		'path' : 'Biz page path, like `blog/commit/add`'
	},
	longDesc : '对项目的业务代码进行操作，可以添加业务代码。\n\t可以通过`-j`或`-c`选项来指定操作JavaScript或CSS，默认操作JavaScript。',
	shortDesc : 'change biz for project',
	options : ['-c', '-j', '-t']
};