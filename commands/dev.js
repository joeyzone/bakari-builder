// command - dev
'use strict';

var helper = require('../lib/helper'),
	Promise,
	task,
	build,
	_,
	cache;
	
var initer = helper.init(function(){
	Promise = require('bakari-promise');
	task = require('../lib/tasks');
	build = require('./build');
	_ = require('underscore');
	cache = require('../lib/cache');
});

var dev = function(){

	initer();

	hook.beforeCommand();

	global.devBuild = true;
	if ( arguments[0].parent.completeBuild ) {
		global.devBuild = false;
	}
	
	// task
	task.dev({
		src : [P.root + P.path + B.dir.src + '/**/*'],
		change : dev.fn.change
	});
	hook.afterCommand();

};

// ========================================
// Tool Function
// ========================================
dev.fn = {};

dev.fn.change = function( obj ){

	initer();

	var all = [], promise = Promise();
	
	// if biz change just build biz
	if ( obj.type === 'biz' ) {
		all.push(obj.id);
	}

	// if common change need build biz
	if ( obj.type === 'common' ) {

		var type = obj.id.split('@')[0],
			name = obj.id.split('@')[1],
			commonlist = cache.get('commonlist')[type],
			bizlist = cache.get('bizlist')[type],
			childCommon = [];

		var findCommon = function( name ){
			
			_.each( commonlist, function(cv){
				_.find( cv.relyCommon, function(v){
					if ( v === name ) {
						childCommon.push(cv.name);
						findCommon(cv.name);
					}
					return true;
				});
			});

		};

		findCommon(name);
		childCommon = _.uniq(childCommon);

		_.each( bizlist, function(v){
			if ( _.intersection( v.relyCommon, childCommon).length > 0 ) {
				all.push(type+'@'+v.name);
			}
		});

	}

	all = _.uniq(all);
	build.fn.list(all)
	.always(function(){
		promise.resolve();
	});

	return promise;
	
};


// ========================================
// Sub Command
// ========================================

module.exports = dev;

// info
module.exports._info = {
	name : 'dev',
	flags : [
		'dev [-C]'
	],
	method : {},
	args : {},
	longDesc : '对源文件进行监控，发生改变时自动编译。',
	shortDesc : 'watch files, if change build code.',
	options : ['-C']
};