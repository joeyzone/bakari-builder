// command - config
'use strict';

var helper = require('../lib/helper'),
	inquirer,
	colors,
	jshintData,
	extend,
	ugfilyData,
	_;

var initer = helper.init(function(){
	inquirer = require('inquirer');
	colors = require('ansi-256-colors');
	jshintData = require('../data/jshint');
	extend = require('extend');
	ugfilyData = require('../data/ugfily');
	_ = require('underscore');
});

var type = null;
var config = function(){
	
	initer();

	hook.beforeCommand();

	inquirer.prompt([
		{
			name : 'type',
			type : 'list',
			message : 'choose config:',
			choices : ['jshint', 'ugfily']
		}
	], function( answers ) {
		type = answers.type;
		config.fn[type]();
	});
	
	hook.afterCommand();

};

// ========================================
// Tool Function
// ========================================
config.fn = {};

config.fn.jshint = function(){
	
		
	var enforceChoices = [],
		enforceDefault = [],
		enforceKeys = [],
		relaxChoices = [],
		relaxDefault = [],
		relaxKeys = [],
		jshintConfig = {},
		oldConfig = {};

	if ( exists(P.root+B.jshintrcPath) ) {
		oldConfig = readJSON(P.root+B.jshintrcPath);
	}

	_.each( jshintData.enforceOptions, function( v, k ){
		if ( k!=='_name' ) {

			enforceChoices.push({
				name : colors.fg.bright[7] + v.note + colors.reset + ' ' + colors.fg.grayscale[7] + '<' + k +'> 默认:'+v.def+colors.reset,
				value : k 
			});

			if ( ( oldConfig[k] === true ) || ( oldConfig[k] === undefined && v.def === true ) ) {
				enforceDefault.push(k);
			}

			enforceKeys.push(k);

		}
	});

	_.each( jshintData.relaxOptions, function( v, k ){
		if ( k!=='_name' ) {

			relaxChoices.push({
				name : colors.fg.bright[7] + v.note + colors.reset + ' ' + colors.fg.grayscale[7] + '<' + k +'> 默认:'+v.def+colors.reset,
				value : k 
			});

			if ( ( oldConfig[k] === true ) || ( oldConfig[k] === undefined && v.def === true ) ) {
				relaxDefault.push(k);
			}

			relaxKeys.push(k);

		}
	});

	var promptList = [
		{
			name : 'enforce',
			type : 'checkbox',
			message : jshintData.enforceOptions._name+':',
			choices : enforceChoices,
			default : enforceDefault
		},
		{
			name : 'relax',
			type : 'checkbox',
			message : jshintData.relaxOptions._name+':',
			choices : relaxChoices,
			default : relaxDefault
		}
	];


	// input options
	_.each( jshintData.inputOptions, function(v,k){

		var note = v.note;

		if ( oldConfig[k] ) {
			v = oldConfig[k];
		}

		if ( k === 'globals' && oldConfig[k] ) {
			v = _.keys(v).join(',');
		} else if (k === 'globals') {
			v = 'window,define';
		}

		if ( k === 'indent' && !oldConfig[k] ) {
			v = 4;
		}

		if ( k === 'quotmark' && !oldConfig[k] ) {
			v = 'false';
		}
		
		if ( k!=='_name' ) {
			promptList.push({
				name : k,
				type : 'input',
				message : '输入 ' + note,
				default : v || v.def
			});
		}

	});

	inquirer.prompt(promptList, function( answers ) {

		_.each(enforceKeys, function(v){
			jshintConfig[v] = false;
			_.find(answers.enforce, function(ev){
				if ( ev === v ) {
					jshintConfig[v] = true;
					return true;
				}
			});
		});

		_.each(relaxKeys, function(v){
			jshintConfig[v] = false;
			_.find(answers.relax, function(ev){
				if ( ev === v ) {
					jshintConfig[v] = true;
					return true;
				}
			});
		});

		_.each( answers, function(v,k){
			if ( k!=='relax' && k!=='enforce' ) {
				if ( k === 'globals' ) {
					var nv = {};
					v = v.split(',');
					_.each(v, function(sv){
						nv[sv] = true;
					});
					v = nv;
				}
				if ( k === 'quotmark' && v === 'false' ) {
					v = false;
				}
				jshintConfig[k] = v; 
			}
		});
		
		// save jshint config
		write( P.root+B.jshintrcPath, JSON.stringify(jshintConfig) );

		helper.log('success', 'jshint config changed');

	});

};

config.fn.ugfily = function(){
	
	var compressorChoices = [],
		compressorDefault = [],
		compressorKeys = [],
		ugfilyConfig = {
			compress : {},
			mangle : { except : [] }
		},
		oldConfig = extend( true, {}, ugfilyConfig);

	if ( exists(P.root+B.ugfilyrcPath) ) {
		oldConfig = extend( true, ugfilyConfig, readJSON(P.root+B.ugfilyrcPath) );
	}

	_.each( ugfilyData.compressorOptions, function( v, k ){
		if ( k!=='_name' ) {

			compressorChoices.push({
				name : colors.fg.bright[7] + v.note + colors.reset + ' ' + colors.fg.grayscale[7] + '<' + k +'> 默认:'+v.def+colors.reset,
				value : k 
			});

			if ( ( oldConfig.compress[k] === true ) || ( oldConfig.compress[k] === undefined && v.def === true ) ) {
				compressorDefault.push(k);
			}

			compressorKeys.push(k);

		}
	});

	var promptList = [
		{
			name : 'compressor',
			type : 'checkbox',
			message : ugfilyData.compressorOptions._name+':',
			choices : compressorChoices,
			default : compressorDefault
		}
	];

	// input options
	_.each( ugfilyData.inputOptions, function(v,k){

		var note = v.note;

		if ( k === 'mangleExcept' ) {

			if ( oldConfig.mangle.except.length > 0 ) {
				v = oldConfig.mangle.except.join(',');
			} else {
				v = '';
			}

		}

		if ( k!=='_name' ) {
			promptList.push({
				name : k,
				type : 'input',
				message : '输入 ' + note,
				default : v
			});
		}

	});

	inquirer.prompt(promptList, function( answers ) {

		_.each(compressorKeys, function(v){
			ugfilyConfig[v] = false;
			_.find(answers.compressor, function(ev){
				if ( ev === v ) {
					ugfilyConfig.compress[v] = true;
					return true;
				}
			});
		});

		_.each( answers, function(v,k){
			if ( k!=='compressor' ) {
				if ( k === 'mangleExcept' ) {
					v = v.split(',');
					ugfilyConfig.mangle.except = v; 
				}
			}
		});
		
		// save jshint config
		write( P.root+B.ugfilyrcPath, JSON.stringify(ugfilyConfig) );

		helper.log('success', 'ugfily config changed');

	});


};


module.exports = config;

// info
module.exports._info = {
	name : 'config',
	flags : [
		'config'
	],
	method : {},
	args : {},
	longDesc : '修改项目的配置，包括jshint,ugfily。',
	shortDesc : 'modify project config.',
	options : []
};