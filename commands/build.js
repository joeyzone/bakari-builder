// command - build
'use strict';

var helper = require('../lib/helper'),
	Promise,
	task,
	extend,
	_,
	toposort,
	tree,
	cache;

var initer = helper.init(function(){
	Promise = require('bakari-promise');
	task = require('../lib/tasks');
	extend = require('extend');
	_ = require('underscore');
	toposort = require('toposort-class');
	tree = require('../lib/tree');
	cache = require('../lib/cache');
});

var build = function( pageid ){

	initer();

	hook.beforeCommand();

	var type = false,
		bizlist = cache.get('bizlist'),
		all = [];

	// get type
	if ( arguments[1].parent.js ) {
		type = 'js';
	} else if ( arguments[1].parent.css ) {
		type = 'css';
	}
	
	if ( pageid ) {
		all.push(type + '@' + pageid);
	} else {

		// build all
		if ( type === 'js' || type === false ) {
			_.each( _.keys(bizlist.js), function(v,k){
				all.push('js@'+v);
			});
		}
		
		if ( type === 'css' || type === false ) {
			_.each( _.keys(bizlist.css), function(v,k){
				all.push('css@'+v);
			});
		}

	}

	build.fn.list(all)
	.always(function(){
		hook.afterCommand();
	});
	
};

// ========================================
// Tool Function
// ========================================
build.fn = {};

build.fn.oriToUrls = function( oriSrc, src ){
	
	// to urls
	_.each( oriSrc, function(v){

		var type = v.split(':')[0],
			name = v.split(':')[1].split('@')[0],
			stype = v.split('@')[1];

		if ( type === 'lib' ) {
			var lib = cache.get('lib', name+'@'+stype);
			_.each( [].concat(lib.main), function(v){
				if ( v.search(/(\.js|\.css)$/) !== -1 ) {
					src.lib.push( P.root + P.path + B.src.lib + '/' + lib.dir + '/' + v );
				}
			});
		} else if ( type === 'widget' ) {

			var widget = cache.get('widgetlist')[name][stype],
				tlist = [];

			_.each( [].concat( widget.main ), function(v){
				if ( v.search(/\.js$/g) !== -1 ) {
					tlist.push('js');
				} else if ( v.search(/\.css$/g) !== -1 ) {
					tlist.push('css');
				}
			});

			_.each( tlist, function(v){
				src.wg.push( P.root + P.path + B.src.widget + '/' + widget.name+'-'+widget.version + '/' + 'index.' + v );
			});

		} else if ( type === 'common' ) {
			src.cm.push( P.root + P.path + B.src.common + '/' + stype + '/' + name + '.' + stype );
		} else if ( type === 'biz' ) {
			src.biz.push( P.root + P.path + B.src.biz + '/' + stype + '/' + name + '.' + stype )
		}

	});

};

build.fn.oneJs = function( pageid, src ){

	initer();
	
	// get bizlist
	var bizlist = cache.get('bizlist'),
		page = {};

	// check biz exists
	if ( !(bizlist && bizlist.js && bizlist.js[pageid]) ){
		helper.log('warning', 'not found page id '+pageid+'(js)');
		return;
	} else {
		page = bizlist.js[pageid];
	}

	var oriSrc = tree.get().buildlist('biz:'+page.name+'@'+page.type);

	build.fn.oriToUrls( oriSrc, src );

};

build.fn.oneCss = function( pageid, src ){

	initer();

	// get bizlist
	var bizlist = cache.get('bizlist'),
		page = {};

	// check biz exists
	if ( !(bizlist && bizlist.css && bizlist.css[pageid]) ){
		helper.log('warning', 'not found page id '+pageid+'(css)');
		return;
	} else {
		page = bizlist.css[pageid];
	}

	var oriSrc = tree.get().buildlist('biz:'+page.name+'@'+page.type);

	build.fn.oriToUrls( oriSrc, src );

};

build.fn.one = function( pageid, type ){

	initer();

	var promise = Promise(),
		filename = pageid.replace(/\//g, '_'),
		devPath = P.root + P.path + B.dir.dev,
		proPath = P.root + P.path + B.dir.pro;

	// find src
	var src = {
		biz : [],
		wg : [],
		lib : [],
		cm : []
	},
	allSrc = {
		biz : [],
		wg : [],
		lib : [],
		cm : []
	};

	if ( type === 'false' || type === 'js' ) {
		build.fn.oneJs( pageid, src );
	}

	if ( type === 'false' || type === 'css' ) {
		build.fn.oneCss( pageid, src );
	}

	build.fn.oneJs( pageid, allSrc );
	build.fn.oneCss( pageid, allSrc );

	// uniq
	_.each( src, function(v,k){
		// ealry load
		src[k] = _.uniq(v.reverse()).reverse();
	});
	
	src.cm.reverse();

	// 拆分js/css
	var blist = {};
	_.each( src, function(sv,sk){
		blist[sk] = { js : [], css : [] };
		_.each( sv, function( v, k ){
			if ( v.search(/\.js$/g) !== -1 ) {
				blist[sk].js.push(v);
			} else if ( v.search(/\.css$/g) !== -1 ) {
				blist[sk].css.push(v);
			}
		});
	});

	// 拆分对照组的js/css
	var clist = {};
	_.each( allSrc, function(sv,sk){
		clist[sk] = { js : [], css : [] };
		_.each( sv, function( v, k ){
			if ( v.search(/\.js$/g) !== -1 ) {
				clist[sk].js.push(v);
			} else if ( v.search(/\.css$/g) !== -1 ) {
				clist[sk].css.push(v);
			}
		});
	});

	// set lib.js task config
	var buildTask,
		buildJsList = blist.cm.js.concat(blist.biz.js),
		buildCssList = blist.cm.css.concat(blist.biz.css),
		buildJsLibList = blist.lib.js.concat(blist.wg.js),
		buildCssLibList = blist.lib.css.concat(blist.wg.css),
		collateJsLibList = clist.lib.js.concat(clist.wg.js),
		collateCssLibList = clist.lib.css.concat(clist.wg.css);


	if ( buildJsLibList.length > 0 ) {
		buildTask = task.flow('buildjs', {
			src : buildJsLibList,
			devDest :devPath ,
			proDest : proPath,
			jshint : false,
			file : filename+'.lib.js',
			pageid : pageid
		});
	} else if ( collateJsLibList.length === 0 ) {
		// del old files
		helper.log('clean', filename + '.lib.js' );
		if ( exists( devPath + '/' + filename + '.lib.js' ) ) { del(devPath + '/' + filename + '.lib.js' )  }
		if ( exists( proPath + '/' + filename + '.lib.js' ) ) { del(proPath + '/' + filename + '.lib.js' )  }
		build.fn.removeVersion( 'js', pageid+'.lib' );
	}

	if ( buildCssLibList.length > 0 ) {
		buildTask = task.flow('buildcss', {
			src : buildCssLibList,
			devDest :devPath ,
			proDest : proPath,
			file : filename+'.lib.css',
			pageid : pageid
		});
	} else if ( collateCssLibList.length === 0 ) {
		helper.log('clean', filename + '.lib.css' );
		if ( exists( devPath + '/' + filename + '.lib.css' ) ) { del(devPath + '/' + filename + '.lib.css' )  }
		if ( exists( proPath + '/' + filename + '.lib.css' ) ) { del(proPath + '/' + filename + '.lib.css' )  }
		build.fn.removeVersion( 'css', pageid+'.lib' );
	}
	
	if ( buildJsList.length > 0 ) {
		buildTask = task.flow('buildjs', {
			src : buildJsList,
			devDest :devPath ,
			proDest : proPath,
			jshint : true,
			file : filename+'.js',
			pageid : pageid
		});
	} else if ( type === 'js' || type === 'false' ) {
		helper.log('clean', filename + '.js' );
		if ( exists( devPath + '/' + filename + '.js' ) ) { del(devPath + '/' + filename + '.js' )  }
		if ( exists( proPath + '/' + filename + '.js' ) ) { del(proPath + '/' + filename + '.js' )  }
		build.fn.removeVersion( 'js', pageid );
	}

	if ( buildCssList.length > 0 ) {
		buildTask = task.flow('buildcss', {
			src : buildCssList,
			devDest :devPath ,
			proDest : proPath,
			file : filename+'.css',
			pageid : pageid
		});
	} else if ( type === 'css' || type === 'false' ) {
		helper.log('clean', filename + '.css' );
		if ( exists( devPath + '/' + filename + '.css' ) ) { del(devPath + '/' + filename + '.css' )  }
		if ( exists( proPath + '/' + filename + '.css' ) ) { del(proPath + '/' + filename + '.css' )  }
		build.fn.removeVersion( 'css', pageid );
	}
	
	if ( buildTask ) {
		buildTask
		.flowStart()
		.done(function(filenum){
			promise.resolve(filenum);
		});
	} else {
		promise.reject();
	}

	return promise;

};

build.fn.list = function( list ){

	initer();

	var promise = Promise(),
		len = 0,
		stime = _.now();

	var builder = function( filenum ){
		len += filenum || 0;
		if ( list.length > 0 ) {

			// id[0] is type, id[1] is pageid
			// like : js@admin/item/add
			var id = list.shift();
			id = id.split('@');

			build.fn.one( id[1], id[0] ).always(builder);
			
		} else {
			promise.resolve();
		}
	};

	// check & merge list
	var addList = [],
		hasList = [];
	
	_.each( list, function( v ){
		var oriName = v.split('@')[1];
		if ( hasList.indexOf(oriName) !== -1 ) {
			addList.push('false@'+oriName);
		} else {
			hasList.push(oriName);
		}
	});

	list = _.filter( list, function(v){
		var oriName = v.split('@')[1];
		if ( addList.indexOf('false@'+oriName) !== -1 ) {
			return false;
		} else { 
			return true;
		}
	});

	list = list.concat(addList);

	builder();

	promise.done(function(){
		if ( len > 0 ) {
			helper.log('build success', 'build ' + len + ' files in ' + (_.now() - stime) + 'ms');
		} else {
			helper.log('no file need build');
		}
	});

	return promise;

};

build.fn.removeVersion = function( vtype, key ){

	initer();
	
	var versionSrc = P.root + P.path + B.file[vtype+'Version'],
		version;

	if ( exists( versionSrc ) ) {

		version = readJSON( versionSrc );

		delete version[key];

		// save version
		write( versionSrc, JSON.stringify(version) );

	}

};

// ========================================
// Sub Command
// ========================================


module.exports = build;

// info
module.exports._info = {
	name : 'build',
	flags : [
		'build [<pageid>]',
		'build [<pageid>] [-c|-j] [-t]'
	],
	method : {},
	args : {
		'pageid' : 'Need build page id'
	},
	longDesc : '对项目的业务代码进行编译。\n\t可以通过`-j`或`-c`选项来指定操作JavaScript或CSS，默认会编译JavaScript及CSS。',
	shortDesc : 'build code for project',
	options : ['-c', '-j', '-t']
};