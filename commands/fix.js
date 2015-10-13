// command - cache - V1
'use strict';

// fix widget & rely tree
var helper = require('../lib/helper'),
	Promise,
	widget,
	_,
	tree,
	cache;

var initer = helper.init(function(){
	Promise = require('bakari-promise');
	widget = require('./widget');
	_ = require('underscore');
	tree = require('../lib/tree');
	cache = require('../lib/cache');
});


var fix = function( method, type ){
	
	initer();

	hook.beforeCommand();

	// fix widget
	var widgetlist = cache.get('widgetlist'),
		fixlist = [],
		fixWidget = function(){
			
			if ( fixlist.length > 0 ) {
				var wg = fixlist.shift();
				widget.setVersion( wg.version );
				widget.setForcedDownload( true );
				widget.add( wg.name )
				.always(function(){
					fixWidget();
				});
			} else {
				// build tree
				tree.build();
				helper.log('done', 'project fixed');
				hook.afterCommand();
			}

		};

	_.each( widgetlist, function(wv){
		_.each( wv, function(v){
			fixlist.push({
				name : v.name,
				version : v.version
			});
		});
	});

	fixWidget();
	
};

// ========================================
// Tool Function
// ========================================
fix.fn = {};

module.exports = fix;

// info
module.exports._info = {
	name : 'fix',
	flags : [
		'fix [-t]'
	],
	method : {},
	args : {},
	longDesc : '对项目的配置及文件进行修复，当你无法正常使用命令的时候可以运行修复',
	shortDesc : 'fix project file and config',
	options : ['-t']
};