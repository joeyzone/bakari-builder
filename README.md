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


##Commands
###Project

`init` 	: 初始化一个项目。

`clean` : 清理一个项目，这个指令会根据项目配置文件，清除多余的代码，同时补全缺失的代码。

###Lib

`addlib <lib>` : 添加一个库到项目中。

`rmlib <lib>` : 从项目中移除一个库。

`liblist` : 查看项目中包含的库。

`cleanlib` : 清理项目中的库，根据项目配置文件，清除多余的库，同时补全缺失的库。


###Biz

`addbiz <path>` : 添加一个业务到项目中，通过业务的路径bakari将自动生成pageId及继承关系。

`rmbiz <pageid>` : 根据`page id`移除一个业务，移除前需要先移除所有子业务。

`bizlist` : 查看所有的业务。

`seebiz <pageid>` : 查看某个业务详情。

`cleanbiz` : 清理项目中的业务，根据项目业务配置，清除多余的业务js文件，同时补全缺失的js文件。

`setbiz <pageid>` : 设置一个业务配置，修改业务的`page id`或`extend page id`，builder将自动修改文件名及文件中的继承关系。

###build

`build <pageid>` : 构建某个`pageid`的文件，会生成一份开发版本和生产版本。若`pageid`为空则会build所有文件，业务代码将会进行jshint检测，

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

开发文件只将代码进行合并，而生产文件会对代码进行压缩。

两份文件分别位于`script/dev/`和`script/pro`，你可以对这两个目录进行配置(TODO)。

文件的名字与`page id`相对应，如`page id`为`blogCommitAdd`，对应的文件为`script/dev/blogCommitAdd.js`和`script/pro/blogCommitAdd.js`。

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

###JSHint config

将jshint的配置写入项目根目录下的`.jshintrc`文件中，bakari将会读取并应用，更多配置查看[JSHint doc](http://jshint.com/docs/)。

###Late load library

bakari加载第三方库的时候将遵从尽可能晚加载的原则。

现在有两个文件`commit.js`和`commitAdd.js`，分别依赖以下库：

- commit.js 依赖：jquery,md5,json3
- commitAdd.js 依赖：json3,md5

bakari的加载顺序为：

1. jquery
2. json3
3. md5

###Liveload

TODO