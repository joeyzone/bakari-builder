// command - common
'use strict';

var helper = require('../lib/helper'),
	Promise,
	dev,
	_,
	archy,
	inquirer,
	indent,
	tree,
	cache;

var initer = helper.init(function(){
	Promise = require('bakari-promise');
	dev = require('./dev');
	_ = require('underscore');
	archy = require('archy');
	inquirer = require('inquirer');
	indent = require('indent-string');
	tree = require('../lib/tree');
	cache = require('../lib/cache');
});

var type = false;
var common = function( method, name ){
	
	initer();
	hook.beforeCommand();
	
	// check method
	if ( typeof method !== 'string' ) {
		helper.log('error', 'you must input method, see help : `bakari help common`');
		return;
	}

	// check name
	if ( ( method === 'rm' ||
		   method === 'set' ) &&
			typeof name !== 'string' ) {
		helper.log('error', 'you must input name, see help : `bakari help common`');
		return;
	}

	// get type
	if ( arguments[2].parent.js ) {
		type = 'js';
	} else if ( arguments[2].parent.css ) {
		type = 'css';
	}

	var commonlist = cache.get('commonlist');

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
			common.fn.run( method, name );
		});

	} else if ( ( method === 'rm' ||
				  method === 'set' ||
				  method === 'info' ) && !type ) {

		// if has name, check type is exists
		if ( name && commonlist && !commonlist.js[name] && commonlist.css[name] ) {
			type = 'css'
			common.fn.run( method, name );
		} else if ( name && commonlist && commonlist.js[name] && !commonlist.css[name] ) {
			type = 'js'
			common.fn.run( method, name );
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
				common.fn.run( method, name );
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
			common.fn.run( method, name );
		});

	} else {
		common.fn.run( method, name );
	}

};

// ========================================
// Tool Function
// ========================================
common.fn = {};
common.fn.run = function( method, name ){
	if ( typeof common[method] === 'function' ) {
		common[method].call(this, name).always(hook.afterCommand);
	} else {
		helper.log('error', 'no this command, use `bakari help common` check all common commands');
		hook.afterCommand();
	}
};

common.fn.modifyCommonFile = function( data ){
	
	var file = read(P.root + P.path + B.src[data.type+'Common'] + '/' + data.name + '.'+data.type),
		code = '',
		con = /\)\{((\n|.)+)\}\)\;$/g.exec(file);
	
	if ( con ) {
		code = con[1];
	}

	if ( data.type === 'js' ) {
		file = helper.renderFile( 'common', data, code );
	}

	write( P.root + P.path + B.src[data.type+'Common'] + '/' + data.name + '.'+data.type, file );

};

common.fn.createCommonFile = function( data ){

	// save common file
	write( P.root + P.path + B.src[data.type+'Common'] + '/' + data.name + '.'+data.type, helper.renderFile( 'common', data ) );

};

common.fn.createCommon = function( data ){
	
	// set config
	var promise = Promise(),
		commonInfo = {
			type : type,
			name : data.name,
			relyCommon : data.relyCommon,
			relyWidget : data.relyWidget,
			relyLib : data.relyLib
		},
		configSrc = P.root + B.builderPath + B.jsCfg[type+'Common'] + '/' + data.name + '.json',
		fileSrc = P.root + P.path + B.src[type+'Common'] + '/' + data.name + '.'+type;
	
	// save config file
	write( configSrc, JSON.stringify( commonInfo ) );

	common.fn.createCommonFile( commonInfo );

	// clean cache
	cache.clean('commonlist');

	// rebuild tree
	tree.build();

	helper.log('success', data.name + ' common created, in '+fileSrc);
	
	promise.resolve();
	return promise;

};

common.fn.cleanFiles = function( type ){
	
	var promise = Promise(),
		surplus = [],
		hasfiles = [],
		fileSrc = P.root+P.path+B.src[type+'Common']+'/',
		commonlist = cache.get('commonlist');

	// check surplus
	recurse( fileSrc, function(abspath, rootdir, subdir, filename){
		var reg = new RegExp('\.'+type+'$','g'),
			name = filename.replace(reg,'');

		if ( commonlist[type][name] === undefined ) {
			surplus.push(rootdir+filename);
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
		_.each( _.difference( _.keys(commonlist[type]), hasfiles ), function(v){
			
			common.fn.createCommonFile( commonlist[type][v] );
			helper.log('completion file', fileSrc+v+'.'+type);

		});
	});

	return promise;

};

// ========================================
// Sub Command
// ========================================
common.add = function( name ){
	
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

	// set common
	inquirer.prompt([
		{
			name : 'recheckType',
			type : 'confirm',
			message : 'create a '+type+' common?'
		},
		{
			name : 'name',
			type : 'input',
			message : 'common name:',
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
				return answers.name;
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
				return answers.name;
			}
		}
	], function( answers ) {

		// check name is not dir
		if ( answers.name.search('/') !== -1 ) {

			helper.log('error', 'name of common can not be a directory');
			promise.reject();
			return;

		}

		// check type is incorrect
		if ( answers.recheckType === false ) {

			helper.log('error', 'recheck type is fail');
			promise.reject();
			return;

		}

		// check name is null
		if ( !answers.name ) {

			helper.log('error', 'common must have a name');
			promise.reject();
			return;

		}

		var configSrc = P.root + B.builderPath + B.jsCfg[type+'Common'] + '/' + answers.name + '.json',
			fileSrc = P.root + P.path + B.src[type+'Common'] + '/' + answers.name + '.'+type;

		// check config is exists
		if ( exists(configSrc) ) {
			helper.log('error', answers.name+' already exists in '+fileSrc+', if can\'t found file, use `bakari common clean`');
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
					common.fn.createCommon( answers )
					.done(function(){
						promise.resolve();
					});
				} else {
					promise.reject();
				}

			});
			
		} else {
			common.fn.createCommon( answers )
			.done(function(){
				promise.resolve();
			});
		}

	});
	
	return promise;

};

common.rm = function( name ){
	
	initer();
	
	var promise = Promise(),
		commonlist = cache.get('commonlist'),
		configSrc = P.root + B.builderPath + B.jsCfg[type+'Common'] + '/' + name + '.json',
		fileSrc = P.root + P.path + B.src[type+'Common'] + '/' + name + '.'+type;

	// check install
	if ( commonlist === undefined || commonlist[type][name] === undefined ) {
		helper.log('error', 'project not has ' + type + ' '+name+' common');
		promise.reject();
		return promise;
	}

	// check rely
	if ( tree.hasChild('common:'+name+'@'+type) ) {
		helper.log('error', 'can\'t remove common, some code rely this common : ');
		tree.get().showChild('common:'+name+'@'+type);
		promise.reject();
		return promise;
	}

	// del file
	del( fileSrc );

	// del config 
	del( configSrc );

	// clean cache
	cache.clean('commonlist');

	tree.build();

	helper.log('success', type+' common '+name+' removed');
	promise.resolve();
	return promise;

};

common.list = function(){
	
	initer();

	var promise = Promise(),
		list = cache.get('commonlist'),
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

	helper.log( 'common list', 'project has ' + (jsnum + cssnum) + ' commons' );

	// if common is null, don't show common table
	if ( !_.isEmpty(jslist) && ( !type || type === 'js' ) ) {
		str = archy({
			label : 'JavaScript commons('+jsnum+'), in '+P.root+P.path+B.src.jsCommon,
			nodes : jslist
		});
		console.log(str);
	}

	if ( !_.isEmpty(csslist) && ( !type || type === 'css' ) ) {
		str = archy({
			label : 'CSS commons('+cssnum+'), in '+P.root+P.path+B.src.cssCommon,
			nodes : csslist
		});
		console.log(str);
	}

	promise.resolve();
	return promise;

};

common.info = function( name ){
	
	initer();
	
	var promise = Promise(),
		commonlist = cache.get('commonlist');

	var outputInfo = function(){
		
		var info = commonlist[type][name];

		// if info not found
		if ( info === undefined ) {
			helper.log('error', 'info not found');
			promise.reject();
			return;
		}
		
		// add path
		info.path = P.root+P.path+B.src.jsCommon+'/'+info.name+'.js';

		helper.log('common info', info.name);
		helper.loglist(info);
		console.log('\nparent:');
		tree.get().showParent('common:'+info.name+'@'+info.type);
		console.log('child:');
		tree.get().showChild('common:'+info.name+'@'+info.type);
		promise.resolve();

	};

	var selectName = function(){

		var jsKeys = _.keys( commonlist.js ),
			cssKeys = _.keys( commonlist.css ),
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
				message : 'choose common name:',
				choices : allKeys
			}
		], function( answers ) {
			name = answers.name;
			outputInfo();
		});

	};

	// if common is null, just return
	if ( _.isEmpty(commonlist.js) && _.isEmpty(commonlist.css) ) {
		helper.log('note', 'common is null');
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

common.clean = function(){
	
	initer();
	
	var promise = Promise();

	// clean css & js
	if ( !type ) {

		common.fn.cleanFiles( 'js' )
		.done(function(){
			common.fn.cleanFiles( 'css' )
			.done(function(){
				helper.log('cleared', 'all js and css file is clean');
				promise.resolve();				
			});
		});

	} else if ( type === 'js' ) {
		common.fn.cleanFiles( 'js' )
		.done(function(){
			helper.log('cleared', 'all js file is clean');
			promise.resolve();
		});
	} else if ( type === 'css' ) {
		common.fn.cleanFiles( 'css' )
		.done(function(){
			helper.log('cleared', 'all css file is clean');
			promise.resolve();
		});
	}

	return promise;

};

common.set = function( name ){
	
	initer();
	
	var promise = Promise(),
		commonlist = cache.get('commonlist'),
		liblist = helper.getLibArray( type ),
		config = commonlist[type][name],
		widgetlist = cache.get('widgetlist'),
		wlist = [];

	_.each( widgetlist, function(wv){
		_.each( wv, function(v){
			wlist.push(v.name+'@'+v.version);
		});
	});

	// check config is exists
	if ( config === undefined ) {
		helper.log('error', type + ' common ' + name + ' is not exists.');
		promise.reject();
		return promise;
	}

	// set config
	inquirer.prompt([
		{
			name : 'name',
			type : 'input',
			message : 'common name:',
			default : config.name
		},
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

		// check name is null
		if ( !answers.name ) {

			helper.log('error', 'common must have a name');
			promise.reject();
			return;

		}

		// if name change, sync rely & del old config
		if ( config.name !== answers.name ) {

			var relylist = tree.get().root().common['common:'+config.name+'@'+config.type].child;

			_.each( relylist, function(v, k){

				var type = k.split('@')[1],
					ptype = helper.firstToUpperCase(k.split(':')[0]),
					filename = k.replace(/^(.+?)\:(.+?)\@(.+?)$/, '$2');

				if ( ptype === 'Biz' ) {
					filename = filename.replace(/\//g, '-');
				}

				var src = P.root + B.builderPath + B.jsCfg[type+ptype] + '/' + filename + '.json',
					json = readJSON(src);

				// change new rely name
				_.each( json['rely'+ptype], function(v,k){
					if ( v === config.name ) {
						json['rely'+ptype][k] = answers.name;
					}
				});

				// save
				write(src, JSON.stringify(json));

			});

			// del old config
			del(P.root + B.builderPath + B.jsCfg[type+'Common'] + '/' + config.name + '.json');

			// rename file
			copy( P.root+P.path+B.src.jsCommon+'/'+config.name+'.js', P.root+P.path+B.src.jsCommon+'/'+answers.name+'.js' );
			del( P.root+P.path+B.src.jsCommon+'/'+config.name+'.js' );

		}

		var configSrc = P.root + B.builderPath + B.jsCfg[type+'Common'] + '/' + answers.name + '.json';

		// save config
		config.name = answers.name;
		config.relyCommon = answers.relyCommon || [];
		config.relyWidget = answers.relyWidget || [];
		config.relyLib = answers.relyLib || [];

		write( configSrc, JSON.stringify(config) );

		// clean cache
		cache.clean('commonlist');

		// rewrite file
		common.fn.modifyCommonFile( config );

		// rebuild tree
		tree.build();

		// rebuild rely code
		dev.fn.change({
			id : config.type+'@'+config.name,
			type : 'common'
		})
		.always(function(){
			helper.log('set success');
			promise.resolve();
		});

	});
	
	return promise;

};

module.exports = common;

// info
module.exports._info = {
	name : 'common',
	Short : 'cm',
	flags : [
		'common <method> [<name>]',
		'common <method> [<name>] [-c|-j] [-t]',
		'common add [<name>] [-c|-j] [-t]',
		'common rm <name> [-c|-j] [-t]',
		'common set <name> [-c|-j] [-t]',
		'common info [<name>] [-c|-j]',
		'common list [-c|-j] [-t]',
		'common clean [-c|-j] [-t]'
	],
	method : {
		'add' : 'Add a common biz',
		'rm' : 'Remove a common',
		'set' : 'Reset a common',
		'info' : 'Display common detail',
		'list' : 'Display all the common in the project',
		'clean' : 'Clear common dir'
	},
	args : {
		'method' : 'Operation type',
		'name' : 'Select the common name'
	},
	longDesc : '对项目的公共代码进行操作，可以添加公共代码。\n\t可以通过`-j`或`-c`选项来指定操作JavaScript或CSS，默认操作JavaScript。',
	shortDesc : 'change common for project',
	options : ['-c', '-j', '-t']
};
