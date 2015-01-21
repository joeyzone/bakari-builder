// cache
'use strict';

var log = require('./log'),
	Promise = require('bakari-promise'),
	// get = require('get'),
	request = require('request'),
	_ = require('underscore');

var cache = {

	// get cache
	get : function( store, key, sync ){

		sync = (sync === undefined) ? true : sync ;

		var promise,
			self = this;

		if ( !sync ) {
			promise = Promise();
		}

		// check store exists
		if ( self[store] === undefined ) {
			log('error', store + ' not found');
			if ( promise ) {
				promise.reject();
			}
			return promise;
		}

		if ( sync ) {

			if ( key ) {

				// if cache not found, get value
				if ( self[store][key] === undefined ) {
					self[store][key] = cache._get[store]( key );
				}

				return self[store][key];

			} else {

				// if not key
				if ( _.isEmpty(self[store]) ) {
					self[store] = cache._get[store]();
				}

				return self[store];

			}

		} else {

			if ( key ) {

				// if cache not found, get value
				if ( self[store][key] === undefined ) {
					cache._get[store]( key )
					.done(function( val ){
						self[store][key] = val;
						promise.resolve( val );
					})
					.fail(function(){
						promise.reject();
					});
				} else {
					promise.resolve( self[store][key] );
				}

			} else {

				// if not key
				if ( _.isEmpty(self[store]) ) {
					cache._get[store]()
					.done(function( val ){
						self[store] = val;
						promise.resolve( val );
					})
					.fail(function(){
						promise.reject();
					});
				} else {
					promise.resolve( self[store] );
				}

			}

			return promise;

		}
		
	},

	clean : function( store, key ){
		
		if ( key === undefined ) {
			this[store] = {};
		} else if ( this[store] ) {
			delete this[store][key];
		}

	},

	_get : {

		/*
			{
				json3 : { '3.3.0' : {...}, '3.3.2' : {...} }
			}
		*/
		liblist : function(){

			var list = {};

			recurse( P.root+B.builderPath+B.jsCfg.lib, function(abspath, rootdir, subdir, filename){
				
				if ( list[subdir] === undefined ) {
					list[subdir] = {};
				}

				list[subdir][filename.replace(/\.json$/,'')] = readJSON( abspath );

			});

			return list;

		},

		/*
			{
				'json3@3.3.0' : {...},
				'json3@3.3.2' : {...}
			}
		*/
		lib : function( key ){

			// if not input key, just return undefined
			if ( key === undefined ) {
				return;
			}
			
			var name = key.split('@')[0],
				version = key.split('@')[1],
				configSrc = P.root+B.builderPath+B.jsCfg.lib+'/'+name+'/'+version+'.json',
				info;

			if ( exists(configSrc) ) {
				info = readJSON( configSrc );
			}

			// TODO get rely child

			return info;

		},

		sourceWidgetlist : function(){
			
			var promise = Promise();

			request({
				url : P.widget.source+P.widget.list,
				json : true
			}, function(err, response, body){

				if ( err ) {
					log( 'error', err );
					promise.reject();
				} else {

					var data = body,
						types = [],
						results = {};

					// get types
					_.each( data, function(v,k){

						types.push(v.type);

						if ( results[v.type] === undefined ) {
							results[v.type] = {};
						}

						results[v.type][k] = v;

					});

					results.types = _.uniq(types);
					results.all = data;

					promise.resolve( results );
					
				}

			});

			return promise;

		},

		sourceWidget : function( key ){
			
			var promise = Promise(),
				name = key.split('@')[0],
				version = key.split('@')[1],
				url = (P.widget.source+P.widget.info)
						.replace(/\{name\}/g, name.toLowerCase())
						.replace(/\{version\}/g, version.toLowerCase());

			request({
				url : url,
				json : true
			}, function(err, response, body){

				if ( err ) {
					log( 'error', err );
					promise.reject();
				} else if ( response.statusCode === 404 ) {
					log( 'error', 'not found '+key );
					promise.reject();
				} else {

					promise.resolve( body );
					
				}

			});

			return promise;

		},

		/*
			{
				'class' : { '0.0.1' : {...}, '0.0.2' : {...} }
			}
		*/
		widgetlist : function(){

			var promise = Promise(),
				list = {};

			recurse( P.root+B.builderPath+B.jsCfg.widget, function(abspath, rootdir, subdir, filename){
				
				if ( list[subdir] === undefined ) {
					list[subdir] = {};
				}

				list[subdir][filename.replace(/\.json$/,'')] = readJSON( abspath );

			});

			return list;

		},

		widget : function( key ){
			
			// if not input key, just return undefined
			if ( key === undefined ) {
				return;
			}
			
			var name = key.split('@')[0],
				version = key.split('@')[1],
				configSrc = P.root+B.builderPath+B.jsCfg.widget+'/'+name+'/'+version+'.json',
				info;

			if ( exists(configSrc) ) {
				info = readJSON( configSrc );
			}

			// TODO get rely child

			return info;

		},

		/*
			{
				js : { blog : {...}, commit : {...} },
				css : { blog : {...}, commit : {...} }
			}
		*/
		commonlist : function(){
			
			var list = {
				js : {},
				css : {}
			};

			// get js
			recurse( P.root+B.builderPath+B.jsCfg.jsCommon, function(abspath, rootdir, subdir, filename){
				list.js[filename.replace(/\.json$/,'')] = readJSON( abspath );
			});

			// get css
			recurse( P.root+B.builderPath+B.jsCfg.cssCommon, function(abspath, rootdir, subdir, filename){
				list.css[filename.replace(/\.json$/,'')] = readJSON( abspath );
			});

			return list;

		},

		/*
			{
				js : { blog_add : {...}, commit_get : {...} },
				css : { blog_add : {...}, commit_get : {...} }
			}
		*/
		bizlist : function(){
			
			var list = {
				js : {},
				css : {}
			}, data;

			// get js
			recurse( P.root+B.builderPath+B.jsCfg.jsBiz, function(abspath, rootdir, subdir, filename){
				data = readJSON( abspath );
				list.js[data.name] = data;
			});

			// get css
			recurse( P.root+B.builderPath+B.jsCfg.cssBiz, function(abspath, rootdir, subdir, filename){
				data = readJSON( abspath );
				list.css[data.name] = data;
			});

			return list;

		},

		/*
			{
				lib : ['json3-3.3.2', 'json3-3.3.0'],
				widget : ['json3-3.3.2', 'json3-3.3.0']
			}
		*/
		cache : function( key ){
			
			// if not input key, just return undefined
			if ( key === undefined ) {
				return;
			}
			
			var cacheSrc = P.root+B.builderPath+B.cache[key],
				cachelist = [];

			if ( exists(cacheSrc) ) {
				recurse( cacheSrc, function(abspath, rootdir, subdir, filename){
					cachelist.push(subdir.split('/')[0]);
				});
				cachelist = _.uniq(cachelist);
			} else {
				return;
			}

			return cachelist;

		},

		/*
			{ '/scripts/src/widget/aspect-0.0.1/src/aspect.js': 'aspect@0.0.1',
     		  '/scripts/src/widget/attribute-0.0.1/src/attribute.js': 'attribute@0.0.1' }
		*/
		pathMap : function(){
			
			var pathMap = {};

			// biz
			var bizlist = cache.get('bizlist');

			_.each( bizlist, function(bv,bk){
				_.each( bv, function(v,k){
					pathMap[P.path+B.src.biz+'/'+bk+'/'+k+'.'+bk] = {
						type : 'biz',
						id : bk+'@'+k
					};
				});
			});

			// common
			var commonlist = cache.get('commonlist');

			_.each( commonlist, function(cv,ck){
				_.each( cv, function(v,k){
					pathMap[P.path+B.src.common+'/'+ck+'/'+k+'.'+ck] = {
						type : 'common',
						id : ck+'@'+k
					};
				});
			});

			// widget
			var widgetlist = cache.get('widgetlist');

			_.each( widgetlist, function(wv,wk){
				_.each( wv, function(v,k){
					_.each( [].concat(v.main), function( mv ){
						pathMap[P.path+B.src.widget+'/'+v.name+'-'+v.version+'/'+mv] = {
							type : 'widget',
							id : v.name+'@'+v.version
						};
					});
				});
			});

			// lib
			var liblist = cache.get('liblist');

			_.each( liblist, function(wv,wk){
				_.each( wv, function(v,k){
					_.each( [].concat(v.main), function( mv ){
						pathMap[P.path+B.src.widget+'/'+v.name+'-'+v.version+'/'+mv] = {
							type : 'lib',
							id : v.name+'@'+v.version
						};
					});
				});
			});

			return pathMap;

		}

	},

	liblist : {},

	bizlist : {},

	lib : {},

	cache : {},

	commonlist : {},

	sourceWidgetlist : {},

	sourceWidget : {},

	widgetlist : {},

	widget : {},

	pathMap : {}

};

module.exports = cache;