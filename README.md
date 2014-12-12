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
	$ bakari addlib jquery
	
	# 添加一个指定版本的库
	$ bakari addlib jquery -v 1.10.0
	
	# 移除一个库
	$ bakari rmlib jquery
	
	# 查看当前项目中包含的库
	$ bakari liblist
	
## Flags
- `-h` or `-help` 查看帮助
- `-V` or `--version` 查看bakari-builder版本
- `-v` or `--use-version` 为当前命令指定一个版本


##Project Commands

`init` 	: 初始化一个项目。

`clean` : 清理一个项目，这个指令会根据项目配置文件，清除多余的代码，同时补全缺失的代码。

##Lib Commands

`addlib <lib>` : 添加一个库到项目中。

`rmlib <lib>` : 从项目中移除一个库。

`liblist` : 查看项目中包含的库。

`cleanlib` : 清理项目中的库，根据项目配置文件，清除多余的库，同时补全缺失的库。


##Biz Commands

under development

##Code Build

under development