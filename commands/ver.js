// command - ver
'use strict';

var helper = require('../lib/helper'),
	Promise,
	colors,
	archy,
	task,
	_;
	
var initer = helper.init(function(){
	Promise = require('bakari-promise');
	colors = require('ansi-256-colors');
	archy = require('archy');
	_ = require('underscore');
	task = require('../lib/tasks');
});

var type = false;
var ver = function( method ){

	initer();
	hook.beforeCommand();

	// check method
	if ( typeof method !== 'string' ) {
		helper.log('error', 'you must input method, see help : `bakari help ver`');
		return;
	}

	// get type
	if ( arguments[1].parent.js ) {
		type = 'js';
	} else if ( arguments[1].parent.css ) {
		type = 'css';
	}

	ver.fn.run(method);

};


// ========================================
// Tool Function
// ========================================
ver.fn = {};
ver.fn.run = function( method ){
	if ( typeof ver[method] === 'function' ) {
		ver[method].call(this).always(hook.afterCommand);
	} else {
		helper.log('error', 'no this command, use `bakari help ver` check all ver commands');
		hook.afterCommand();
	}
};


// ========================================
// Sub Command
// ========================================
ver.up = function(){

	initer();
	var promise = Promise();

	task.flow('versionUpdate', {
		type : type
	})
	.flowStart()
	.done(function(){
		helper.log('success', 'all version update');
		promise.resolve();
	})
	.fail(function(){
		helper.log('fail', 'version update fail');
		promise.reject();
	});

	return promise;

};

ver.list = function(){

	initer();
	
	var promise = Promise(),
		jslist = [],
		csslist = [],
		str;

	if ( type === 'js' || type === false ) {

		var jsVersion = readJSON(P.root+P.path+B.file.jsVersion);

		_.each(jsVersion, function(v,k){
			jslist.push( k + ' ' + colors.fg.getRgb(5,4,1) + '@' + v.id + colors.reset );
		});

		str = archy({
			label : 'JavaScript version('+jslist.length+'), in '+P.root+P.path+B.file.jsVersion,
			nodes : jslist
		});
		console.log(str);

	}

	if ( type === 'css' || type === false ) {

		var cssVersion = readJSON(P.root+P.path+B.file.cssVersion);

		_.each(cssVersion, function(v,k){
			csslist.push( k + ' ' + colors.fg.getRgb(5,4,1) + '@' + v.id + colors.reset );
		});

		str = archy({
			label : 'CSS version('+csslist.length+'), in '+P.root+P.path+B.file.cssVersion,
			nodes : csslist
		});
		console.log(str);

	}

	promise.resolve();
	return promise;

};

module.exports = ver;

// info
module.exports._info = {
	name : 'ver',
	flags : [
		'ver <method>',
		'ver up [-c|-j] [-t]',
		'ver list [-c|-j] [-t]'
	],
	method : {
		'up' : 'Update all ver info',
		'list' : 'Display ver list'
	},
	args : {},
	longDesc : '对业务文件的版本信息进行操作。',
	shortDesc : 'build code for project',
	options : ['-c', '-j', '-t']
};