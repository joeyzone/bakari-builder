// task
'use strict';

var gulp = require('gulp'),
	helper = require('../lib/helper'),
	jshint = require('gulp-jshint'),
	Promise = require('bakari-promise'),
	concat = require('gulp-concat'),
	uglify = require('gulp-uglify'),
	ncp = require('ncp'),
	_ = require('underscore'),
	map = require('map-stream'),
	extend = require('extend'),
	shelljs = require('shelljs'),
	colors = require('ansi-256-colors'),
	moment = require('moment'),
	cache = require('../lib/cache'),
	stylish = require('jshint-stylish'),
	callback = require('gulp-fncallback'),
	livereload = require('gulp-livereload'),
	MD5 = require('MD5'),
	devBuild = false, jshintConfig = {}, ugfilyConfig = {},
	devMode = false;

var tc = {},
	dtc = {
		src : [],
		devDest : null,
		proDest : null,
		jshint : false,
		file : null
	};

// defautl task
gulp.task('default', function(){});

// ========================================
// handle
// ========================================
var handle = {

	beforeBuild : function( file, enc, cb ){

		// load jshint config
		if ( exists( P.root + B.jshintrcPath ) ) {
			jshintConfig = readJSON( P.root + B.jshintrcPath ) || jshintConfig;
		}

		// load ugfily config
		if ( exists( P.root + B.ugfilyrcPath ) ) {
			ugfilyConfig = readJSON( P.root + B.ugfilyrcPath ) || ugfilyConfig;
		}

		// report concat files
		_.each( tc.src, function(v,k){
			
			if ( k === 0 ) {
				helper.log('┏', v);
			} else {
				helper.log('┣', v);
			}

		});

		// set version key
		// taskConfig.version.key = [ taskConfig.concat.file.replace(/\.js$/g,'') ];

		file.tc = tc;
		cb();

	},

	buildDone : function( file, enc, cb ){

		// if src is null
		if ( file.tc.src.length > 0 ) {
			filenum++;
			helper.log('┗', colors.fg.getRgb(0,2,5)+'━➞ ' + colors.reset + colors.fg.getRgb(0,3,0) + file.tc.file + colors.reset );
		}

		file.tc.promise.resolve();
		cb();

	},

	buildFail : function( file, enc, cb ){
		
		file.tc.promise.reject();
		cb();

	},

	beforeVerup : function( file, enc, cb ){
		
		file.tc = tc;
		cb();
		
	},

	verupDone : function( file, enc, cb ){
		
		tc.index++;
		if ( tc.index === tc.num ) {
			file.tc.promise.resolve();
		}
		cb();

	},

	check : function( file, enc, cb ){
		
		if ( file.tc.src === null ||
			 file.tc.devDest === null ||
			 file.tc.file === null ||
			 file.tc.proDest === null ) {
			helper.log('error', 'task config is error');
			file.tc.promise.reject();
		} else {
			cb();
		}

	},

	version : function( file, enc, cb ){

		var type, lib = '', content = file.contents.toString(),
			filename = file.path.split('/').pop();

		if ( filename === '.jsVersion' || filename === '.cssVersion' ) {
			cb();
			return;
		}

		if ( filename.search(/\.js$/g) !== -1 ) {
			type = 'js';
		} else if ( filename.search(/\.css$/g) !== -1 ) {
			type = 'css';
		}

		if ( filename.search(/\.lib\.(js|css)$/g) !== -1 ) {
			lib = '.lib';
		}

		// set version
		// get version file
		var version = {},
			versionSrc = P.root + P.path + B.file[type+'Version'],
			oldVersion, newVersion;

		if ( exists( versionSrc ) ) {
			version = readJSON( versionSrc );
		}

		oldVersion = version[filename] || {};

		var md5 = MD5( content ),
			date = moment().format('MMDDss');

		if ( md5 !== oldVersion.md5 ) {

			version[filename] = {
				id : md5.slice(0,5)+date,
				md5 : md5
			};

			newVersion = version[filename];

			// save version
			write( versionSrc, JSON.stringify(version) );

			helper.log('┣', ' file '+filename+' '+(oldVersion.id||'')+' -> '+newVersion.id);

		}

		cb();

	}
	
};

var use = function( name, opt ){
	return callback(handle[name], opt);
};

// ========================================
// Tool task
// ========================================
// build js
gulp.task('buildjs', function(){

	if ( tc.src.length === 0 ) {
		helper.log('note', colors.fg.getRgb(0,3,0) + tc.file + colors.reset + ' is null');
		tc.promise.resolve();
		return;
	}

	var buffer = gulp.src(tc.src)
					 .pipe( use('beforeBuild', {once: true}) )
					 .pipe( use('check', {once: true}) );

	// if src length is 0, don't hint
	// jshint task
	if ( !(!tc.jshint || tc.src.length === 0) ) {
		
		buffer = buffer
		.pipe(jshint(jshintConfig))
		.pipe(jshint.reporter(stylish));

		if ( !devMode ) {
			buffer.pipe(jshint.reporter('fail'));
		}

	}

	// concat task
	buffer = buffer
	.pipe(concat(tc.file, {newLine: ';'}))
	.pipe(gulp.dest(tc.devDest));

	// uglify task
	if ( !global.devBuild ) {
		buffer = buffer
		.pipe(uglify(ugfilyConfig))
		.pipe(gulp.dest(tc.proDest))
	}

	buffer = buffer
	.pipe(use('version'))
	.pipe(use('buildDone'));

	return buffer;

});

// build css
gulp.task('buildcss', function(){

	if ( tc.src.length === 0 ) {
		helper.log('note', colors.fg.getRgb(0,3,0) + tc.file + colors.reset + ' is null');
		tc.promise.resolve();
		return;
	}

	var buffer = gulp.src(tc.src)
					 .pipe( use('beforeBuild', {once: true}) )
					 .pipe( use('check', {once: true}) );

	// concat task
	buffer = buffer
	.pipe(concat(tc.file, {newLine: '\n'}))
	.pipe(gulp.dest(tc.devDest))
	.pipe(gulp.dest(tc.proDest));

	buffer = buffer
	.pipe(use('version'))
	.pipe(use('buildDone'));

	return buffer;

});

// version up
var verupFiles;
gulp.task('versionUpdate', function(){

	var src, num = 0;

	if ( tc.type === 'js' ) {
		src = [P.root+P.path+B.dir.pro+'/*.js'];
	} else if ( tc.type === 'css' ) {
		src = [P.root+P.path+B.dir.pro+'/*.css'];
	} else if ( tc.type === false ) {
		src =[
			P.root+P.path+B.dir.pro+'/*.js',
			P.root+P.path+B.dir.pro+'/*.css'
		];
	}

	recurse( P.root+P.path+B.dir.pro, function(abspath, rootdir, subdir, filename){
		if ( filename.search(/\.js$/g) !== -1 &&
			 ( tc.type === 'js' || tc.type === false ) ) {
			num++;
		}
		if ( filename.search(/\.css$/g) !== -1 &&
			 ( tc.type === 'css' || tc.type === false ) ) {
			num++;
		}
	});
	
	tc.num = num;
	tc.index = 0;
	var buffer = gulp.src(src)
				 .pipe( use('beforeVerup') )
				 .pipe( use('version') )
				 .pipe( use('verupDone') );

	return buffer;

});

// watch task
gulp.task('watch', function(){

	livereload.listen();
	helper.log('watching', devCfg.src.join('\n'));
	devMode = true;

	gulp.watch(devCfg.src)
	.on('change', function(data){

		if ( data.type === 'changed' ) {

			var map = cache.get('pathMap'),
				pwd = shelljs.pwd(),
				path = data.path.replace(pwd, '').replace(/\\/g, '/'),
				id = map[path];	

			helper.log('change', path);

			devCfg.change(id)
			.done(function(){
				livereload.changed(data);
				helper.log('watching...', devCfg.src.join('\n'));
			});

		}

	});

});


// ========================================
// Flow task
// ========================================
// build task
gulp.task('dev', ['watch']);

var devCfg = {
	src : [],
	change : function(){}
};
var dev = function( cfg ){

	devCfg = cfg;
	gulp.start('dev');

};

var flowList = [], flowPromise, filenum = 0;
var flow = function( name, cfg ){

	var rtc = {};

	rtc = extend(true, {}, dtc, cfg);
	rtc.promise = Promise();
	rtc.name = name;
	flowList.push(rtc);

	return module.exports;
	
};

var flowStart = function(){
	
	flowPromise = Promise();
	filenum = 0;

	if ( flowList.length === 0 ) {
		helper.log('note', 'no file need run task')
		flowPromise.resolve();
	} else {
		flowNext();
	}
	
	return flowPromise;

};

var flowEnd = function(){
	flowPromise.resolve(filenum);
};

var flowNext = function(){

	if ( flowList.length === 0 ) {
		flowEnd();
		return;
	}

	tc = flowList.shift();
	gulp.start(tc.name);

	tc.promise
	.always(function(){
		setTimeout(function(){
			flowNext();
		});
	});

};

module.exports = gulp;
module.exports.tc = tc;
module.exports.flow = flow;
module.exports.flowStart = flowStart;
module.exports.dev = dev;
