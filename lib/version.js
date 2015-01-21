// lib - version
// if v2 > v1 return 1
// if v2 = v1 return 0
// if v2 < v1 return -1
var _ = require('underscore'),
	semver = require('semver'),
	cache = require('./cache');

module.exports.diff = function( v1, v2 ){

	var result = 0;

	v1 = v1.split('.');
	v1Len = v1.length;
	v2 = v2.split('.');
	v2Len = v2.length;

	var diffLen = v2Len - v1Len;

	// completion length
	if ( diffLen > 0 ) {
		_(diffLen).times(function(){
			v1.unshift(0);
		});
	} else if ( diffLen < 0 ) {
		_(-diffLen).times(function(){
			v2.unshift(0);
		});
	}

	_.find( v1, function(v,k){
		if ( +v < +v2[k] ) {
			result = 1;
			return true;
		} else if ( +v > +v2[k] ) {
			result = 2;
			return true;
		}
	});

	return result;

};

module.exports.hasLib = function( name, range ){
	
	var liblist = cache.get('liblist'),
		libs = liblist[name],
		versions = _.keys(libs);

	return semver.maxSatisfying( versions, range );

};

module.exports.greater = function( list, range ){

	return semver.maxSatisfying( list, range );

};