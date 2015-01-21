var colors = require('ansi-256-colors');

module.exports = function( status, msg ){
	console.log( colors.fg.getRgb(5,0,1) + 'bakari' + colors.reset + ' ' +
				 colors.fg.getRgb(0,2,5) + status.toUpperCase() + colors.reset + ' ' +
				 (msg || '') );
};