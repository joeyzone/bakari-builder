bakari-builder
==============

##About

`bakari-builder`是为`bakari`框架开发的自动化构建工具，类似[yeoman](http://yeoman.io/)。

功能：

- 库管理，基于[bower](http://bower.io/)
- 业务管理
- 代码构建，基于[gulp](http://gulpjs.com/)

##Install

通过npm安装bakari-builder。

	npm install －g bakari-builder

##Usage

执行命令，初始化一个项目：


	# 初始化一个项目
	$ bakari init
	
	# 为项目添加一个库
	$ bakari addlib jquery
	
	# 添加一个指定版本的库
	$ bakari addlib jquery -v 1.10.0
	
	# 查看当前项目中包含的库
	$ bakari liblist

	# 添加一个业务
	$ bakari addbiz commit/add
	
## Flags
- `-h` or `-help` 查看帮助
- `-V` or `--version` 查看bakari-builder版本
- `-v` or `--use-version` 为当前命令指定一个版本
- `-t` or `--timing` 统计当前命令执行的时间
- `-c` or `--complete-build` 需要进行完整的构建，处在开发模式时(`bakari dev`)，bakari默认不会生成生产环境文件及版本信息。启用这个选项后，bakari在任何情况下都将进行完整的代码构建(包含生产环境文件及版本信息)。


##Commands
###Project

`init` 	: 初始化一个项目。

`clean` : 清理一个项目，这个指令会根据项目配置文件，清除多余的代码，同时补全缺失的代码。

###Library

`addlib <lib|local path>` : 添加一个库到项目中，你可以输入一个本地路径来添加自定义库。

`rmlib <lib>` : 从项目中移除一个库。移除库时bakari会检查是否有业务依赖这个库，若有库无法被移除并会提示。

`liblist` : 查看项目中包含的库。

`cleanlib` : 清理项目中的库，根据项目配置文件，清除多余的库，同时补全缺失的库。

`search lib <keyword>` : 根据关键词搜索库。


###Package

package区别lib，使用起来更为灵活，只需将文件放到`script/src/pkg/`目录下即可，文件名就是package的名称。

一般与业务相关但不适用于继承关系的代码片段放在package中。

在设置业务逻辑时可以选择需要加载的package。

package管理松散，删除时不会检测依赖，也没有版本管理。

###Biz

`addbiz <path>` : 添加一个业务到项目中，通过业务的路径bakari将自动生成pageId及继承关系。

`rmbiz <pageid>` : 根据`page id`移除一个业务，移除前需要先移除所有子业务。

`bizlist` : 查看所有的业务。

`bizinfo <pageid>` : 查看某个业务详情，包含：

- pageId : 页面id
- path : 源文件路径
- extendPage : 继承页面的id
- libs : 依赖的库及版本
- child : 所有的子页面
- parent : 所有的祖先页面

`cleanbiz` : 清理项目中的业务，根据项目业务配置，清除多余的业务js文件，同时补全缺失的js文件。

`setbiz <pageid>` : 设置一个业务配置，修改业务的`page id`或`extend page id`，builder将自动修改文件名及文件中的继承关系，并会重新构建开发环境、生产环境代码及版本信息。

###build

`build <pageid>` : 构建某个`pageid`的文件，会生成一份开发版本和生产版本。若`pageid`为空则会build所有文件，业务代码将会进行jshint检测。

`dev` : 开发模式，将监控所有源文件，并自动build。

`upversion <pageid>` : 更新版本信息，若`page id`为空，则会为所有文件更新版本信息。版本信息包含：

- md5 : 业务文件的md5字符串
- date : 最后更新的时间

通过对md5和date的组合生成唯一的文件id：
	
	// admin-[md5前5位][date后3位]
	admin-oa91h371.js
	
版本信息中的md5由生产环境中对应`page id`文件的内容生成，例如`admin.js`的md5由`<项目根路径>/script/pro/admin.js`的内容生成。

##Working with server
###Page id rule

`page id`与服务端对应页面的相对位置有关，比如：

`add.php`在服务端的位置是`blog/commit/add.php`，对应的`page id`为`blogCommitAdd`。

###Get file

经过bakari构建的最终文件分为开发文件和生产文件，分别用于不同的环境。

对于同一个`page id`bakari会生成两份文件分别存放业务逻辑和库，业务逻辑将会经常变动，而库则不会。

开发文件只将代码进行合并，而生产文件会对代码进行压缩。

两份文件分别位于`script/dev/`和`script/pro`，你可以对这两个目录进行配置(TODO)。

文件的名字与`page id`相对应，如`page id`为`blogCommitAdd`，对应的文件为:

- script/dev/blogCommitAdd.js
- script/dev/blogCommitAdd.lib.js
- script/pro/blogCommitAdd.js
- script/pro/blogCommitAdd.lib.js

##More
###Biz js file template

你可以为js业务文件设置模板，将模板写入项目根目录下的`.jsbiztpl`文件中，使用`bakari addbiz <pageid>`命令添加的业务文件，都会采用此模板。

你还可以再模板中设置一些变量：

- pageId : 当前页面的page id
- extendPage : 继承父页面的page id

在模板渲染时，这些变量将自动被替换：
	
	// 简单的继承模板
	B.{{pageId}} = B.{{extendPage}}.extend();
	
当使用`bakari addbiz commitAdd`命令后，模板会被渲染：

	B.commitAdd = B.commit.extend();

bakari将帮你管理模板中的变量，若使用`bakari setbiz commitAdd`命令修改`page id`，bakari将自动帮你修正文件，若使用`bakari setbiz commitAdd`命令将`page id`修改成commitModify，文件`commitAdd.js`将变成：

	B.commitModify = B.commit.extend();

###Use new library

当你也在业务中使用新的库时，请先使用`bakari addlib`命令将库添加至项目中，然后使用`bakari setbiz`或`bakari addbiz`时，即可选择新增的库。

###Use custom library

你可以通过`bakari addlib <local path>`的方式来为项目添加一个自定义库。

自定义库的名称是js的文件名，自定义库版本号为`custom`。

###JSHint config

将jshint的配置写入项目根目录下的`.jshintrc`文件中，bakari将会读取并应用，更多配置查看[JSHint doc](http://jshint.com/docs/)。

###Uglify config

将uglify的配置写入项目根目录下的`.uglifyrc`文件中，bakari将会读取并应用，更多配置查看[uglify.js](http://lisperator.net/uglifyjs/)。

###Late load library

bakari加载第三方库的时候将遵从尽可能晚加载的原则。

现在有两个文件`commit.js`和`commitAdd.js`，分别依赖以下库：

- commit.js 依赖：jquery,md5,json3
- commitAdd.js 依赖：json3,md5

bakari的加载顺序为：

1. jquery
2. json3
3. md5

###Livereload

bakari通过[livereload](http://livereload.com/)支持浏览器自动刷新。

当你处在开发环境时(`bakari dev`)，当源文件发生变化，bakari在代码构建完成后将自动刷新浏览器。

安装livereload：

- chrome : [livereload](https://chrome.google.com/webstore/detail/livereload/jnihajbhpnppcggbcgedagnkighmdlei?hl=zh-CN)
- firefox : [livereload](https://addons.mozilla.org/zh-cn/firefox/addon/livereload/)
- opera : [livereload](https://addons.opera.com/zh-cn/extensions/details/livereload-201-beta/?display=en)

安装完成后，在需要自动刷新的页面上开启插件即可。

更多的客户端及帮助，请[查看官方网站](http://livereload.com/)。