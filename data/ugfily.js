module.exports = {
	compressorOptions : {
		_name : '压缩选项',
		sequences : {
			note : '使用逗号操作符作连续声明',
			def : true
		},
		properties : {
			note : '优化属性访问，foo[\'name\'] -> foo.name',
			def : true
		},
		dead_code : {
			note : '丢弃无法访问到的代码',
			def : true
		},
		drop_debugger : {
			note : '丢弃debugger声明',
			def : true
		},
		unsafe : {
			note : '启用不安全的代码压缩方式',
			def : false
		},
		conditionals : {
			note : '优化条件表达式',
			def : true
		},
		comparisons : {
			note : '优化比较',
			def : true
		},
		evaluate : {
			note : '尝试计算常量表达式',
			def : true
		},
		booleans : {
			note : '优化布尔表达式',
			def : true
		},
		loops : {
			note : '优化循环',
			def : true
		},
		unused : {
			note : '丢弃未使用的函数或变量',
			def : true
		},
		hoist_funs : {
			note : '提升函数声明',
			def : true
		},
		hoist_vars : {
			note : '提升变量声明',
			def : false
		},
		if_return : {
			note : '优化`if/return`及`if/continue`',
			def : true
		},
		join_vars : {
			note : '使用连续的var声明',
			def : true
		},
		cascade : {
			note : 'try to cascade `right` into `left` in sequences',
			def : true
		},
		side_effects : {
			note : 'drop side-effect-free statements',
			def : true
		},
		warnings : {
			note : '对存在危险的代码优化发出警告',
			def : true
		}
	},
	inputOptions : {
		mangleExcept : {
			note : '不混淆的变量名(逗号分割)'
		}
	}
	
};