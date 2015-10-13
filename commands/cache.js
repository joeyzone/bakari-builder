// command - cache
'use strict';

var helper,
	Promise,
	Cache;

var cache = function( method, type ){
	
	helper = require('../lib/helper');
	Promise = require('bakari-promise');
	Cache = require('../lib/cache');
	
	// TODO

};

// ========================================
// Tool Function
// ========================================
cache.fn = {};
cache.fn.run = function( method, name ){
	if ( typeof cache[method] === 'function' ) {
		cache[method].call(this, name).always(hook.afterCommand);
	} else {
		helper.log('error', 'no this command, use `bakari help cache` check all cache commands');
		hook.afterCommand();
	}
};

// ========================================
// Sub Command
// ========================================
cache.list = function(){
	
};

cache.rm = function(){
	
};


module.exports = cache;

// info
module.exports._info = {
	name : 'cache',
	flags : [
		'cache <method> [<type>]',
		'cache <method> [<type>] [-t]',
		'cache list [-t]',
		'cache rm [<type>] [-t]'
	],
	method : {
		'add' : 'Display all cache',
		'rm' : 'Remove some cache'
	},
	args : {
		'method' : 'Operation type',
		'type' : 'Cache type, has : lib,widget'
	},
	longDesc : '对项目的缓存进行操作，可以缓存或清除一些缓存。',
	shortDesc : 'change cache for project',
	options : ['-t']
};