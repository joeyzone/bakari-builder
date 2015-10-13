bakari-builder
==============

##Install

通过npm安装bakari-builder。

	npm install －g bakari-builder

##Usage

执行命令，初始化一个项目：


	# 初始化一个项目
	$ bakari init
	
	# 为项目添加一个库
	$ bakari add lib jquery
	
	# 添加一个指定版本的库
	$ bakari add lib jquery -v 1.10.0
	
	# 查看当前项目中包含的库
	$ bakari lib list

	# 添加一个业务
	$ bakari add biz commit/add
	
## Flags
- `-h` or `-help` 查看帮助
- `-V` or `--version` 查看bakari-builder版本
- `-v` or `--use-version` 为当前命令指定一个版本


##Project Commands

`init` 	: 初始化一个项目。

`clean` : 清理一个项目，这个指令会根据项目配置文件，清除多余的代码，同时补全缺失的代码。

##Lib Commands

`add lib <lib>` : 添加一个库到项目中。

`rm lib <lib>` : 从项目中移除一个库。

`lib list` : 查看项目中包含的库。

`clean lib` : 清理项目中的库，根据项目配置文件，清除多余的库，同时补全缺失的库。


##Biz Commands

`add biz <path>` : 添加一个业务到项目中，通过业务的路径bakari将自动生成pageId及继承关系。

`rm biz <pageid>` : 根据`page id`移除一个业务，移除前需要先移除所有子业务。

`biz list` : 查看所有的业务。

`see biz <pageid>` : 查看某个业务详情。

`clean biz` : 清理项目中的业务，根据项目业务配置，清除多余的业务js文件，同时补全缺失的js文件。

`set biz <pageid>` : 设置一个业务配置，修改业务的`page id`或`extend page id`，builder将自动修改文件名及文件中的继承关系。

##Code Build
`build <path>` : 构建css,js文件。

`timestamp <path>` or short it `ts <path>`: 修改时间戳。（只针对husor项目的文件结构）。
