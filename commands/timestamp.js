// command - timestamp
//额外命令，添加时间戳
'use strict';

var helper = require('../lib/helper'),
    log = require('../lib/log'),
    _ = require('underscore'),
    colors = require('ansi-256-colors'),
    cache = require('../lib/cache');

var timestamp = function(pageid){
    log('stampstart', 'timestamp '+ (pageid ? pageid : 'ALL')+' start');
    var startTime = +new Date();

    var type = false,
        bizlist = cache.get('bizlist'),
        all = [];

    // get type
    if ( arguments[1].parent.js ) {
        type = 'js';
    } else if ( arguments[1].parent.css ) {
        type = 'css';
    }

    if ( pageid ) {
        all.push( pageid + "");
    } else {
        // timestamp all
        _.each( _.keys(bizlist.js), function(v,k){
            all.push(v + "");
        });
    }

    changeStamp(all);

    log('stampend', 'timestamp '+ (pageid ? pageid : 'ALL')+' end');
    var runTime = +new Date() - +startTime;
    helper.log('runtime', runTime+'ms');


}

function changeStamp(views){
    _.each(views,function(v,k){
        var viewPath = P.root + P.path + B.src.htmlBiz + '/' + v + '.php',
            jsversionPath = P.root + P.path + B.file.jsVersion,
            cssversionPath = P.root + P.path + B.file.cssVersion;


        try{
            var fileContent = read(viewPath);
        }catch(e){
            ('read file error:' + viewPath);
        }
       
    
        try{
            var filename = v.toString().replace(/\//g,'_'), //seller_plot_index
                jsversionObj = JSON.parse(read(jsversionPath)), 
                cssversionObj = JSON.parse(read(cssversionPath)),
                libcss_md5,
                css_md5,
                libjs_md5,
                js_md5;

            libcss_md5 = cssversionObj[filename + '.lib.css'] ? cssversionObj[filename + '.lib.css'].md5.slice(22) : '';
            css_md5 = cssversionObj[filename + '.css'] ? cssversionObj[filename + '.css'].md5.slice(22) : '';
            libjs_md5 = jsversionObj[filename + '.lib.js'] ? jsversionObj[filename + '.lib.js'].md5.slice(22) : '';
            js_md5 = jsversionObj[filename + '.js'] ? jsversionObj[filename + '.js'].md5.slice(22) : '';
        }catch(e){
            console.log('exec file error:' + viewPath);
        }
        

        try{
            fileContent = fileContent.replace(/\'\.lib\-.+\.css/,'\'.lib-' + libcss_md5 + '.css')
            .replace(/\'\.lib\-.+\.js/,'\'.lib-' + libjs_md5 + '.js')
            .replace(/\'-.+\.css/,'\'-' + css_md5 + '.css')
            .replace(/\'-.+\.js/,'\'-' + js_md5 + '.js');

            write(viewPath,fileContent);
            helper.log('┗', colors.fg.getRgb(0,2,5)+ colors.reset + colors.fg.getRgb(0,3,0) + viewPath.replace('./static/../application/views/screen','') + colors.reset );
        }catch(e){
            console.log('write file error:' + viewPath);
        }
       
    });
}

module.exports = timestamp;

// info
module.exports._info = {
    name : 'timestamp',
    Short : 'ts',
    flags : [
        'timestamp [<pageid>]',
        'timestamp [<pageid>] [-c|-j]'
    ],
    method : {},
    args : {
        'pageid' : 'Need build page id'
    },
    longDesc : '对项目的php模板中时间戳进行操作\n\t可以通过`-j`或`-c`选项来指定操作JavaScript或CSS，默认操作JavaScript。',
    shortDesc : 'change timestamp for project',
    options : ['-c', '-j']
};