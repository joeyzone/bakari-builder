// lib - update
var ver = require('./version'),
	log = require('./log'),
	cache = require('./cache'),
	Promise = require('bakari-promise'),
	libManager = require('./lib'),
	tree = require('./tree'),
	_ = require('underscore');

var list = {

	// 0.0.0 -> 0.1.1
	'0.1.1' : function( promise ){

		// update lib config
		var liblist = [];

		_.each( cache.get('liblist'), function(lv){
			_.each( lv, function(v){
				liblist.push( (v.name || v.pkg) +'@'+v.version );
			});
		});

		var once = function(){

			if ( liblist.length === 0 ) {

				tree.build();
				promise.resolve();
				return;

			}
			
			var name = liblist.shift();

			log('update', 'update '+name+' config');
			libManager.bowerCommand.info( name )
			.done(function( info ){
				var config = readJSON( P.root+B.builderPath+B.jsCfg.lib+'/'+name.replace('@','/')+'.json' );
				config.dependencies = info.dependencies;
				if ( config.pkg ) {
					config.name = config.pkg;
				}
				delete config.pkg;
				write( P.root+B.builderPath+B.jsCfg.lib+'/'+name.replace('@','/')+'.json', JSON.stringify(config) );
				once();
			})
			.fail(function(){
				promise.reject();
			});

		};

		once();
		return promise;

	}

};

module.exports = function( version ){

	var latest,
		versions = _.keys(list),
		upPromise = Promise();

	var updateOnce = function(){

		if ( versions.length === 0 && latest ) {
			log('update', 'config update to '+latest);
			upPromise.resolve();
			return;
		}

		if ( !latest ) {
			log('wait', 'update bakari config...');
		}
		
		var upVersion = versions.shift(),
			promise = Promise();

		if ( ver.diff( version, upVersion ) === 1 ) {
			list[upVersion]( promise )
			.done(function(){
				latest = upVersion;
				updateOnce();
			})
			.fail(function(){
				upPromise.reject();
				log('error', 'bakari config update fail, please run `bakari` again');
			});
		}

	};

	updateOnce();

	return upPromise;

};