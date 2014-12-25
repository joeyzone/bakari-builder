#!/usr/bin/env node
// ==================================================
// bakariBuilder 0.0.8 @dev
// ==================================================
'use strict';
var startTime = +new Date();
var version = '0.0.8';
var chalk = require('chalk'),
	program = require('commander'),
	shell = require('shelljs'),
	grunt = require('grunt'),
	_ = require('underscore'),
	Promise = require('bakari-promise'),
	extend = require('extend'),
	resetBowerConfig = require('./node_modules/bower/lib/config').reset,
	gulp = require('gulp');

// ==================================================
// needLibs - demand loading libs
// ==================================================
var needLibs = function( name, libs ){
	
	if ( global[name] === undefined ) {
		global[name] = require( libs || name );
	}

};


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
		biz : '/src/biz',
		pkg : '/src/pkg'

	},

	proVersion : '/pro/.version',

	// bower config
	bowerrcPath : '/.bowerrc',

	// builder version file
	versionFile : '/.bakari-builder/.version',

	// builder config path
	builderPath : '/.bakari-builder',

	// libs config file
	libConfig : '/.bakari-builder/libs',

	// biz config file
	bizConfig : '/.bakari-builder/biz',

	// project config file
	projectConfig : '/.bakari-builder/project.json',

	// biz template
	biztpl : '/.jsbiztpl',

	jshintConfig : '/.jshintrc',

	uglifyConfig : '/.uglifyrc'

};


// ==================================================
// project config
// ==================================================
var project = {

	// 项目名称
	name : null,

	// 项目根目录
	rootPath : '.',

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
// helper
// ==================================================
var helper = {

	log : function( status, msg ){
		
		console.log( chalk.red('bakari ') + chalk.green(status.toLocaleUpperCase()+' ') + (msg || '') );

		if ( status.toLowerCase() === 'error' && typeof commandDone === 'function' ) {
			commandDone();
		}

	},

	// save project config
	saveProjectConfig : function(){
		needLibs('moment', 'moment');
		delete project.libs;
		project.lastupdate = moment().format('YYYY-MM-DD HH:mm:ss');
		grunt.file.write( project.rootPath+builder.projectConfig, JSON.stringify( project ) );
	},

	firstToUpperCase : function( string ){
		return string.slice(0,1).toUpperCase() + string.slice(1,string.length);
	},

	firstToLowerCase : function( string ){
		return string.slice(0,1).toLowerCase() + string.slice(1,string.length);
	},

	dashToHump : function( string ){
		
		var wordList = string.split('/');

	    // if split the array length is 1, return original string
	    if ( wordList.length === 1 ) {
	        return string;
	    }

	    for ( var i=0; i < wordList.length; i++ ){
	        wordList[i] = helper.firstToUpperCase(wordList[i]);
	    }

	    wordList[0] = helper.firstToLowerCase( wordList[0] );

	    return wordList.join('');

	},

	// check biz rely
	// input a page id, detecting whether there is dependent business logic 
	checkBizRely : function( pageid ){

		var rely = [];
		grunt.file.recurse( project.rootPath+builder.bizConfig, function(abspath, rootdir, subdir, filename){

			var json = grunt.file.readJSON(abspath);

			if ( json.extendPage === pageid ) {
				rely.push({
					path : json.path,
					pageId : json.pageId
				});
			}

		});

		return rely;
		
	},

	// get biz page config path
	getBizConfigPath : function( pageid ){
		
		return project.rootPath+builder.bizConfig+'/'+pageid.split(/[A-Z]/g)[0]+'/'+pageid+'.json';

	},

	// get some biz page config
	getBizConfig : function( pageid ){
		
		var config = {},
			src = helper.getBizConfigPath( pageid );

		if ( cache.bizConfig[pageid] ) {
			config = cache.bizConfig[pageid];
		} else if ( grunt.file.exists(src) ) {
			config = grunt.file.readJSON(src);
			cache.bizConfig[pageid] = config;
		}
		
		return config;

	},

	// get some lib config
	getLibsConfig : function( pkg, version ){
		
		var config = {},
			src = project.rootPath + builder.libConfig + '/' + pkg + '/' + version + '.json';
		
		if ( cache.libConfig[pkg+'@'+version] ) {
			config = cache.libConfig[pkg+'@'+version];
		} else if ( grunt.file.exists(src) ) {
			config = grunt.file.readJSON(src);
			cache.libConfig[pkg+'@'+version] = config;
		}
		
		return config;

	},

	// get rely lib of biz
	getLibsChild : function( pkg, version ){
		
		var list = [];

		// check cache
		if ( cache.libChild[pkg+'@'+version] ) {

			list = cache.libChild[pkg+'@'+version];

		} else if ( grunt.file.exists( project.rootPath + builder.bizConfig ) ) {
			
			// each all biz config
			grunt.file.recurse( project.rootPath + builder.bizConfig, function(abspath, rootdir, subdir, filename){
				
				var config = grunt.file.readJSON(abspath);

				_.each(config.libs, function(v){
					if ( v.pkg === pkg && v.version === version ) {
						list.push(config.pageId);
					}
				});

			});

			cache.libChild[pkg+'@'+version] = list;

		}

		return list;

	},

	// get all parent page id
	getParentPageId : function( pageid, list ){
		
		list = list || [];

		if ( cache.parentPageId[pageid] ) {

			// query cache
			list = cache.parentPageId[pageid];

		} else {

			var parent = helper.getBizConfig(pageid).extendPage;
			if ( parent ) {
				list.push( parent );
				helper.getParentPageId( parent, list );
			}

			// write cache
			if ( list.length === 0 ) {
				cache.parentPageId[pageid] = list;
			}

		}
		
		return list;

	},

	// get all child page id
	getChildPageId : function( pageid, list ){
		
		list = list || [];

		var addList = [];

		if ( grunt.file.exists( project.rootPath + builder.bizConfig ) ) {
			grunt.file.recurse( project.rootPath + builder.bizConfig, function(abspath, rootdir, subdir, filename){
				
				var config = grunt.file.readJSON(abspath);

				if ( config.extendPage === pageid ) {
					addList.push(config.pageId);
				}

			});
		}

		list = list.concat(addList);

		_.each(addList, function(v){
			list = list.concat(helper.getChildPageId( v ));
		});

		return list;

	},

	// check some page id is exist
	hasPageid : function( pageid ){
		
		var find = false;
		grunt.file.recurse( project.rootPath+builder.bizConfig, function(abspath, rootdir, subdir, filename){

			var page = filename.replace(/\.json$/g, '');
			if ( page === pageid ) {
				find = true;
			}

		});

		return find;

	},

	// build one page js file
	buildPageJs : function( pageid ){

		var promise = Promise();
		
		// get config
		var config = helper.getBizConfig( pageid );

		// find src
		var src = [], bizsrc = [], libsrc = [], pkgsrc = [];

		// set js file path
		bizsrc.push( config.path );

		// find all parent page
		var parents = helper.getParentPageId( pageid );
		_.each( parents, function(v){

			var parnetConfig = helper.getBizConfig( v ),
				path = parnetConfig.path;
			if ( path ) {
				bizsrc.push(path);
			}

			// get parent rely libs
			_.each( parnetConfig.libs, function(plv){
				libsrc.push( project.rootPath + builder.jsPath + builder.jsDir.lib + '/' + plv.dir + '/' + plv.main );
			});

		});

		// reverse bizsrc & uniq bizsrc
		bizsrc.reverse();
		bizsrc = _.uniq(bizsrc);

		// get pkgsrc
		_.each( config.pkgs, function(v){
			pkgsrc.push( pkg[v] );
		});

		bizsrc = pkgsrc.concat( bizsrc );

		// set libs
		_.each( config.libs, function(v){
			libsrc.push( project.rootPath + builder.jsPath + builder.jsDir.lib + '/' + v.dir + '/' + v.main );
		});

		// uniq libsrc & as late as possible to load lib
		libsrc.reverse();
		libsrc = _.uniq(libsrc);
		libsrc.reverse();

		// set & hint biz src
		bizBuildPromise = Promise();
		libBuildPromise = Promise();
		buildType = 'biz';
		taskConfig.concat.src = bizsrc;
		taskConfig.concat.dest = project.rootPath + builder.jsPath + builder.jsDir.dev;
		taskConfig.concat.file = config.pageId+'.js';
		taskConfig.uglify.src = bizsrc;
		taskConfig.uglify.dest = project.rootPath + builder.jsPath + builder.jsDir.pro;
		taskConfig.uglify.file = config.pageId+'.js';
		taskConfig.jshint.src = bizsrc;
		// run biz task
		buildWithDev ? gulp.start('buildWithDev') : gulp.start('build');

		bizBuildPromise.done(function(){
			
			// set lib src
			buildType = 'lib';
			taskConfig.concat.src = libsrc;
			taskConfig.concat.dest = project.rootPath + builder.jsPath + builder.jsDir.dev;
			taskConfig.concat.file = config.pageId+'.lib.js';
			taskConfig.uglify.src = libsrc;
			taskConfig.uglify.dest = project.rootPath + builder.jsPath + builder.jsDir.pro;
			taskConfig.uglify.file = config.pageId+'.lib.js';
			taskConfig.jshint.src = [];

			// run biz task
			setTimeout(function(){
				buildWithDev ? gulp.start('buildWithDev') : gulp.start('build');
			});

		});

		bizBuildPromise.fail(function(){
			promise.reject();
		});

		libBuildPromise.done(function(){
			setTimeout(function(){
				promise.resolve();
			});
		})
		.fail(function(){
			promise.reject();
		});

		return promise;

	},

	// build js list
	buildJsList : function( list ){
		
		var promise = Promise(),
			len = list.length,
			stime = _.now();

		var builder = function(){
			if ( list.length > 0 ) {
				helper.buildPageJs( list.shift() ).done(builder);
			} else {
				promise.resolve();
			}
		};

		builder();

		promise.done(function(){
			helper.log('build success', 'build ' + len + ' files in ' + (_.now() - stime) + 'ms');
		});

		return promise;

	}

};


// ==================================================
// loading data
// ==================================================
// load project config
var pwd = shell.pwd(),
	pkg = {};
if ( grunt.file.exists( pwd + builder.projectConfig ) ){
	project = extend( true, project, grunt.file.readJSON( pwd + builder.projectConfig ) );
}

// load libs config
if ( grunt.file.exists( pwd + builder.libConfig ) ) {

	grunt.file.recurse( pwd + builder.libConfig, function(abspath, rootdir, subdir, filename){

		if ( project.libs[subdir] === undefined ) {
			project.libs[subdir] = {};
		}

		project.libs[subdir][filename.replace(/\.json$/,'')] = grunt.file.readJSON( abspath );
		
	});

}

// load jshint config
var jshintConfig = {};
if ( grunt.file.exists( pwd + builder.jshintConfig ) ) {
	try{
		jshintConfig = grunt.file.readJSON( pwd + builder.jshintConfig );
	}catch(e){
		helper.log('warning', e.message);
	}
}

// load uglify config
var uglifyConfig = {};
if ( grunt.file.exists( pwd + builder.uglifyConfig ) ) {
	try{
		uglifyConfig = grunt.file.readJSON( pwd + builder.uglifyConfig ); 
	}catch(e){
		helper.log('warning', e.message);
	}
}

// load pkg data
if ( grunt.file.exists( pwd + builder.jsPath + builder.jsDir.pkg ) ) {
	grunt.file.recurse( pwd + builder.jsPath + builder.jsDir.pkg , function(abspath, rootdir, subdir, filename){
		pkg[filename.replace(/\.js$/,'')] = project.rootPath + builder.jsPath + builder.jsDir.pkg + '/' + filename;
	});
}

// ==================================================
// biz config
// ==================================================
var bizDefaultConfig = {

	// page id
	pageId : '',

	// extend page id
	extendPage : '',

	// js files path 
	path : '',

	// page note
	note : '',

	// rely libs
	libs : []

};

// ==================================================
// bowerrc config
// ==================================================
var bowerrc = {
	directory : null
};

// ==================================================
// cache
// ==================================================
var cache = {

	bizConfig : {},

	libConfig : {},

	parentPageId : {},

	libChild : {}

};

// ==================================================
// lib function
// ==================================================
var lib = {

	// search lib
	search : function( key ){

		needLibs('bower', 'bower');

		var promise = Promise();
		helper.log('search', key);

		bower.commands
		.search(key)
		.on('end', function(results){
			promise.resolve( results );
		})
		.on('error', function(){
			helper.log('error', 'search lib fail');
			promise.reject();
		})

		return promise;
		
	},

	// get lib information by name
	info : function( libs ){

		needLibs('bower', 'bower');
		
		var promise = Promise(),
			info = {},
			num = libs.length;

		_.each( libs, function(v,k){

			// if v is url or local path
			if ( v.search('/') !== -1 ) {

				info[v] = {};
				info[v][0] = {
					path : v,
					custom : true
				}
				promise.resolve( info );
				return;

			}

			lib.search(v)
			.done(function( results ){
				
				if ( results.length > 0 ) {

					helper.log('get', v);
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
						};

						if ( !--num ) {
							promise.resolve( info );
						}

					})
					.on('error', function(){

						helper.log('error', v + ' : ' + error.details);

						if ( !--num ) {
							promise.resolve();
						}

					});

				} else {
					promise.reject();
				}

			});

		});

		return promise;

	},

	// install lib
	install : function( libs, cfg ){

		needLibs('bower', 'bower');

		cfg = extend(true, {
			note : 'installed',
			showGet : true
		}, cfg);

		var promise = Promise(),
			num = 0;

		// if libs is null
		if ( !libs ) {
			promise.resolve();
			return;
		}

		_.each(libs, function(lv){
			_.each(lv, function(v,k){

				num++;
				
				var installName;
				if ( v.custom ) {
					installName = v.path;
				} else {
					installName = v.dir+'='+v.pkg+'#'+v.version;
				}
				

				bower.commands
				.install([installName], { save: true }, {})
				.on('log', function( data ){
					if ( data.level === 'info' && cfg.showGet  ) {
						if ( v.custom ) {
							helper.log('get', data.message);
						} else {
							helper.log('get', v.pkg+'#'+v.version + ' : ' + data.message);
						}
					}
				})
				.on('end', function(installed){

					if ( v.custom ) {

						var name = v.path.replace(/^.+\/(.+?)\.js$/g, '$1');
						helper.log( cfg.note, name + '@custom' );
						// set config
						grunt.file.mkdir(project.rootPath + builder.libConfig + '/' + name);
						grunt.file.write(project.rootPath + builder.libConfig + '/' + name + '/custom.json', JSON.stringify({
							dir : name,
							version : 'custom',
							pkg : name,
							main : 'index.js'
						}));

					} else {

						_.find(installed, function( pkv ){

							helper.log( cfg.note, v.pkg + '@' + v.version );

							// set config
							v.main = pkv.pkgMeta.main;
							grunt.file.mkdir(project.rootPath + builder.libConfig + '/' + v.pkg);
							grunt.file.write(project.rootPath + builder.libConfig + '/' + v.pkg + '/' + v.version + '.json', JSON.stringify(v));

							return true;

						});

					}

					if ( !--num ) {
						promise.resolve();
					}

				})
				.on('error', function(error){

					helper.log('error', v.pkg + '#' + v.version + ' : ' + error.details);

					if ( !--num ) {
						promise.resolve();
					}

				});

			});
		});

		return promise;

	},

	// uninstall lib
	uninstall : function( libs, cfg ){

		needLibs('bower', 'bower');
		
		cfg = extend(true, {
			note : 'uninstalled'
		}, cfg);

		var promise = Promise(),
			num = 0;

		// if libs is null
		if ( !libs ) {
			promise.resolve();
			return;
		}

		_.each(libs, function(lv){
			_.each(lv, function(v,k){

				num++;

				// check libs rely
				var libChild = helper.getLibsChild( v.pkg, v.version );
				if ( libChild.length > 0 ) {
					helper.log('error', 'some biz rely '+v.pkg+'@'+v.version+':\n'+libChild.join('\n'));
					return;
				}

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
					
					if ( !--num ) {
						promise.resolve();
					}

				})
				.on('error', function(error){

					helper.log('error', v.pkg + '#' + v.version + ' : ' + error.details);
					
					if ( !--num ) {
						promise.resolve();
					}

				});

			});
		});

		return promise;

	},

	// uninstall all lib
	uninstallAll : function( cfg ){
		// TODO
	},

};

var cli = {};


// ==================================================
// gulp task
// ==================================================
var taskConfig = {},
	bizBuildPromise,
	libBuildPromise,
	buildType,
	buildWithDev = null;

// beforeBuild private task
gulp.task('_beforeBuild', function(){

	// report concat files
	_.each( taskConfig.concat.src, function(v,k){
		
		if ( k === 0 ) {
			helper.log('┏', v);
		} else {
			helper.log('┣', v);
		}

	});

	// set version key
	taskConfig.version.key = [ taskConfig.concat.file.replace(/\.js$/g,'') ];
	// console.log(extend(true, {}, taskConfig));

});

// buildDone private task
gulp.task('_buildDone', function(){

	helper.log('┗', chalk.green('━➞ ' + taskConfig.concat.file.replace(/\.js$/g, '') + ' ') + taskConfig.concat.file );
	
	if ( buildType === 'lib' ) {
		libBuildPromise.resolve();
	} else if ( buildType === 'biz' ) {
		bizBuildPromise.resolve();
	}
	
});

// buildFail private task
gulp.task('_buildFail', function(){
	helper.log('┗', chalk.green('━➞ jshint fail') );
	helper.log('build fail');
	if ( buildType === 'lib' ) {
		libBuildPromise.reject();
	} else if ( buildType === 'biz' ) {
		bizBuildPromise.reject();
	}
});

// defautl task
gulp.task('default', function(){});

// jshint task
taskConfig.jshint = {
	src : null
};
gulp.task('jshint', function(){
	
	needLibs('jshint', 'gulp-jshint');
	needLibs('map', 'map-stream');

	var srcLen = taskConfig.jshint.src.length,
		index = 0,
		hintFail = false;

	if ( taskConfig.jshint.src === null ) {
		helper.log('error', 'task jshint src is null');
		return;
	}

	// if src length is 0, don't hint
	if ( taskConfig.jshint.src.length === 0 ) {
		buildWithDev ? gulp.start('_buildWithDev') : gulp.start('_build') ;
		return;
	}

	var bakariReporter = map(function (file, cb) {

		index++;

		if (!file.jshint.success) {
			hintFail = true;
	  	}

		if ( srcLen === index ) {
			if ( hintFail ) {
				gulp.start('_buildFail');
			} else{
				buildWithDev ? gulp.start('_buildWithDev') : gulp.start('_build') ;
			}
		}

	  	cb(null, file);

	});

	gulp.src(taskConfig.jshint.src)
		.pipe(jshint(jshintConfig))
		.pipe(bakariReporter)
		.pipe(jshint.reporter('jshint-stylish'));

});

// concat task
taskConfig.concat = {
	src : null,
	dest : null,
	file : null
};
gulp.task('concat', function(){

	needLibs('concat', 'gulp-concat');

	if ( taskConfig.concat.src === null ||
		 taskConfig.concat.dest === null ||
		 taskConfig.concat.file === null ) {
		helper.log('error', 'task concat src or dest or file is null');
		return;
	}
	
	gulp.src(taskConfig.concat.src)
		.pipe(concat(taskConfig.concat.file, {newLine: ';'}))
        // .pipe(header(bakariHeader))
        // .pipe(footer(';\n'))
		.pipe(gulp.dest(taskConfig.concat.dest));

});

// uglify task
taskConfig.uglify = {
	src : null,
	dest : null,
	file : null
};
gulp.task('uglify', function(){
	
	needLibs('uglify', 'gulp-uglify');

	if ( taskConfig.uglify.src === null ||
		 taskConfig.uglify.dest === null ||
		 taskConfig.uglify.file === null ) {
		helper.log('error', 'task uglify src or dest or file is null');
		return;
	}
	
	gulp.src(taskConfig.uglify.src)
		.pipe(concat(taskConfig.uglify.file))
		.pipe(uglify(uglifyConfig))
		.pipe(gulp.dest(taskConfig.uglify.dest));

});

// watch task
taskConfig.watch = {
	src : null
};
gulp.task('watch', function(){

	needLibs('livereload', 'gulp-livereload');
	livereload.listen();
	
	helper.log('watching', taskConfig.watch.src.join('\n'));

	if ( buildWithDev === null ) {
		buildWithDev = true;
	}

	gulp.watch(taskConfig.watch.src)
	.on('change', function(data){

		if ( data.type === 'changed' ) {

			helper.log('changed', data.path);

			var pageid = data.path.replace(/.+\/([a-zA-Z0-9]+?)\.js$/g, '$1'),
				childList = helper.getChildPageId( pageid );

			helper.buildJsList([pageid].concat(childList)).done(function(){
				livereload.changed(data);
				helper.log('watching...');
			});

		}

	});

});

// version task
taskConfig.version = {
	key : null
};
gulp.task('version', function(){

	needLibs('MD5', 'MD5');
	
	if ( taskConfig.uglify.pageId === null ) {
		helper.log('error', 'task version pageId is null');
		return;
	}

	// set pro version
	// get version file
	var proVersion = {},
		proVersionSrc = project.rootPath + builder.jsPath + builder.proVersion;

	if ( grunt.file.exists( proVersionSrc ) ) {
		proVersion = grunt.file.readJSON( proVersionSrc );
	}

	// get src version
	_.each( taskConfig.version.key, function(v){
		
		var fileSrc = project.rootPath + builder.jsPath + builder.jsDir.pro + '/' + v + '.js',
			md5Str = '';
		
		if ( grunt.file.exists(fileSrc) ) {
			md5Str = MD5( grunt.file.read(fileSrc) );
		}

		proVersion[v] = {
			md5 : md5Str,
			date : _.now()
		};

	});
	
	// save pro version
	grunt.file.write( proVersionSrc, JSON.stringify(proVersion) );

});

// build task
gulp.task('build', ['_beforeBuild', 'jshint']);

// _build private task
gulp.task('_build', ['concat', 'uglify', 'version', '_buildDone']);

// buildWithDev task
gulp.task('buildWithDev', ['_beforeBuild', 'jshint']);

// buildWithDev
gulp.task('_buildWithDev', ['concat', '_buildDone']);


// ==================================================
// command
// ==================================================
// command done
var commandDone = function(){
	if ( program.timing ) {
		var runTime = +new Date() - +startTime;
		helper.log('runtime', runTime+'ms');
	}
};

// init @early
cli.init = function(){

	needLibs('inquirer', 'inquirer');
		
	var promise = Promise();
	promise.done(function(){
		helper.saveProjectConfig();
		helper.log('initialization complete', '');
	});

	inquirer.prompt([
		// {
		// 	name : 'rootPath',
		// 	type : 'input',
		// 	message : 'project path:',
		// 	default : '.'
		// },
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
			default : _.keys(project.libs),
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
		// project.rootPath = answers.rootPath;

		// make dir
		grunt.file.mkdir( project.rootPath+builder.builderPath );

		// make lib config dir
		grunt.file.mkdir( project.rootPath+builder.libConfig );

		// make biz config dir
		grunt.file.mkdir( project.rootPath+builder.bizConfig );

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
			.info( answers.libs )
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
	
	promise.done(commandDone);
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
		helper.log('project cleared');
	});
	
	// reset bowerrc
	bowerrc.directory = '.' + project.jsPath + builder.jsDir.lib;
	grunt.file.write( project.rootPath+builder.bowerrcPath, JSON.stringify(bowerrc) );
	resetBowerConfig();
	helper.log('cleared', '.bowerrc');

	// reset libs
	cli.cleanlib()
	.done(function(){

		// clean biz
		cli.cleanbiz()
		.done(function(){
			promise.resolve();
		});

	});

	promise.done(commandDone);
	return promise;

};
program
	.command('clean')
	.description('clean project')
	.action(cli.clean)

// test @early
cli.test = function(){

	var promise = Promise();

	gulp.start('version');
	helper.log('run test');

	promise.done(commandDone).resolve();
	return promise;

};
program
	.command('test')
	.description('just test builder')
	.action(cli.test);

// addlib @early
cli.addlib = function(name){
	
	// check name
	if ( typeof name !== 'string' ) {
		helper.log('error', 'you must input a lib name');
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
		.info([name])
		.done(function(data){
			lib
			.install(data)
			.done(function(){
				promise.resolve();
			})
		})
		.fail(function(){
			helper.log('error', 'not found lib : '+name);
			promise.resolve();
		})

	}

	promise.done(commandDone);
	return promise;

};
program
	.command('addlib')
	.description('add a lib for project')
	.action(cli.addlib); 

// rmlib @early
cli.rmlib = function(name){

	// check name
	if ( typeof name !== 'string' ) {
		helper.log('error', 'you must input a lib name');
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

	promise.done(commandDone);
	return promise;

};
program
	.command('rmlib')
	.description('remove a lib from project')
	.action(cli.rmlib);

// cleanlib @early
cli.cleanlib = function(){

	var promise = Promise();
	promise.done(function(){
		helper.log('lib cleared');
	});

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

	promise.done(commandDone);
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

	promise.done(commandDone).resolve();
	return promise;

};
program
	.command('liblist')
	.description('lib info')
	.action(cli.liblist);

// searchlib @early
cli.searchlib = function( key ){
	
	if ( typeof key !== 'string' ) {
		helper.log('error', 'you must input a keyword');
		return;
	}

	lib.search(key)
	.done(function( results ){

		if ( results.length > 0 ) {

			helper.log(results.length+' results :');
			_.each( results, function(v){
				console.log( v.name + ' : ' + v.url );
			});

		} else {
			helper.log('no results');
		}

	});

};
program
	.command('searchlib')
	.description('search lib')
	.action(cli.searchlib);
	

// addbiz @early
cli.addbiz = function( page ){

	needLibs('inquirer', 'inquirer');

	// check page
	if ( typeof page !== 'string' ) {
		helper.log('error', 'you must input a biz path');
		return;
	}

	var promise = Promise(),
		pageId = helper.dashToHump(page),
		hasLibs = [],
		file = '',
		path = page.split('/');


	_.each( project.libs, function(lv){
		_.each( lv, function(v,k){
			hasLibs.push(v.pkg+'@'+v.version);
		});
	});

	var defaultParent = pageId.replace(/[A-Z][a-z0-9_]+?$/g, '');

	if ( defaultParent === pageId ) {
		defaultParent = false;
	}

	inquirer.prompt([
		{
			name : 'checkPath',
			type : 'confirm',
			message : 'biz path:' + page
		},
		{
			name : 'pageId',
			type : 'input',
			message : 'page id:',
			default : pageId,
			when : function(answers){
				return answers.checkPath;
			}
		},
		{
			name : 'extendPage',
			type : 'input',
			message : 'extend page id:',
			default : defaultParent,
			when : function(answers){
				return answers.pageId;
			}
		},
		{
			name : 'useLibs',
			type : 'checkbox',
			message : 'use lib:',
			choices : hasLibs
		},
		{
			name : 'usePkg',
			type : 'checkbox',
			message : 'use package:',
			choices : _.keys(pkg)
		},
		{
			name : 'note',
			type : 'input',
			message : 'page note:'
		}
	], function( answers ) {

		promise.done(function(){
			helper.log('added', answers.pageId + '\t:\t' + src);
		});

		var src = project.rootPath+builder.jsPath+builder.jsDir.biz+'/'+path[0]+'/'+answers.pageId+'.js';

		// check file exists
		if ( grunt.file.exists( src ) ) {
			helper.log('error', src+' is already exists');
			return;
		}

		if ( answers.extendPage === 'false' ) {
			answers.extendPage = false;
		}

		// check extend page
		if ( answers.extendPage !== false && !helper.hasPageid( answers.extendPage ) ) {
			helper.log('error', 'parent page : '+answers.extendPage+' is not found');
			return;
		}

		if ( grunt.file.exists( project.rootPath+builder.biztpl ) ) {
			file = grunt.file.read( project.rootPath+builder.biztpl );
		}

		// render
		file = file.replace(/\{\{pageId\}\}/g, answers.pageId);
		if ( answers.extendPage !== false ) {
			file = file.replace(/\{\{extendPage\}\}/g, answers.extendPage);
		} else {
			// TODO if extendPage is null, don't render extendPage
		}

		// make file
		grunt.file.write( src, file );

		// get libs
		var libs = [];
		_.each( answers.useLibs, function(v,k){
			
			var str = v.split('@'),
			 	lib = helper.getLibsConfig( str[0], str[1] );
			libs.push({
				pkg : str[0],
				version : str[1],
				dir : str[0]+'-'+str[1],
				main : lib.main
			});

		});

		// make config
		var biz = extend( true, bizDefaultConfig, {
			pageId : pageId,
			path : src,
			extendPage : answers.extendPage,
			libs : libs,
			pkgs : answers.usePkg
		});

		// save config
		grunt.file.write( helper.getBizConfigPath(answers.pageId), JSON.stringify(biz) );

		promise.resolve();
		
	});
	
	promise.done(commandDone);
	return promise;

};
program
	.command('addbiz')
	.description('add business code')
	.action(cli.addbiz);


// setbiz
cli.setbiz = function( pageid ){

	needLibs('inquirer', 'inquirer');
	
	var promise = Promise(),
		config = helper.getBizConfig( pageid ),
		libs = [],
		hasLibs = [];

	promise.done(function(){
		helper.log('set success');
	});

	// check page id
	if ( _.isEmpty(config) ) {
		helper.log('error', 'not found '+pageid);
		return;
	}

	_.each( config.libs, function(lv){
		libs.push( lv.pkg+'@'+lv.version );
	});

	_.each( project.libs, function(lv){
		_.each( lv, function(v,k){
			hasLibs.push(v.pkg+'@'+v.version);
		});
	});

	inquirer.prompt([
		{
			name : 'pageId',
			type : 'input',
			message : 'page id:',
			default : config.pageId
		},
		{
			name : 'extendPage',
			type : 'input',
			message : 'extend page id:',
			default : config.extendPage,
			when : function(answers){
				return answers.pageId;
			}
		},
		{
			name : 'useLibs',
			type : 'checkbox',
			message : 'use lib:',
			choices : hasLibs,
			default : libs
		},
		{
			name : 'usePkg',
			type : 'checkbox',
			message : 'use package:',
			choices : _.keys(pkg),
			default : config.pkgs
		},
		{
			name : 'note',
			type : 'input',
			message : 'page note:',
			default : config.note,
		}
	], function( answers ) {

		var file = '',
			path = answers.pageId.split(/[A-Z]/g),
			src = project.rootPath+builder.jsPath+builder.jsDir.biz+'/'+path[0]+'/'+answers.pageId+'.js';

		if ( answers.extendPage === 'false' ) {
			answers.extendPage = false;
		}

		// check extend page
		if ( answers.extendPage !== false && !helper.hasPageid( answers.extendPage ) ) {
			helper.log('error', 'parent page : '+answers.extendPage+' is not found');
			return;
		}

		// if pageid change need check child page
		if ( answers.pageId !== config.pageId && helper.checkBizRely(config.pageId).length > 0 ) {
			helper.log('error', config.pageId + ' has child page, can\'t change page id');
			return;
		}

		// get js file content
		if ( grunt.file.exists( config.path ) ) {
			
			var reg = new RegExp('^(B\.)'+config.pageId+'( \= B.)'+config.extendPage, 'g');
			file = grunt.file.read( config.path );
			file = file.replace(reg, '$1{{pageId}}$2{{extendPage}}');

		} else {
			// if can't find js file
			file = grunt.file.read( project.rootPath+builder.biztpl );
		}

		// render
		file = file.replace(/\{\{pageId\}\}/g, answers.pageId);
		if ( answers.extendPage !== false ) {
			file = file.replace(/\{\{extendPage\}\}/g, answers.extendPage);
		} else {
			// TODO if extendPage is null, don't render extendPage
		}

		// make file
		grunt.file.write( src, file );

		// if page id change, delete old file
		if ( answers.pageId !== config.pageId &&
			 grunt.file.exists( config.path ) ) {
			grunt.file.delete( config.path );
		}

		// if page id change
		if ( answers.pageId !== config.pageId ) {

			// delete old dev and pro file
			grunt.file.delete( project.rootPath + builder.jsPath + builder.jsDir.dev + '/' + config.pageId + '.js' );
			grunt.file.delete( project.rootPath + builder.jsPath + builder.jsDir.pro + '/' + config.pageId + '.js' );

			// delete .version old pageid info
			var proVersion,
				proVersionSrc = project.rootPath + builder.jsPath + builder.proVersion;

			if ( grunt.file.exists( proVersionSrc ) ) {
				proVersion = grunt.file.readJSON( proVersionSrc );
				delete proVersion[config.pageId];
				grunt.file.write( proVersionSrc, JSON.stringify(proVersion) );
			}

		}

		// get libs
		var libs = [];
		_.each( answers.useLibs, function(v,k){
			
			var str = v.split('@'),
			 	lib = helper.getLibsConfig( str[0], str[1] );
			libs.push({
				pkg : str[0],
				version : str[1],
				dir : str[0]+'-'+str[1],
				main : lib.main
			});

		});
		
		// if page id change, change config
		if ( answers.pageId !== config.pageId ) {
			grunt.file.delete( helper.getBizConfigPath(config.pageId) );
		}

		// make config
		var biz = {
			pageId : answers.pageId,
			path : src,
			extendPage : answers.extendPage,
			libs : libs,
			pkgs : answers.usePkg
		};

		// save config
		grunt.file.write( helper.getBizConfigPath(answers.pageId), JSON.stringify(biz) );

		// clean cache
		delete cache.bizConfig[answers.pageId];

		// rebuild
		var childList = helper.getChildPageId( answers.pageId );

		helper.buildJsList([answers.pageId].concat(childList)).done(function(){
			promise.resolve();
		});

	});
	
	promise.done(commandDone);
	return promise;

};
program
	.command('setbiz')
	.description('set biz config')
	.action(cli.setbiz);


// rmbiz
cli.rmbiz = function( pageid ){

	needLibs('inquirer', 'inquirer');
	
	var promise = Promise();

	promise.done(function(){
		helper.log('removed', pageid);
	});

	// check child biz page
	var child = helper.checkBizRely( pageid );

	if ( child.length > 0 ) {
		helper.log('error', 'this page contains sub-pages:');
		_.each(child, function(v){
			console.log( v.pageId+' : '+v.path );
		});
		return;
	}

	inquirer.prompt([
		{
			name : 'recheck',
			type : 'confirm',
			message : 'remove page : ' + pageid
		}
	], function(){

		// get page config
		var config = helper.getBizConfig( pageid );
		
		// remove biz page
		grunt.file.delete( config.path );
		helper.log('delete', config.path);

		// remove config
		grunt.file.delete( helper.getBizConfigPath(pageid) );
		helper.log('delete', pageid+' config');

		promise.resolve();

	});

	promise.done(commandDone);
	return promise;

};
program
	.command('rmbiz')
	.description('remove business code')
	.action(cli.rmbiz);


// bizlist
cli.bizlist = function(){
	
	var promise = Promise(),
		list = [];

	console.log('project ' + chalk.cyan( project.name ) + '\t' + project.rootPath + project.jsPath + builder.jsDir.biz );

	// get all biz
	grunt.file.recurse( project.rootPath+builder.bizConfig, function(abspath, rootdir, subdir, filename){
		list.push( helper.getBizConfig(filename.replace(/\.json$/g, '')) );
	});

	_.each( list, function(v,k){
		if ( (k+1) === list.length ) {
			console.log( '└──' + v.pageId + ' ~ ' + v.extendPage );
		} else {
			console.log( '├──' + v.pageId + ' ~ ' + v.extendPage );
		}
	});

	promise.done(commandDone).resolve();
	return promise;

};
program
	.command('bizlist')
	.description('show all biz')
	.action(cli.bizlist);


// bizinfo
cli.bizinfo = function( pageid ){
	
	var promise = Promise(),
		detail = helper.getBizConfig(pageid);

	console.log('biz '+chalk.cyan( detail.pageId ));
	_.each(detail, function(v,k){
		
		if ( typeof v === 'string' ) {
			console.log( k + ' : ' + v );
		} else if ( k === 'libs' ) {

			var libs = [];
			_.each( v, function(lv){
				libs.push( lv.pkg+'@'+lv.version );
			});

			console.log( k + ' : ' + libs.join(' | ') );

		} else if ( _.isArray(v) ) {
			console.log( k + ' : ' + v.join(' | ') );
		}
		
	});

	// show child page
	var childList = helper.getChildPageId( pageid );
	if ( childList.length > 0 ) {
		console.log( 'child : '+childList.join(' | '));
	}

	// show parent page
	var parentList = helper.getParentPageId( pageid );
	if ( parentList.length > 0 ) {
		console.log( 'parent : '+parentList.join(' ➟ '));
	}

	promise.done(commandDone).resolve();
	return promise;

};
program
	.command('bizinfo')
	.description('show biz detail')
	.action(cli.bizinfo);


// cleanbiz
cli.cleanbiz = function(){

	needLibs('inquirer', 'inquirer');
	
	var promise = Promise(),
		excessPromise = Promise(),
		bizSrc = project.rootPath + builder.jsPath + builder.jsDir.biz,
		excess = [],
		hasFiles = [],
		pageid,
		parentId;

	promise.done(function(){
		helper.log('cleared all biz js files');
	});

	// get excess js files
	grunt.file.recurse( bizSrc, function(abspath, rootdir, subdir, filename){
		
		pageid = filename.replace(/\.js$/g, '');
		parentId = pageid.split(/[A-Z]/g)[0];

		if ( !helper.hasPageid( pageid ) ||
			 parentId !== subdir ) {
			excess.push(abspath);
		}
		hasFiles.push(pageid);

	});

	// clean excess js files
	inquirer.prompt([
		{
			name : 'cleanBizs',
			type : 'checkbox',
			message : 'need delete excess js files:',
			choices : excess,
			default : excess,
			when : function(){
				if ( !excess.length ) {
					excessPromise.resolve();
				}
				return excess.length;
			}
		}
	], function( answers ) {
		
		_.each( answers.cleanBizs, function(v){
			
			grunt.file.delete( v );
			helper.log('delete', v );

		});

		excessPromise.resolve();

	});

	excessPromise.done(function(){
		
		// add missing js files
		grunt.file.recurse( project.rootPath + builder.bizConfig, function(abspath, rootdir, subdir, filename){

			var find = false;
			pageid = filename.replace(/\.json$/g, '');
			_.find( hasFiles, function(v){
				if ( v === pageid ) {
					find = true;
					return;
				}
			});

			// if not find js file
			if ( !find ) {

				var file = '',
					config = helper.getBizConfig(pageid);

				// add missing file
				if ( grunt.file.exists( project.rootPath+builder.biztpl ) ) {
					file = grunt.file.read( project.rootPath+builder.biztpl );
				}

				// render
				file = file.replace(/\{\{pageId\}\}/g, config.pageId);
				file = file.replace(/\{\{extendPage\}\}/g, config.extendPage);

				// make file
				grunt.file.write( config.path, file );

				helper.log('added', config.pageId + '\t:\t' + config.path);

			}

		});

		promise.resolve();

	});

	promise.done(commandDone);
	return promise;

};
program
	.command('cleanbiz')
	.description('clean all biz js file')
	.action(cli.cleanbiz);


// build
cli.build = function( pageid ){

	var promise = Promise();

	// if has pageid, build this pageid
	if ( typeof pageid === 'string' ) {

		helper.buildJsList([pageid]).done(function(){
			promise.resolve();
		});

	} else {

		// if not pageid, build all
		// each all pageid
		var bizConfigSrc = project.rootPath + builder.bizConfig;
		if ( grunt.file.exists(bizConfigSrc) ) {

			var list = [];
			grunt.file.recurse(bizConfigSrc, function(abspath, rootdir, subdir, filename){
				pageid = filename.replace(/\.json$/g,'');
				list.push(pageid);
			});

			helper.buildJsList(list).done(function(){
				promise.resolve();
			});

		}

	}

	promise.done(commandDone);
	return promise;

};
program
	.command('build')
	.description('build development and production file')
	.action(cli.build);

// dev
cli.dev = function(){
	
	var promise = Promise();

	// set buildWithDev default value
	if ( arguments[0].parent.completeBuild ) {
		buildWithDev = false;
	}

	taskConfig.watch.src = [
		project.rootPath + builder.jsPath + builder.jsDir.src + '/**/*'
	];
	gulp.start('watch');

	promise.done(commandDone).resolve();
	return promise;

};
program
	.command('dev')
	.description('watch source file change and build file')
	.action(cli.dev);

// upversion
cli.upversion = function( pageid ){
	
	var promise = Promise();
	promise.done(function(){
		helper.log('version update');
	});

	// if has pageid, build this pageid
	if ( typeof pageid === 'string' ) {

		taskConfig.version.key = [pageid];
		gulp.start('version');
		promise.resolve();

	} else {

		// if not pageid, version all
		// each all pageid
		var bizConfigSrc = project.rootPath + builder.bizConfig;
		if ( grunt.file.exists(bizConfigSrc) ) {

			var list = [];
			grunt.file.recurse(bizConfigSrc, function(abspath, rootdir, subdir, filename){
				list.push(filename.replace(/\.json$/g,''));
			});

			taskConfig.version.key = list;
			gulp.start('version');
			promise.resolve();

		}

	}

	promise.done(commandDone);
	return promise;

};
program
	.command('upversion')
	.description('update production env version file')
	.action(cli.upversion);

// ==================================================
// set version & update
// ==================================================
var versionSrc = project.rootPath+builder.versionFile;

var updateScript = {

	// 0.0.3 -> 0.0.5
	'0.0.5' : function(){

		// get libs main
		cli.cleanlib();
		
		// reset biz config, add libs main
		var bizConfigSrc = project.rootPath + builder.bizConfig;
		if ( grunt.file.exists( bizConfigSrc ) ) {
			grunt.file.recurse( bizConfigSrc, function(abspath, rootdir, subdir, filename){
				
				var biz = grunt.file.readJSON(abspath);

				_.each( biz.libs, function( lv ){
					lv.main = helper.getLibsConfig( lv.pkg, lv.version ).main || '';
				});

				grunt.file.write( abspath, JSON.stringify(biz) );

			});
		}

		helper.log('update to', '0.0.5');

	}

};

if ( grunt.file.exists(versionSrc) ) {

	// check version, if version update, run update script
	var nowVerion = grunt.file.read(versionSrc);
	if ( version > nowVerion ) {

		helper.log('updating', 'plase wait...');
		_.each( updateScript, function(v,k){
			if ( k > nowVerion && k <= version ) {
				v();
			}
		});

		// reset version
		grunt.file.write( versionSrc, version);

	}

} else {
	
	// if not version file, create it
	grunt.file.write( versionSrc, version);

}


// ==================================================
// option
// ==================================================
program.option('-v, --use-version <version>', 'specify a version');
// program.option('-e, --env', 'set development(dev) or production(pro) environment');
program.option('-t, --timing', 'uptime statistics');
program.option('-c, --complete-build', 'development env complete build files, this option just for dev');


// ==================================================
// program
// ==================================================
program.version('0.0.8');
program.command('*').description('').action(commandDone);
program.parse(process.argv);

// check null command
var nullCommand = true;
for ( var k in process.argv ) {

	var v = process.argv[k];
	k = +k;

	if ( k !== 0 &&
		 k !== 1 &&
		 v.search('-') !== 0 ) {
		nullCommand = false;
	}

}

if ( nullCommand ) {
	commandDone();
}
