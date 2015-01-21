// lib - rely
'use strict';

var log = require('./log'),
	// archy = require('archy'),
	extend = require('extend'),
	cache = require('../lib/cache'),
	helper = require('../lib/helper'),
	_ = require('underscore');

var relyCache = {
		lib : {},
		widget : {},
		common : {},
		biz : {}
	}, t, n,
	commonMap, commonMapReverse,
	bizCommonMap,
	widgetMap, widgetMapReverse;

var rely = function( type, name ){

	// check name & type
	// if ( typeof type !== 'string' ||
	// 	 typeof name !== 'string' ) {
	// 	helper.log('error', 'you must input name and type');
	// 	return;
	// }

	t = type;
	n = name;

	return rely.fn;

};


// ========================================
// Tool Function
// ========================================
rely.fn = {};
rely.fn.child = function(){
	
	if ( relyCache[t][n] === undefined ) {
		relyCache[t][n] = {};
	}

	// if child is null get child
	if ( !relyCache[t][n].child ) {
		relyCache[t][n].child = rely.fn.child[t]();
	}

	return relyCache[t][n].child;

};

rely.fn.parent = function(){
	
	if ( relyCache[t][n] === undefined ) {
		relyCache[t][n] = {};
	}

	// if child is null get child
	if ( !relyCache[t][n].parent ) {
		relyCache[t][n].parent = rely.fn.parent[t]();
	}

	return relyCache[t][n].parent;

};

// use name get lib all child
rely.fn.child.lib = function(){
	
	// lib child : common/biz
	var commonlist = cache.get('commonlist'),
		bizlist = cache.get('bizlist'),
		root = {},
		has = false;

	root.common = { js : {}, css : {} };
	root.biz = { js : {}, css : {} };

	// get common
	_.each(commonlist, function( clist , ctype ){
		_.each(clist, function( cv ){
			_.each(cv.relyLib, function(rv){
				if ( rv === n ) {
					root.common[ctype][cv.name] = rely.fn.bizCommonMap()[ctype][cv.name];
					root.common[ctype][cv.name]._define = true;
					has = true;
				}
			});
		});
	});

	// get biz
	_.each(bizlist, function( blist , btype ){
		_.each(blist, function( bv ){
			_.each(bv.relyLib, function(rv){
				if ( rv === n ) {
					root.biz[btype][bv.name] = {};
					root.biz[btype][bv.name]._define = true;
					has = true;
				}
			});
		});
	});
	
	return {
		tree : root,
		has : has
	};

};

// use name get widget all child
rely.fn.child.widget = function(){

	// widget child : common/biz/widget
	var commonlist = cache.get('commonlist'),
		bizlist = cache.get('bizlist'),
		root = {},
		has = false;

	root.common = { js : {}, css : {} };
	root.biz = { js : {}, css : {} };
	root.widget = rely.fn.widgetMap()[n];

	if ( !_.isEmpty(root.widget) ) {
		has = true
	}

	// get common
	_.each(commonlist, function( clist , ctype ){
		_.each(clist, function( cv ){
			_.each(cv.relyWidget, function(rv){
				if ( rv === n ) {
					root.common[ctype][cv.name] = rely.fn.bizCommonMap()[ctype][cv.name];
					root.common[ctype][cv.name]._define = true;
					has = true;
				}
			});
		});
	});

	// get biz
	_.each(bizlist, function( blist , btype ){
		_.each(blist, function( bv ){
			_.each(bv.relyWidget, function(rv){
				if ( rv === n ) {
					root.biz[btype][bv.name] = {};
					root.biz[btype][bv.name]._define = true;
					has = true;
				}
			});
		});
	});

	return {
		tree : root,
		has : has
	};

};

// use name get common all child
rely.fn.child.common = function(){
	
	// common child : common/biz
	var commonlist = cache.get('commonlist'),
		bizlist = cache.get('bizlist'),
		root = {},
		cmName = n.split('@')[1],
		cmType = n.split('@')[0],
		has = false;

	root.common = { js : {}, css : {} };
	root.biz = { js : {}, css : {} };

	// get common
	_.each(commonlist[cmType], function( cv ){
		_.each(cv.relyCommon, function(rv){
			if ( rv === cmName ) {
				root.common[cmType][cv.name] = rely.fn.bizCommonMap()[cmType][cv.name];
				root.common[cmType][cv.name]._define = true;
				has = true;
			}
		});
	});

	// get biz
	_.each(bizlist[cmType], function( bv ){
		_.each(bv.relyCommon, function(rv){
			if ( rv === cmName ) {
				root.biz[cmType][bv.name] = {};
				root.biz[cmType][bv.name]._define = true;
				has = true;
			}
		});
	});
	
	return {
		tree : root,
		has : has
	};

};

// use name get widget parent
rely.fn.parent.widget = function(){
	
	// widget parent : ==widget
	var root = {};

	root.widget = rely.fn.widgetMap(true)[n];

	return {
		tree : root
	};

};

// use name get common all parent
rely.fn.parent.common = function(){
	
	// common child : common(just follow parent common) | widget/lib
	var commonlist = cache.get('commonlist'),
		liblist = cache.get('liblist'),
		root = {},
		cmName = n.split('@')[1],
		cmType = n.split('@')[0];

	root.common = { js : {}, css : {} };

	// get common
	_.each( commonlist[cmType][cmName].relyCommon, function( rv ){
		root.common[cmType] = rely.fn.commonMap(true)[cmType][cmName];
	});
	
	return {
		tree : root
	};

};

// get widget map
rely.fn.widgetMap = function( reverse ){

	if ( widgetMapReverse && reverse ) {
		return widgetMapReverse;
	}

	if ( widgetMap && !reverse ){
		return widgetMap;
	}

	var widgetlist = cache.get('widgetlist'),
		map = {};

	_.each( widgetlist, function( wlist ){
		
		_.each( wlist, function( wv ){

			var key = wv.name+'@'+wv.version;

			if ( !map[key] ) {
				map[key] = {};
			}

			_.each( _.keys(wv.tree), function(v){

				if ( !map[v] ) {
					map[v] = {};
				}

				if ( reverse ) {
					map[key][v] = map[v];
				} else {
					map[v][key] = map[key];
				}
				
				
			});

		});

	});

	if ( reverse ) {
		widgetMapReverse = map;
	} else {
		widgetMap = map;
	}
	return map;

};

// get common map
rely.fn.commonMap = function( reverse ){

	if ( commonMapReverse && reverse ) {
		return commonMapReverse;
	}

	if ( commonMap && !reverse ) {
		return commonMap;
	}
	
	var commonlist = cache.get('commonlist'),
		map = {
			js : {},
			css : {}
		};

	_.each( commonlist, function( clist, ctype ){
		
		_.each(clist, function(cv,ck){

			if ( !map[ctype][ck] ) {
				map[ctype][ck] = {};
			}

			_.each( cv.relyCommon, function(v){

				if ( !map[ctype][v] ) {
					map[ctype][v] = {};
				}

				if ( reverse ) {
					map[ctype][ck][v] = map[ctype][v];
				} else {
					map[ctype][v][ck] = map[ctype][ck];
				}

			});

		});

	});

	if ( reverse ) {
		commonMapReverse = map;
	} else {
		commonMap = map;
	}

	return map;

};

// get biz <-> common map
rely.fn.bizCommonMap = function(){
	
	if ( bizCommonMap ) {
		return bizCommonMap;
	}
	
	var bizlist = cache.get('bizlist'),
		commonMap = rely.fn.commonMap(),
		oriMap = {};

	_.each( bizlist, function( blist, btype ){
		_.each(blist, function(bv){
			_.each( bv.relyCommon, function(v){
				if ( !oriMap[btype+'/'+v] ) {
					oriMap[btype+'/'+v] = [];
				}
				oriMap[btype+'/'+v].push(bv.name);
			});
		});
	});

	_.each( oriMap, function(v,k){

		k = k.split('/');
		var type = k[0],
			name = k[1];

		commonMap[type][name]._biz = v;

	});

	bizCommonMap = commonMap;
	return commonMap;

};

module.exports = rely;