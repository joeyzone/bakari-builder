// helper
'use strict';

var colors = require('ansi-256-colors'),
	log = require('./log'),
	archy = require('archy'),
	cache = require('../lib/cache'),
	Configstore = require('configstore'),
	update = require('./update'),
	_ = require('underscore');

var initList = [];
var helper = {

	log : log,

	print : {

			val : function( val ){
				
				if ( _.isArray(val) ) {
					return this.array(val);
				} else if ( _.isObject(val) ) {
					return this.object(val);
				} else {
					return val;
				}

			},

			array : function( list ){

				var str = '';
				_.each(list, function(v){
					str += v + colors.fg.grayscale[9] + ' | ' + colors.reset;
				});

				return str.replace(/(.+)\|/,'$1');
			},

			object : function( obj ){
				
				var str = '';
				_.each(obj, function(v,k){
					str += '\n\t' + k + ' : ' + v
				});

				return str;

			}

	},

	firstToUpperCase : function( string ){
		return string.slice(0,1).toUpperCase() + string.slice(1,string.length);
	},

	loglist : function( list ){
		
		_.each( list, function(v,k){
			console.log( k + ' : ' + helper.print.val(v) );
		});

	},

	// catch null command
	catchNullCommand : function(){
		
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

		return nullCommand;

	},

	relyCheckCommon : function( rely, type, name ){

		// check common
		var commonlist = cache.get('commonlist'),
			nodes = [];

		_.each( commonlist.js, function(v){
			_.find( v['rely'+helper.firstToUpperCase(type)], function(rv){
				if ( rv === name ) {
					rely.hasRely = true;
					rely.child.common.js.push(v.name);
					return true;
				}
			});
		});

		if ( _.size(rely.child.common.js) ) {
			nodes.push({
				label : 'js',
				nodes : rely.child.common.js
			});
		}

		_.each( commonlist.css, function(v){
			_.find( v['rely'+helper.firstToUpperCase(type)], function(rv){
				if ( rv === name ) {
					rely.hasRely = true;
					rely.child.common.css.push(v.name);
					return true;
				}
			});
		});

		if ( _.size(rely.child.common.css) ) {
			nodes.push({
				label : 'css',
				nodes : rely.child.common.css
			});
		}

		if ( nodes.length ) {
			rely.childStr += archy({
				label : 'common',
				nodes : nodes
			});
		} else {
			rely.childStr += archy({
				label : 'common',
				nodes : ['no child']
			});
		}

	},

	relyCheckBiz : function( rely, type, name ){

		// check biz
		var bizlist = cache.get('bizlist'),
			nodes = [];

		_.each( bizlist.js, function(v){
			_.find( v['rely'+helper.firstToUpperCase(type)], function(rv){
				if ( rv === name ) {
					rely.hasRely = true;
					rely.child.biz.js.push(v.name);
					return true;
				}
			});
		});

		if ( _.size(rely.child.biz.js) ) {
			nodes.push({
				label : 'js',
				nodes : rely.child.biz.js
			});
		}

		_.each( bizlist.css, function(v){
			_.find( v['rely'+helper.firstToUpperCase(type)], function(rv){
				if ( rv === name ) {
					rely.hasRely = true;
					rely.child.biz.css.push(v.name);
					return true;
				}
			});
		});

		if ( _.size(rely.child.biz.css) ) {
			nodes.push({
				label : 'css',
				nodes : rely.child.biz.css
			});
		}

		if ( nodes.length ) {
			rely.childStr += archy({
				label : 'biz',
				nodes : nodes
			});
		} else {
			rely.childStr += archy({
				label : 'biz',
				nodes : ['no child']
			});
		}

	},

	relyCheckWidget : function( rely, type, name ){
		
		// check common
		var widgetlist = cache.get('widgetlist');

		var findRely = function( obj, list ){
			_.each( obj, function(v,k){

				list.push(k);
				if ( !_.isEmpty(v) ) {
					list.push(k);
					list = findRely( v, list );
				}

			});
			return list;
		};

		_.each( widgetlist, function(v){
			_.each( v, function(rv, rk){
				var relylist = findRely( rv.tree, [] );
				relylist = _.uniq(relylist);
				_.each( relylist, function(rlv){
					if ( rlv === name ) {
						rely.hasRely = true;
						rely.child.widget.push(rv.name+'@'+rv.version);
					}
				});
			});
		});

		if ( rely.child.widget.length ) {
			rely.childStr += archy({
				label : 'widget',
				nodes : rely.child.widget
			});
		} else {
			rely.childStr += archy({
				label : 'widget',
				nodes : ['no child']
			});
		}

	},

	// check rely child
	relyCheck : function( type, name ){

		var rely = {
			hasRely : false,
			child : {},
			childStr : ''
		};
		
		if ( type === 'common' ) {

			// need check common/biz
			rely.child.common = {
				js : [],
				css : []
			};
			rely.child.biz = {
				js : [],
				css : []
			};

			helper.relyCheckCommon( rely, type, name );
			helper.relyCheckBiz( rely, type, name );

		} else if ( type === 'lib' ) {

			// need check common/biz
			rely.child.widget = [];
			rely.child.common = {
				js : [],
				css : []
			};
			rely.child.biz = {
				js : [],
				css : []
			};

			helper.relyCheckCommon( rely, type, name );
			helper.relyCheckBiz( rely, type, name );

		} else if ( type === 'widget' ) {

			// need check widget
			rely.child.widget = [];
			rely.child.common = {
				js : [],
				css : []
			};
			rely.child.biz = {
				js : [],
				css : []
			};

			helper.relyCheckWidget( rely, type, name );
			helper.relyCheckCommon( rely, type, name );
			helper.relyCheckBiz( rely, type, name );

		}

		return rely;

	},

	// get liblist array like name@version
	getLibArray : function( type ){
		
		var liblist = [];

		// can use libs
		_.each( cache.get('liblist'), function(lv){
			_.each( lv, function(v){
				if ( v.type.search(type) !== -1 ) {
					liblist.push( v.name + '@' + v.version );
				}
			});
		});

		return liblist

	},

	// render file
	renderFile : function( type, data, code ){
		
		code = code || '\n\t// code... \n';

		// get template
		var tpl = '',
			tplSrc = P.root + B.tpl[data.type+'Common'],
			rely = [],
			alias = [];

		if ( exists( tplSrc ) ){
			tpl = read( tplSrc );
		}

		_.each( data.relyWidget, function(v){
			rely.push( 'widget/'+v.replace('@','-') );
			alias.push( 'w_'+v.split('@')[0] );
		});

		_.each( data.relyCommon, function(v){
			rely.push( 'common/'+v );
			alias.push( 'c_'+v );
		});

		tpl = tpl.replace(/\{\@name\}/g, '\''+type+'\/'+ data.name +'\'');
		tpl = tpl.replace(/\{\@rely\}/g, '[\''+rely.join('\',\n \'')+'\']' );
		if ( alias.length > 0 ) {
			tpl = tpl.replace(/\{\@alias\}/g, '\n\t' + alias.join(',\n\t') + '\n' );
		} else {
			tpl = tpl.replace(/\{\@alias\}/g, '');
		}
		tpl = tpl.replace(/\{\@code\}/g, code );

		return tpl;

	},

	// like : 'json3@3.1.0' -> { name : 'json', version : '3.1.0', dir : 'json-3.1.0' }
	idToDetail : function( id ){
		
		var id = split('@');

		return {
			name : id[0],
			version : id[1],
			dir : id[0] + '-' + id[1]
		};

	},

	init : function(callback){
		
		var inited = false;

		var init = function(){
			if ( !inited ) { callback(); inited = true; }
		};

		return init;

	},

	// check version & update script
	checkUpdate : function(){
		
		var nowVersion = '0.0.0';
		// init config
		var conf = new Configstore('bakari-builder-config'),
			localVersion = conf.get('version');

		if ( localVersion ) {
			nowVersion = localVersion;
		}


		// run update script
		update( nowVersion )
		.done(function(){
			log('success', 'bakari config update success');
			conf.set('version', global.v);
		});

	}

};

module.exports = helper;