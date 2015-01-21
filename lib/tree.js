// lib - tree - V3.1
'use strict';

var log = require('./log'),
	archy = require('archy'),
	colors = require('ansi-256-colors'),
	extend = require('extend'),
	cache = require('../lib/cache'),
	helper = require('../lib/helper'),
	versionManager = require('./version'),
	toposort = require('toposort-class'),
	_ = require('underscore');

var ROOT = {
		lib : {},
		widget : {},
		common : {},
		biz : {}
	},
	defualtNode = {
		key : null,
		type : null,
		child : {},
		parent : {},
		data : {}
	}, cached = false;

var tree = {

	// build all tree
	build : function(){

		// clean ROOT
		ROOT = {
			lib : {},
			widget : {},
			common : {},
			biz : {}
		};
		tree.fn.buildLib();
		tree.fn.buildWidget();
		tree.fn.buildCommon();
		tree.fn.buildBiz();
		tree.fn.save();

	},

	get : function(){

		if ( cached ) {
			return this;			
		}

		var root = readJSON( P.root+B.treeData );

		_.each( root, function( tv ){
			_.each( tv, function( lv ){
				_.each( lv, function(v, k){
					if ( k === 'child' || k === 'parent' ) {
						lv[k] = {};
						_.each( v, function( sv ){
							var type = sv.split(':')[0];
							lv[k][sv] = root[type][sv];
						});
					}
				});
			});
		});

		ROOT = root;
		cached = true;
		return this;

	},

	showParent : function( key ){

		var str, nodes, type = key.split(':')[0],
			node = ROOT[type][key];

		var findParent = function( obj ){
				
			var n = [];
			_.each( obj, function( v ){
				if ( !_.isEmpty(v.parent) ) {
					n.push({
						label : v.data.name + '@' + v.data.type + colors.fg.grayscale[7] + ' (' + v.type + ')' + colors.reset,
						nodes : findParent(v.parent)
					});
				} else {
					n.push({label : v.data.name + '@' + v.data.type + colors.fg.grayscale[7] + ' (' + v.type + ')' + colors.reset})
				}
			});
			
			return n;

		};

		// find parent
		nodes = {
			label : node.data.name + '@' + node.data.type,
			nodes : findParent( node.parent )
		};

		if ( nodes.nodes.length === 0 ) {
			nodes.nodes = ['null']
		}

		str = archy(nodes);

		console.log(str);

		return this;

	},

	showChild : function( key ){

		var str, nodes, type = key.split(':')[0],
			node = ROOT[type][key];

		var findChild = function( obj ){
				
			var n = [];
			_.each( obj, function( v ){
				if ( !_.isEmpty(v.child) ) {
					n.push({
						label : v.data.name + '@' + v.data.type + colors.fg.grayscale[7] + ' (' + v.type + ')' + colors.reset,
						nodes : findChild(v.child)
					});
				} else {
					n.push({label : v.data.name + '@' + v.data.type + colors.fg.grayscale[7] + ' (' + v.type + ')' + colors.reset})
				}
			});
			
			return n;

		};

		// find child
		nodes = {
			label : node.data.name + '@' + node.data.type,
			nodes : findChild( node.child )
		};

		if ( nodes.nodes.length === 0 ) {
			nodes.nodes = ['null']
		}

		str = archy(nodes);

		console.log(str);

		return this;

	},

	hasChild : function( key ){
		
		this.get();
		var type = key.split(':')[0],
			node = ROOT[type][key];

		if ( _.isEmpty(node.child) ) {
			return false;
		} else {
			return true;
		}

	},

	root : function(){
		return ROOT;
	},

	buildlist : function( key ){
		
		var result = [],
			list = {
				lib : [],
				wg : [],
				cm : [],
				biz : []	
			},
			type = key.split(':')[0],
			node = ROOT[type][key];

		if ( type !== 'biz' ) {
			return list;
		}

		list.biz.push(key);

		var noSortWg = tree.fn.getParentListByType( key, 'widget' ),
			noSortCm = tree.fn.getParentListByType( key, 'common' ),
			noSortLib = tree.fn.getParentListByType( key, 'lib' );

		// sort widget
		var wgTopo = new toposort();
		_.each( noSortWg, function(v){
			wgTopo.add( v, tree.fn.getParentListByType( v, 'widget' ) );
		});

		// sort common
		var cmTopo = new toposort();
		_.each( noSortCm, function(v){
			cmTopo.add( v, tree.fn.getParentListByType( v, 'common' ) );
		});

		// sort lib
		var libTopo = new toposort();
		_.each( noSortLib, function(v){
			libTopo.add( v, tree.fn.getParentListByType( v, 'lib' ) );
		});

		list.wg = wgTopo.sort().reverse();
		list.cm = cmTopo.sort().reverse();
		list.lib = libTopo.sort().reverse();

		result = result
		.concat(list.lib)
		.concat(list.wg)
		.concat(list.cm)
		.concat(list.biz);

		return result;

	}

};

// ========================================
// Tool Function
// ========================================
tree.fn = {

	save : function(){
		
		// pruning
		_.each( ROOT, function( tv ){
			_.each( tv, function( lv ){
				_.each( lv, function(v, k){
					if ( k === 'child' || k === 'parent' ) {
						lv[k] = _.keys(v);
					}
				});
			});
		});

		// save
		write( P.root+B.treeData, JSON.stringify(ROOT) );

	},

	contact : function( node, map ){

		// if map is empty
		if ( _.isEmpty(map) ) {
			return;
		}
		
		tree.fn['contactFOR'+node.type]( node, map );

	},

	contactFORlib : function( node, map ){

		// widget's parent just lib
		// so branch is 'lib'
		_.each( map, function( submap, branch ){

			
			if ( _.isEmpty(submap) ) {
				return;
			}

			_.each( submap, function( v, k ){

				// v like name@version
				v = v.split('@');
				var key = branch + ':' + v[0] + '@' + v[1];

				// if parent is null, create parent
				if ( ROOT[branch][key] === undefined ) {
					ROOT[branch][key] = {
						child : {}
					};
				}

				// contact parent and child
				ROOT[branch][key].child[node.key] = node;
				node.parent[key] = ROOT[branch][key];

			});

		});

	},

	contactFORwidget : function( node, map ){

		// widget's parent just widget
		// so branch is 'widget'
		_.each( map, function( submap, branch ){

			
			if ( _.isEmpty(submap) ) {
				return;
			}

			_.each( submap, function( v, k ){

				// k like name@version
				k = k.split('@');
				var key = branch + ':' + k[0] + '@' + k[1];

				// if parent is null, create parent
				if ( ROOT[branch][key] === undefined ) {
					ROOT[branch][key] = {
						child : {}
					};
				}

				// contact parent and child
				ROOT[branch][key].child[node.key] = node;
				node.parent[key] = ROOT[branch][key];

			});

		});

	},

	contactFORcommon : function( node, map ){
		
		// common's parent can be lib/widget/common
		_.each( map, function( submap, branch ){

			if ( _.isEmpty(submap) ) {
				return;
			}

			_.each( submap, function( v ){

				var key;

				// if branch is lib
				if ( branch === 'lib' || branch === 'widget' ) {

					// k like name@version
					v = v.split('@');
					key = branch + ':' + v[0] + '@' + v[1];

				}

				// if branch is common
				if ( branch === 'common' ) {
					key = branch + ':' + v + '@' + node.data.type;
				}

				// if parent is null, create parent
				if ( ROOT[branch][key] === undefined ) {
					ROOT[branch][key] = {
						child : {}
					};
				}

				// contact parent and child
				ROOT[branch][key].child[node.key] = node;
				node.parent[key] = ROOT[branch][key];

			});

		});

	},

	contactFORbiz : function( node, map ){
		
		// biz's parent can be lib/widget/common
		_.each( map, function( submap, branch ){

			if ( _.isEmpty(submap) ) {
				return;
			}

			_.each( submap, function( v ){

				var key;

				// if branch is lib
				if ( branch === 'lib' || branch === 'widget' ) {

					// k like name@version
					v = v.split('@');
					key = branch + ':' + v[0] + '@' + v[1];

				}

				// if branch is common
				if ( branch === 'common' ) {
					key = branch + ':' + v + '@' + node.data.type;
				}

				// if parent is null, create parent
				if ( ROOT[branch][key] === undefined ) {
					ROOT[branch][key] = {
						child : {}
					};
				}

				// contact parent and child
				ROOT[branch][key].child[node.key] = node;
				node.parent[key] = ROOT[branch][key];

			});

		});

	},

	createNode : function( type, data ){
		
		var key = type + ':' + data.name + '@' + data.type,
			node = extend( true, {}, defualtNode );

		node.key = key;
		node.type = type;
		node.data = {
			name : data.name,
			type : data.type
		};

		if ( ROOT[type][key] ) {
			node.child = ROOT[type][key].child || {};
			node.parent = ROOT[type][key].parent || {};
		}

		ROOT[type][node.key] = node;

		tree.fn.contact( node, data.map );

	},

	buildLib : function(){
		
		var liblist = cache.get('liblist');


		_.each( liblist, function(lv){
			_.each( lv, function(v){

				var relyLib = [];
				_.each(v.dependencies, function(dv,dk){
					relyLib.push( dk+'@'+versionManager.hasLib( dk, dv ));
				});
		
				tree.fn.createNode('lib', {
					name : v.name,
					type : v.version,
					map : {
						lib : relyLib
					}
				});
			});
		});

	},

	buildWidget : function(){
		
		var widgetlist = cache.get('widgetlist');

		_.each( widgetlist, function(wv){
			_.each( wv, function( v ){
				tree.fn.createNode('widget', {
					name : v.name,
					type : v.version,
					map : {
						widget : v.tree
					}
				});
			});
		});

	},

	buildCommon : function(){
		
		var commonlist = cache.get('commonlist');

		_.each( commonlist, function(tv){
			_.each( tv, function(v){
				tree.fn.createNode('common', {
					name : v.name,
					type : v.type,
					map : {
						lib : v.relyLib,
						widget : v.relyWidget,
						common : v.relyCommon
					}
				});
			});
		});

	},

	buildBiz : function(){

		var bizlist = cache.get('bizlist');

		_.each( bizlist, function(tv){
			_.each( tv, function(v){
				tree.fn.createNode('biz', {
					name : v.name,
					type : v.type,
					map : {
						lib : v.relyLib,
						widget : v.relyWidget,
						common : v.relyCommon
					}
				});
			});
		});

	},


	getParentListByType : function( key, type ){
		
		var list = {},
			node = ROOT[key.split(':')[0]][key];

		var findParnet = function( obj ){
			_.each( obj, function(v){
				if ( !_.isEmpty(v.parent) ) {
					findParnet(v.parent);
				}
				if ( v.type === type || !type ) {
					list[v.key] = v;
				}
			});
		};

		findParnet( node.parent );

		return _.keys( list || {} );

	}

};


module.exports = tree;