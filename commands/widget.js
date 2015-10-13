// command - widget
'use strict';

var helper = require('../lib/helper'),
	Promise,
	_,
	colors,
	request,
	archy,
	ncp,
	open,
	inquirer,
	indent,
	tree,
	cache;
	
var initer = helper.init(function(){
	Promise = require('bakari-promise');
	_ = require('underscore');
	colors = require('ansi-256-colors');
	request = require('request');
	archy = require('archy');
	ncp = require('ncp');
	open = require("open");
	inquirer = require('inquirer');
	indent = require('indent-string');
	tree = require('../lib/tree');
	cache = require('../lib/cache');
});

var version = false,
	forcedDownload = false;
var widget = function( method, name ){

	initer();
	hook.beforeCommand();
	
	// check method
	if ( typeof method !== 'string' ) {
		helper.log('error', 'you must input method, see help : `bakari help widget`');
		return;
	}

	// check name
	if ( ( method === 'lookup' ||
		   method === 'doc' ||
		   method === 'add' ||
		   method === 'rm' ||
		   method === 'search' ) &&
			typeof name !== 'string' ) {
		helper.log('error', 'you must input name or keyword, see help : `bakari help widget`');
		return;
	}

	// check version
	if ( arguments[2].parent.useVersion ) {
		version = arguments[2].parent.useVersion
	}

	// check forced download
	if ( arguments[2].parent.forcedDownload ) {
		forcedDownload = true;
	}

	// check widget is start
	if ( ( method === 'all' ||
		   method === 'lookup' ||
		   method === 'doc' ||
		   method === 'add' ||
		   method === 'list' ||
		   method === 'info' ||
		   method === 'rm' ||
		   method === 'cache' ||
		   method === 'clean' ||
		   method === 'search' ) &&
			!P.widget.enable ) {
		helper.log('error', 'widget server is stop, use `widget setup` start service');
		return;
	}

	if ( typeof name === 'string' ) {
		// will be treated as lowercase name
		name = name.toLowerCase();
	}

	if ( method === 'all' ||
		 method === 'lookup' ||
		 method === 'doc' ||
		 method === 'add' ||
		 method === 'search' ) {
		helper.log('contact source', P.widget.source);
	}

	widget.fn.run( method, name );

};

// ========================================
// Tool Function
// ========================================
widget.fn = {};
widget.fn.run = function( method, name ){
	if ( typeof widget[method] === 'function' ) {
		widget[method].call(this, name).always(hook.afterCommand);
	} else {
		helper.log('error', 'no this command, use `bakari help widget` check all widget commands');
		hook.afterCommand();
	}
};

// use name & version render url
widget.fn.renderUrl = function( url, name, version ){
	
	url = url.replace(/\{name\}/g, name.toLowerCase());
	url = url.replace(/\{version\}/g, version.toLowerCase());

	return url;

};


widget.fn.installWidget = function( info, tree ){

	// set config
	var promise = Promise(), config = {}, relys = [], rootInfo = info;

	config.name = info.name;
	config.type = info.type;
	config.version = info.version;
	config.description = info.description;
	config.main = info.main;

	_.each( info.dependencies, function( v, k ){
		relys.push(k+'@'+v);
	});

	var relyNum = relys.length, installed = 0;

	_.each( relys, function(v){

		// install rely
		cache.get('sourceWidget', v, false)
		.done(function( info ){

			var childTree = tree[info.name+'@'+info.version] = {};
			widget.fn.getWidget( info, childTree )
			.done(function(){
				if ( ++installed === relyNum ) {
					config.tree = tree;
					cache.clean('widgetlist');
					write(P.root + B.builderPath + B.jsCfg.widget + '/' + rootInfo.name + '/' + rootInfo.version + '.json', JSON.stringify(config));
					helper.log('Installed', rootInfo.name+'@'+rootInfo.version);
					promise.resolve();
				}
			})
			.fail(function(){
				promise.reject();
			});

		})
		.fail(function(){
			promise.reject();
		});

	});

	if ( relyNum === 0 ) {
		config.tree = {};
		cache.clean('widgetlist');
		write(P.root + B.builderPath + B.jsCfg.widget + '/' + info.name + '/' + info.version + '.json', JSON.stringify(config));
		helper.log('Installed', info.name+'@'+info.version);
		promise.resolve();
	}

	return promise;

};

// get widget
widget.fn.getWidget = function( info, tree ){
	
	var promise = Promise(),
		url = [];

	// get main url
	_.each([].concat(info.main), function(v){
		url.push( widget.fn.renderUrl( P.widget.source+P.widget.src+v, info.name, info.version ) );
	});

	// get files
	var widgetCache = cache.get('cache', 'widget'),
		cached = false;

	// find cache
	_.find( widgetCache, function(v){
		if ( v === info.name+'-'+info.version ) {
			cached = true;
			return true;
		}	
	});

	if ( cached && !forcedDownload ) {

		helper.log('get', info.name+'@'+info.version+' from cache');
		ncp( P.root+B.builderPath+B.cache.widget+'/'+info.name+'-'+info.version+'/', P.root+P.path+B.src.widget+'/'+info.name+'-'+info.version+'/' );
		widget.fn.installWidget( info, tree )
		.done(function(){
			promise.resolve();
		})
		.fail(function(){
			promise.reject();
		});

	} else {

		helper.log('get', info.name+'@'+info.version);
		var filesSize = url.length, getCount = 0;
		_.each( url, function(v){
			request({
				url : v
			}, function(err, response, body){

				var success = true, type;
				getCount++;

				if ( err ) {
					helper.log( 'error', err );
					success = false;
				} else {

					// check type
					type = 'js';
					if ( response.request.uri.path.search(/\.css$/g) !== -1 ) {
						type = 'css'
					}

					// 替换define id
					// TODO recheck
					var relys, results, patt = /define\((\".+?\"\,[ ]*\[|\[)(.+?)\]\,/g, key;
					while ((results = patt.exec(body)) != null) {

						relys = results;
						if ( relys ) {
							relys = relys[2].replace(/(^[\'\"]|[\'\"]$)/g, '');
							relys = relys.split(/[\' \"]\,[\' \"]{1,2}/g);
							_.each( relys, function(v, k){
								
								var ar = v.split('/');
								key = ar[0]+'-'+ar[1];

								// 检查是否是内部依赖，如果是哪部依赖则不替换
								_.find( info.dependencies, function(dv,dk){
									if ( (dk+'-'+dv) === key ) {
										relys[k] = 'widget/'+key;
										return true;
									}
								});
								
							});

							relys = '\''+relys.join('\',\'')+'\'';
							var reg = new RegExp('(define\\('+results[1].replace('[', '\\[')+')(.+?)(\\]\\,)','g');
							if ( results[1] === '[' ) {
								body = body.replace(reg, 'define\(\''+('widget/'+info.name+'-'+info.version)+'\'\,\['+relys+'$3' );
							} else {
								body = body.replace(reg, '$1'+relys+'$3' );
							}
							
						} else {
							body = body.replace(/(define\()/g, '$1\'widget/'+info.name+'-'+info.version+'\',' );
						}

					};

					// if deine is null
					if ( body.search(/define[ ]*\([ ]*function/g) !== -1 ) {
						body = body.replace(/(define[ ]*\()[ ]*(function)/g, '$1\''+('widget/'+info.name+'-'+info.version)+'\'\,$2');
					}

					write( P.root+P.path+B.src.widget+'/'+info.name+'-'+info.version+'/index.'+type, body || '' );

				}

				if ( filesSize === getCount ) {
					if ( success ) {
						// get copy and cache
						ncp( P.root+P.path+B.src.widget+'/'+info.name+'-'+info.version+'/', P.root+B.builderPath+B.cache.widget+'/'+info.name+'-'+info.version+'/' );
						helper.log('Cached', info.name+'@'+info.version);
						widget.fn.installWidget( info, tree )
						.done(function(){
							promise.resolve();
						})
						.fail(function(){
							promise.reject();
						});
					} else {
						promise.reject();
					}
				}

			});
		});
	}

	return promise;

};

// uninstall widget
widget.fn.uninstall = function( name, version ){
		
	// not uninstall
	var promise = Promise(),
		widgetlist = cache.get('widgetlist');

	if ( !( widgetlist[name] && widgetlist[name][version] ) ) {
		helper.log('warning', 'did not uninstall '+name+'@'+version+' widget');
		promise.reject();
		return promise;
	}

	// check rely
	if ( tree.hasChild( 'widget:'+name+'@'+version ) ) {
		helper.log('error', 'can\'t remove widget '+name+'@'+version+', some code rely this widget : ');
		tree.get().showChild('widget:'+name+'@'+version);
		promise.reject();
		return promise;
	}

	// del file
	del( P.root + P.path + B.src.widget + '/' + name+'-'+version + '/' );

	// del config 
	del( P.root + B.builderPath + B.jsCfg.widget + '/' + name + '/' + version + '.json' );

	// clean cache
	cache.clean('widgetlist');
	cache.clean('widget', name+'@'+version);

	helper.log('success', ' widget '+name+'@'+version+' uninstalled');
	promise.resolve();
	return promise;

};

// ========================================
// Sub Command
// ========================================
widget.setup = function(){

	initer();
	
	var promise = Promise();

	// set widget source
	inquirer.prompt([
		{
			name : 'enable',
			type : 'confirm',
			message : 'enable widget:',
			default : P.widget.enable
		},
		{
			name : 'source',
			type : 'input',
			message : 'set widget source:',
			default : P.widget.source
		},
		{
			name : 'list',
			type : 'input',
			message : 'set widget list url:',
			default : P.widget.list
		},
		{
			name : 'info',
			type : 'input',
			message : 'set widget info file:',
			default : P.widget.info
		},
		{
			name : 'src',
			type : 'input',
			message : 'set widget src:',
			default : P.widget.src
		},
		{
			name : 'doc',
			type : 'input',
			message : 'set widget doc url:',
			default : P.widget.doc
		}
	], function( answers ) {

		// set config
		_.each(answers, function(v,k){
			P.widget[k] = v;
		});

		// save project config
		write( P.root+B.projectConfig, JSON.stringify( P ) );

		if ( answers.enable ) {
			helper.log('success', 'setup done and widget server is started');
		} else {
			helper.log('success', 'setup done and widget server is stop');
		}
		
		promise.resolve();

	});

	return promise;

};

widget.all = function(){

	initer();
	
	var promise = Promise();

	cache.get('sourceWidgetlist', null, false)
	.done(function( data ){

		var nodes = [];

		_.each( data.types, function(v){

			var node = [];

			_.each( data.all, function(dv,dk){
				if ( dv.type === v ) {
					node.push(dk+' '+colors.fg.grayscale[9]+'@'+dv.version+colors.reset);
				}
			});

			nodes.push({
				label : v,
				nodes : node
			});

		});

		var str = archy({
			label : 'Widget list, source : '+P.widget.source,
			nodes : nodes
		});
		console.log(str);

		promise.resolve();

	})
	.fail(function(){
		promise.reject();
	});
	
	return promise;

};

widget.lookup = function( name ){

	initer();
	
	var promise = Promise(),
		versionList = [],
		cacheWidget = cache.get('cache', 'widget'),
		widgetlist = cache.get('widgetlist');

	var printInfo = function( data ){
		
		var info = {
			name : data.name,
			type : data.type,
			version : data.version,
			description : data.description,
			main : data.main
		}, relys = [], status;

		_.each(data.dependencies, function(v,k){
			relys.push(k+'@'+v);
		});

		info.rely = relys;
		info.allVersion = versionList;

		// find cache
		var cached = false;
		_.find( cacheWidget, function(v){
			if ( v === data.name+'-'+data.version ) {
				cached = true;
				return true;
			}
		});

		if ( widgetlist[name] && widgetlist[name][data.version] ) {
			status = colors.fg.getRgb(0,2,0) + 'Installed' + colors.reset;
		} else if ( cached ) {
			status = colors.fg.getRgb(5,2,0) + 'Cached' + colors.reset;
		} else {
			status = colors.fg.getRgb(3,0,0) + 'Not Installed' + colors.reset;
		}

		info.status = status;
		helper.loglist(info);
		promise.resolve();

	};


	cache.get('sourceWidgetlist', null, false)
	.done(function( data ){

		// if has this widget
		if ( data.all[name] ) {

			var latest = data.all[name].version;
			versionList = data.all[name].allVersion;

			if ( version ) {

				cache.get('sourceWidget', name+'@'+version, false)
				.done(function( data ){
					printInfo(data);
				})
				.fail(function(){
					promise.reject();
				});

			} else {

				cache.get('sourceWidget', name+'@'+latest, false)
				.done(function( data ){
					printInfo(data);
				})
				.fail(function(){
					promise.reject();
				});

			}

		} else {
			helper.log('error', 'not found '+name);
			promise.reject();
		}
		
	})
	.fail(function(){
		promise.reject();
	});


	return promise;

};

widget.doc = function( name ){

	initer();
	
	var promise = Promise();

	var openUrl = function( name, version ){
		
		var url = widget.fn.renderUrl( P.widget.source+P.widget.doc, name, version );
		open( url );
		promise.resolve();

	};

	cache.get('sourceWidgetlist', null, false)
	.done(function( data ){

		// if has this widget
		if ( data.all[name] ) {

			var latest = data.all[name].version;

			if ( version ) {

				// find version
				var find = false;
				_.find( data.all[name].allVersion, function( v ){
					if ( v === version ) {
						find = true;
						return true;
					}
				});

				if ( find ) {
					openUrl( name, version );
				} else {
					helper.log('error', 'not found '+name+'@'+version+', all version : '+data.all[name].allVersion.join(', '));
					promise.reject();
				}

			} else {

				var latest = data.all[name].version;
				openUrl( name, latest );

			}

		} else {
			helper.log('error', 'not found '+name);
			promise.reject();
		}
		
	})
	.fail(function(){
		promise.reject();
	});

	return promise;

};

widget.add = function( name ){

	initer();
	
	var promise = Promise();

	if ( version ) {

		cache.get('sourceWidget', name+'@'+version, false)
		.done(function( info ){
			widget.fn.getWidget( info, {} )
			.done(function(){
				tree.build();
				promise.resolve();
			})
			.fail(function(){
				promise.reject();
			});
		})
		.fail(function(){
			promise.reject();
		});

	} else {

		// if not version, just find latest version
		cache.get('sourceWidgetlist', null, false)
		.done(function( data ){

			if ( data.all[name] ) {

				var latest = data.all[name].version;

				cache.get('sourceWidget', name+'@'+latest, false)
				.done(function( info ){
					widget.fn.getWidget( info, {} )
					.done(function(){
						tree.build();
						promise.resolve();
					})
					.fail(function(){
						promise.reject();
					});
				})
				.fail(function(){
					promise.reject();
				});

			} else {
				helper.log('error', 'not found '+name);
				promise.reject();
			}

		})
		.fail(function(){
			promise.reject();
		});

	}

	return promise;

};

widget.list = function(){

	initer();
	
	var promise = Promise(),
		list = cache.get('widgetlist'),
		widgetnum = 0;

	var widget = [], str;
	_.each( list, function(lv){
		_.each( lv, function(v,k){
			widgetnum++;
			widget.push(v.name + '@' + v.version);
		});
	});

	helper.log( 'widget list', 'project has ' + widgetnum + ' widget, in ' + P.root + P.path + B.src.widget );

	// if libs is null, don't show library table
	if ( !_.isEmpty(widget) ) {

		str = archy({
			label : 'Widget',
			nodes : widget
		});
		console.log(str);
		
	}

	promise.resolve();
	return promise;

};

widget.info = function( name ){

	initer();
	
	var promise = Promise();

	var outputInfo = function( name, version ){
		
		var info = cache.get('widget', name+'@'+version);

		// if info not found
		if ( info === undefined ) {
			helper.log('error', 'info not found');
			promise.reject();
			return;
		}

		// add path
		info.path = P.root+P.path+B.src.widget+'/'+info.name+'-'+info.version+'/';

		delete info.tree;

		helper.log('widget info', info.name+'@'+info.version);
		helper.loglist(info);
		console.log('\nparent:');
		tree.get().showParent('widget:'+info.name+'@'+info.version);
		console.log('child:');
		tree.get().showChild('widget:'+info.name+'@'+info.version);
		promise.resolve();

	};

	var selectVersion = function( name ){
			
		var choices = _.keys(cache.get('widgetlist')[name]);

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
	if ( _.isEmpty(cache.get('widgetlist')) ) {
		helper.log('note', 'widget is null');
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
				message : 'choose widget:',
				choices : _.keys(cache.get('widgetlist'))
			}
		], function( answers ) {

			selectVersion( answers.name );

		});

	}

	return promise;

};

widget.rm = function( name ){

	initer();
	
	var promise = Promise(),
		data = {};

	if ( version ) {

		widget.fn.uninstall(name, version)
		.done(function(){
			tree.build();
			promise.resolve();
		})
		.fail(function(){
			promise.reject();
		});

	} else {

		var widgetlist = cache.get('widgetlist');

		if ( widgetlist === undefined || widgetlist[name] === undefined ) {
			helper.log('error', 'project not install '+name+'.');
			promise.reject();
			return promise;
		}

		var size = _.size( widgetlist[name] ), index = 0;

		_.each( widgetlist[name], function(v){
			
			widget.fn.uninstall(v.name, v.version)
			.done(function(){
				if ( ++index === size ) {
					tree.build();
					promise.resolve();
				}
			});

		});
		
	}

	return promise;

};

widget.cache = function(){

	initer();
	
	var promise = Promise(),
		list = cache.get('cache', 'widget'),
		str;

	helper.log( 'cache', list.length + ' widget cached' );

	// if list is null, don't show widget table
	if ( list.length === 0 ) {
		promise.resolve();
		return promise;
	}

	str = archy({
		label : 'Widget Cache',
		nodes : list
	});
	console.log(str);

	promise.resolve();
	return promise;

};

widget.clean = function(){

	initer();
	
	var promise = Promise(),
		cleared = true,
		failList = [];

	promise
	.done(function(){
		helper.log('widget cleared');
	})
	.fail(function(){
		helper.log('widget clean fail', 'not install : '+failList.join(', '));
	});

	var done = function(){
		if ( cleared ) {
			promise.resolve();
		} else {
			promise.reject();
		}
	};

	// reset widget
	var jsWidgetPath = P.root + P.path + B.src.widget,
		widgetlist = cache.get('widgetlist');

	// rm path
	if ( exists( jsWidgetPath ) ) {
		del( jsWidgetPath );
	}

	// re mkdir
	mkdir( jsWidgetPath );

	// if lib is null, return;
	if ( _.isEmpty(widgetlist) ) {
		helper.log('note', 'widget is null');
		promise.resolve();
		return promise;
	}

	var index = 0;
	_.each(widgetlist, function( wv, name ){
		_.each(wv, function( v, version ){
			index++;
			var n = name, ver = version;
			cache.get('sourceWidget', name+'@'+version, false)
			.done(function( info ){
				widget.fn.getWidget( info, {} )
				.done(function(){
					helper.log('cleared', info.name+'@'+info.version);
					if ( --index === 0 ) {
						done();
					}
				})
				.fail(function(){
					cleared = false;
					failList.push(info.name+'@'+info.version);
					if ( --index === 0 ) {
						done();
					}
				});
			})
			.fail(function(){
				cleared = false;
				failList.push(n+'@'+ver);
				if ( --index === 0 ) {
					done();
				}
			});
		});
	});
	
	return promise;

};

widget.search = function( keyword ){

	initer();
	
	var promise = Promise(),
		results = [];

	cache.get('sourceWidgetlist', null, false)
	.done(function( data ){
		
		_.each( data.all, function(v, k){
			if ( k.search(keyword) !== -1 ||
				 v.description.search(keyword) !== -1 ) {
				results.push( k + ' : ' + v.allVersion.join(', ') );
			}
		});

		if ( results.length ) {
			var str = archy({
				label : results.length+' results : ',
				nodes : results
			});
			console.log(str);
			promise.resolve();
		} else {
			helper.log('note', 'no result');
			promise.reject();
		}

	})
	.fail(function(){
		helper.log('note', 'no result');
		promise.reject();
	});

	return promise;

};

module.exports = widget;
module.exports.setVersion = function( ver ){
	version = ver;
};
module.exports.setForcedDownload = function( fd ){
	forcedDownload = fd;
};

// info
module.exports._info = {
	name : 'widget',
	Short : 'wg',
	flags : [
		'widget <method> [<name>]',
		'widget <method> [<name>] [-v <version>] [-D] [-t]',
		'widget setup [-t]',
		'widget all [-t]',
		'widget lookup <name> [-t]',
		'widget search <keyword> [-t]',
		'widget doc <name> [-t]',
		'widget add <name> [-v <version>] [-D] [-t]',
		'widget list [-t]',
		'widget info [<name>] [-v <version>]',
		'widget rm <name> [-v <version>] [-t]',
		'widget cache [-t]',
		'widget clean [-D] [-t]'
	],
	method : {
		'setup' : 'Setup widget server, you must complete the setup before use',
		'all' : 'Display all widget list in source',
		'lookup' : 'Look up widget info in source',
		'doc' : 'Opens a widget doc into your favorite browser',
		'search' : 'Use keywords to find the widget',
		'add' : 'Add a widget',
		'rm' : 'Remove a widget',
		'list' : 'Display all the widget in the project',
		'info' : 'Display widget detail',
		'cache' : 'Display local widget cache',
		'clean' : 'Clear widget dir'
	},
	args : {
		'method' : 'Operation type',
		'name' : 'Select the widget name',
		'version' : 'Select the lib version'
	},
	longDesc : '对项目的组件进行操作，使用之前必须使用`widget setup`完成组件的设置。',
	shortDesc : 'change widget for project',
	options : ['-v', '-D', '-t']
};