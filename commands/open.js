// command - open - V1
'use strict';

var helper = require('../lib/helper'),
	cache,
	Open;

var initer = helper.init(function(){
	cache = require('../lib/cache');
	Open = require('open');
});

var type = 'js';
var open = function( name ){
	
	initer();
	hook.beforeCommand();

	var list = {
		'common,js' : P.root + P.path + B.src.jsCommon + '/{name}.js',
		'common,css' : P.root + P.path + B.src.cssCommon + '/{name}.css',
		'widget,js' : P.root + P.path + B.src.widget + '/{name}-{version}/index.js',
		'widget,css' : P.root + P.path + B.src.widget + '/{name}-{version}/index.css', 
		'biz,js' : P.root + P.path + B.src.jsBiz + '/{name}.js',
		'biz,css' : P.root + P.path + B.src.cssBiz + '/{name}.css',
		'biz,html' : P.root + P.path + B.src.htmlBiz + '/{name}' + B.htmlFileSuffix
	};

	// get type
	if ( !arguments[2]){
		type = 'js';
	} else if ( arguments[2].parent.js ) {
		type = 'js';
	} else if ( arguments[2].parent.css ) {
		type = 'css';
	} else if ( arguments[2].parent.html ) {
		type = 'html';
	}

	var stype = name.split(':')[0],
		sname = name.split(':')[1].split('@')[0],
		sversion = name.split(':')[1].split('@')[1];

	if ( stype !== 'biz' && stype !== 'common' && stype !== 'widget' ) {
		helper.log('error', 'only widget/common/biz can be opened');
		return;
	}

	if ( ( stype === 'common' || stype === 'widget' ) && type === 'html' ) {
		helper.log('error', 'only biz has html file');
		return;
	}

	var filesrc = list[ stype+','+type ];
	if ( filesrc ) {
		filesrc = filesrc.replace(/\{name\}/g, sname);
		filesrc = filesrc.replace(/\{version\}/g, sversion);
		if ( exists(filesrc) ) {
			helper.log('waiting', 'file opening : ' + filesrc);
			Open(filesrc);
		} else {
			helper.log('error', 'file not exists');
		}
	} else {
		helper.log('error', 'not found file');
		return;
	}
	
	hook.afterCommand();

};


// ========================================
// Tool Function
// ========================================
open.fn = {};

module.exports = open;

// info
module.exports._info = {
	name : 'open',
	flags : [
		'open <index> [-c|-j|-h] [-t]'
	],
	method : {},
	args : {
		index : 'file index, like : `common:base`, `biz:blog/commit/add`, `widget:countdown@0.0.1`'
	},
	longDesc : '通过索引打开某个文件',
	shortDesc : 'open file',
	options : ['-c', '-j', '-h', '-t']
};