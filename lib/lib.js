// lib - libManager - V2
'use strict';

var helper = require('../lib/helper'),
	log = require('../lib/log'),
	Promise = require('bakari-promise'),
	_ = require('underscore'),
	colors = require('ansi-256-colors'),
	ncp = require('ncp'),
	tree = require('./tree'),
	cache = require('../lib/cache'),
	extend = require('extend'),
	versionManager = require('../lib/version'),
	inquirer = require('inquirer'),
	tree = require('./tree'),
	bower = require('bower');

var bowerCommand = {

	// input a keyword search lib list
	// result like :
	// [ { name: 'angular-cookies',
    // 	   url: 'git://github.com/angular/bower-angular-cookies.git' } ]
	search : function( keyword, cfg ){

		cfg = extend(true, {
			note : 'search',
			showNote : true
		}, cfg);
		
		var promise = Promise();

		if ( cfg.showNote ) {
			log( cfg.note, keyword );
		}
		
		bower.commands
		.search(keyword)
		.on('end', function (results) {
			promise.resolve( results );
		})
		.on('error', function(){
			log('error', 'search lib fail');
			promise.reject();
		});

		return promise;

	},

	// input a lib id, like : jquery@1.11.0
	info : function( keyword, cfg  ){

		cfg = extend(true, {
			note : 'getinfo',
			showNote : true
		}, cfg);
		
		var promise = Promise(),
			info = {},
			version,
			name,
			searchKey;

		if ( keyword.search('@') !== -1 ) {
			name = keyword.split('@')[0];
			version = keyword.split('@')[1];
			searchKey = keyword.replace('@', '#');
		} else {
			name = keyword;
			searchKey = keyword;
		}

		cfg.showNote && log( cfg.note, searchKey );

		bower.commands
		.info(searchKey)
		.on('log', function( data ){
			cfg.showNote && log( cfg.note, data.id + ' ' + data.message );
		})
		.on('prompt', function (prompts, callback) {
		    inquirer.prompt(prompts, callback);
		})
		.on('end', function (results) {

			var result = {};

			// format results
			result.name = results.name;
			if ( !version ) {
				result.version = results.versions;
				result.main = [].concat(results.latest.main);
				result.dependencies = results.latest.dependencies;
			} else {
				result.version = [results.version];
				result.main = [].concat(results.main);
				result.dependencies = results.dependencies;
			}

			promise.resolve( result );

		})
		.on('error', function( error ){
			log('error', error);
			promise.reject();
		});

		// lib.search( searchKey )
		// .done(function( results ){

		// 	if ( cfg.showNote ) {
		// 		log(cfg.note, name);
		// 	}

		// });
		return promise;

	},

	install : function( installName, info, cfg ){

		cfg = extend(true, {
			note : 'install',
			forcedDownload : false,
			showNote : true
		}, cfg);

		console.log(installName);
		var promise = Promise(),
			name = info.name,
			version = info.version,
			dir = installName.split('=')[0],
			main = info.main || [],
			fromCache = false;

		var cacheLibSrc = P.root+B.builderPath+B.cache.lib+'/'+dir+'/',
			projectLibSrc = P.root+P.path+B.src.lib+'/'+dir+'/',
			cacheBowerSrc = cacheLibSrc +'bower.json',
			cacheBowerSrcHide = cacheLibSrc +'.bower.json';

		var installedSetConfig = function( info, bowerData ){
			
			// get lib type from main
			var mainlist,
				type = [];

			if ( bowerData.main ) {
				mainlist = [].concat( bowerData.main );
			} else {
				mainlist = [].concat( info.main );
			}

			_.each( mainlist, function(v){
				if ( v.search(/\.css$/g) !== -1 ) {
					type.push('css');
				}
				if ( v.search(/\.js$/g) !== -1 ) {
					type.push('js');
				}
			});

			type = _.uniq(type);

			info.type = type.join(',');
			info.main = mainlist;
			info.dependencies = bowerData.dependencies || {};

			mkdir(P.root + B.builderPath + B.jsCfg.lib + '/' + info.name);
			write(P.root + B.builderPath + B.jsCfg.lib + '/' + info.name + '/' + info.version + '.json', JSON.stringify(info));

			// reset anon define
			// has bug
			// if ( !fromCache ) {
			// 	_.each(info.main, function(v){
			// 		if ( v.search(/\.js$/g) !== -1 ) {
			// 			var jsfile = read( P.root + P.path + B.src.lib + '/' + info.name + '-' + info.version + '/' + v );
			// 			jsfile = jsfile.replace(/(define\()(.*?)(\,{0,1})(|\[)/g, '$1\''+info.name + '@' + info.version + '\',$4');
			// 			write(P.root + P.path + B.src.lib + '/' + info.name + '-' + info.version + '/' + v, jsfile);
			// 		}
			// 	});
			// }
			
			
		};

		// if has cache, load cache
		// if lib is custom don't download, just load from cache
		if ( ( !cfg.forcedDownload || info.custom ) && ( exists(cacheBowerSrc) || exists(cacheBowerSrcHide) ) ) {

			var cacheSrc;

			fromCache = true;

			if ( exists(cacheBowerSrc) ) {
				cacheSrc = cacheBowerSrc;
			} else if ( exists(cacheBowerSrcHide) ) {
				cacheSrc = cacheBowerSrcHide;
			}

			log( cfg.note, name + '@' + version + ' installed from cache' );
			ncp( cacheLibSrc, projectLibSrc  );
				
			// set config
			var bowerData = readJSON(cacheSrc);
			installedSetConfig({
				name : name,
				version : version,
				dir : dir,
				main : main,
				custom : info.custom || false
			}, bowerData );

			promise.resolve();

		} else {

			bower.commands
			.install([installName], { save: true }, {})
			.on('log', function( data ){
				cfg.showNote && log( cfg.note, data.id + ' ' + data.message );
			})
			.on('prompt', function (prompts, callback) {
			    inquirer.prompt(prompts, callback);
			})
			.on('end', function(installed){

				// if lib already exists, don't show install
				_.find(installed, function( pkv ){

					log( cfg.note, name + '@' + version + ' installed' );
					
					// set config
					installedSetConfig({
						name : name,
						version : version,
						dir : name+'-'+version,
						main : main,
						custom : info.custom || false
					}, pkv.pkgMeta );

					// save cache
					ncp( projectLibSrc, cacheLibSrc );

					return true;

				});

				promise.resolve();

			})
			.on('error', function(error){

				if ( error.details ) {
					log('error', v.name + '#' + v.version + ' : ' + error.details);
				} else {
					log('error', 'unknow error, detail:');
					console.log(error);
					// TODO u can reported to github
				}

				promise.reject();

			});

		}

		// if install success, clean cache & rebuild tree
		promise.done(function(){
			cache.clean('liblist');
			tree.build();
		});

		return promise;
	},

	uninstall : function( uninstallName, cfg ){
		
		cfg = extend(true, {
			note : 'uninstall',
			showNote : true
		}, cfg);

		var promise = Promise(),
			name = uninstallName.replace(/^(.+)\-(.+?)$/g, '$1'),
			version = uninstallName.replace(/^(.+)\-(.+?)$/g, '$2');

		bower.commands
		.uninstall([uninstallName], { save: true }, {})
		.on('log', function( data ){
			cfg.showNote && log( cfg.note, data.id + ' ' + data.message );
		})
		.on('prompt', function (prompts, callback) {
		    inquirer.prompt(prompts, callback);
		})
		.on('end', function(uninstall){

			// set config
			var	libConfigDir = P.root + B.builderPath + B.jsCfg.lib + '/' + name,
				libConfig = libConfigDir + '/' + version + '.json',
				fileNum = 0;

			if ( exists(libConfigDir) ) {

				if ( exists(libConfig) ) {
					del(libConfig);
					cfg.showNote && log( cfg.note, name + '@' + version + ' removed' );
				} else {
					log( 'error', 'project not install ' + name + '@' + version );
				}

				recurse( libConfigDir, function(abspath, rootdir, subdir, filename){
					fileNum++;
				});

				if ( fileNum === 0 ) {
					del(libConfigDir);
				}

				// if uninstall success, clean cache
				cache.clean('liblist');
				cache.clean('lib', name+'@'+version);

			} else {
				log( 'error', 'project not install ' + name );
			}
			
			promise.resolve();

		})
		.on('error', function(error){

			if ( error.details ) {
				log('error', name + '#' + version + ' : ' + error.details);
			}  else {
				log('error', 'unknow error, detail:');
				console.log(error);
				// TODO u can reported to github
			}
			
			promise.reject();

		});

		return promise;

	}

};

var libManager = {

	bowerCommand : bowerCommand,

	libFileExistsCheck : function( name, version ){
		// check has lib config
		if ( exists( P.root+B.builderPath+B.jsCfg.lib+'/'+name+'/'+version+'.json' ) ){
			log('error', name+'@'+version+' already exists, if can\'t found lib, use `bakari lib clean`');
			return true;
		} else {
			return false;
		}
	},

	libFileReset : function( name, version ){
		// check has lib files
		if ( exists( P.root+P.path+B.src.lib+'/'+name+'-'+version ) ){
			del( P.root+P.path+B.src.lib+'/'+name+'-'+version );
		}
	},

	// keylist is object list
	// the object like : 
	// {
	//     name : 'jquery',
	// 	   version : '1.11.0',
	// 	   custom : false,
	// 	   main : ['index.js', 'index.css'],
	// 	   path : '',
	// 	   type : 'js,css',
	// 	   dependencies : ['js@0.0.1']
	// }
	// dependencies just lib
	install : function( keylist, cfg ){

		keylist = [].concat(keylist);

		var promise = Promise(),
			installName;
		
		cfg = extend(true, {
			note : 'install',
			forcedDownload : false,
			showNote : true
		}, cfg);

		// if libs is null
		if ( !keylist || _.size(keylist) === 0 ) {
			log('warning', 'did not install any libs');
			promise.resolve();
			return promise;
		}

		var installOne = function(){

			if ( keylist.length === 0 ) {
				promise.resolve();
				return;
			}

			var onePromise = Promise(),
				v = keylist.shift();

			var hookDone = function(){
				onePromise.resolve();
			},
			hookFail = function(){
				log('warning', v.name+'@'+v.version+' install fail');
				onePromise.resolve();
			};

			onePromise.always(function(){
				installOne();
			});
			
			cfg.showNote && log('install', v.name+'@'+v.version+' start the installation' );

			// if custom lib
			if ( v.custom ) {
				installName = v.name+'-'+v.version+'='+v.path;
				delete v.path;
				bowerCommand.install( installName, v, cfg )
				.done(hookDone)
				.fail(hookFail);
			} else {

				installName = v.name+'-'+v.version+'='+v.name+'#'+v.version;

				// check dependencies
				bowerCommand.info( v.name+'@'+v.version )
				.done(function( info ){

					cfg.showNote && log('dependencies', 'checking, it takes some time');

					if ( info && !_.isEmpty(info.dependencies) ) {

						var installRely = function(){

							if ( needInstall.length === 0 ) {
								bowerCommand.install( installName, v, cfg )
								.done(hookDone)
								.fail(hookFail);
								return;
							}

							var key = needInstall.shift();
							libManager.install({
								name : key.split('@')[0],
								version : key.split('@')[1]
							})
							.always(function(){
								installRely();
							});

						};

						var str = '', needInstall = [], depenSize = _.size(info.dependencies);
						_.each(info.dependencies, function(dv, dk){
							if ( versionManager.hasLib( dk, dv ) ) {
								str += '\n\t\t\t'+dk+'@'+dv+' : '+colors.fg.getRgb(1,4,0)+'installed'+colors.reset;
								if ( --depenSize === 0 ) {
									cfg.showNote && log('dependencies', v.name+'@'+v.version+' : ' + str);
									installRely();
								}
							} else {
								str += '\n\t\t\t'+dk+'@'+dv+' : '+colors.fg.getRgb(3,0,0)+'uninstall'+colors.reset;
								bowerCommand.info( dk, { showNote : false } )
								.always(function( info ){
									needInstall.push(dk+'@'+versionManager.greater( info.version, dv ));
									if ( --depenSize === 0 ) {
										cfg.showNote && log('dependencies', v.name+'@'+v.version+' : ' + str);
										installRely();
									}
								});
							}
						});

					} else {
						cfg.showNote && log('dependencies', 'no dependencies');
						bowerCommand.install( installName, v, cfg )
						.done(hookDone)
						.fail(hookFail);
					}
				})
				.fail(function(){
					promise.reject();
				});

			}

		};

		installOne();

		return promise;

	},

	customInstall : function( path, cfg ){

		cfg = extend(true, {
			note : 'install',
			forcedDownload : false,
			showNote : true
		}, cfg);

		var promise = Promise(),
			liblist = cache.get('liblist'),
			libs = [];

		_.each( liblist, function(lv){
			_.each( lv, function(v){
				libs.push( v.name + '@' + v.version );
			});
		});
		
		// set lib
		inquirer.prompt([
			{
				name : 'name',
				type : 'input',
				message : 'lib name:',
				default : path.replace(/.+\/(.+?)$/g, '$1')
			},
			{
				name : 'version',
				type : 'input',
				message : 'lib version(like 0.0.1):'
			},
			{
				name : 'type',
				type : 'list',
				message : 'lib type:',
				choices : ['js', 'css', 'js,css']
			},
			{
				name : 'main',
				type : 'input',
				message : 'main file:'
			},
			{
				name : 'dependencies',
				type : 'checkbox',
				message : 'dependencies:',
				choices : libs
			}
		], function( answers ) {

			answers.version = answers.version || '0.0.1';

			if ( libManager.libFileExistsCheck( answers.name, answers.version ) ) {
				promise.reject();
				return;
			}

			libManager.libFileReset( answers.name, answers.version );

			libManager.install({
				name : answers.name,
			    version : answers.version,
			    custom : true,
			    main : answers.main.split(','),
			    path : path,
			    type : answers.type,
			    dependencies : answers.dependencies
			}, cfg )
			.done(function(){
				promise.resolve();
			})
			.fail(function(){
				promise.reject();
			});

		});

		return promise;

	},

	uninstall : function( keylist, cfg ){
		

		keylist = [].concat(keylist);

		var promise = Promise(),
			uninstallName,
			uninstallCount = 0;
		
		cfg = extend(true, {
			note : 'uninstall',
			showNote : true
		}, cfg);

		// if libs is null
		if ( !keylist || _.size(keylist) === 0 ) {
			log('warning', 'did not uninstall any libs');
			promise.resolve();
			return promise;
		}

		uninstallCount = _.size(keylist);

		_.each( keylist, function(v){

			uninstallName = v.name+'-'+v.version;
				
			// check libs rely
			if ( tree.hasChild('lib:'+v.name+'@'+v.version) ) {
				log('error', 'can\'t remove lib, some code rely this lib : ');
				tree.get().showChild('lib:'+v.name+'@'+v.version);
				promise.reject();
				return promise;
			}

			bowerCommand.uninstall( uninstallName, cfg )
			.done(function(){
				promise.resolve();
			})
			.fail(function(){
				promise.reject();
			});

		});

		return promise;

	}

};

module.exports = libManager;