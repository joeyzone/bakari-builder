module.exports = {
	enforceOptions : {
		_name : '严格选项',
		bitwise : {
			def : true,
			note : '禁止使用位运算符[]'
		},
		camelcase : {
			def : true,
			note : '强制所有变量使用驼峰或UPPER_CASE命名风格'
		},
		curly : {
			def : true,
			note : '循环或条件区块不能省略花括号'
		},
		eqeqeq : {
			def : true,
			note : '必须使用全等(===或!==)'
		},
		es3 : {
			def : true,
			note : '代码遵循的ECMAScript3规范'
		},
		es5 : {
			def : true,
			note : '代码遵循ECMAScript5.1规范'
		},
		forin : {
			def : true,
			note : '需要过滤对象继承属性，使用hasOwnProperty'
		},
		freeze : {
			def : true,
			note : '禁止复写原生对象(如Array, Date)的原型'
		},
		funcscope : {
			def : true,
			note : '当变量定义在区块内部，而在外部被访问时，不发出警告'
		},
		globalstrict : {
			def : true,
			note : '在全局严格模式下，不发出警告'
		},
		immed : {
			def : true,
			note : '需要用括号包裹立即调用函数'
		},
		iterator : {
			def : true,
			note : '使用`__iterator__`属性时，不发出警告'
		},
		latedef : {
			def : false,
			note : '变量定义之前禁止使用'
		},
		newcap : {
			def : true,
			note : '构造函数名首字母必须大写'
		},
		noarg : {
			def : true,
			note : '禁止使用`arguments.caller`和`arguments.callee`'
		},
		nocomma : {
			def : true,
			note : '禁止使用逗号运算符'
		},
		noempty : {
			def : true,
			note : '警告出现的空代码块'
		},
		nonbsp : {
			def : true,
			note : '警告使用特殊的字符'
		},
		nonew : {
			def : true,
			note : '禁止将构造函数当成普通函数使用'
		},
		notypeof : {
			def : true,
			note : '使用无效的typeof运算符时，不发出警告'
		},
		// 
		// shadow
		// singleGroups
		undef : {
			def : true,
			note : '禁止使用不在全局变量列表中的未定义的变量'
		},
		unused : {
			def : true,
			note : '禁止定义变量却不使用'
		}

	},
	relaxOptions : {
		_name : '宽松选项',
		asi : {
			def : true,
			note : '允许省略分号'
		},
		boss : {
			def : true,
			note : '允许在if/for/while语句中使用赋值'
		},
		debug : {
			def : true,
			note : '允许debugger语句'
		},
		eqnull : {
			def : true,
			note : '允许`===null`比较'
		},
		esnext : {
			def : true,
			note : '允许ECMAScript6规范'
		},
		evil : {
			def : true,
			note : '允许使用eval'
		},
		expr : {
			def : true,
			note : '允许应该出现赋值或函数调用的地方使用表达式'
		},
		lastsemic : {
			def : true,
			note : '允许单行控制块省略分号'
		},
		laxbreak : {
			def : true,
			note : '允许不安全的行中断(与laxcomma配合使用)'
		},
		laxcomma : {
			def : true,
			note : '允许逗号开头的编码样式'
		},
		loopfunc : {
			def : true,
			note : '允许循环中定义函数'
		},
		multistr : {
			def : true,
			note : '允许多行字符串'
		},
		noyield : {
			def : true,
			note : '允许发生器中没有yield语句'
		},
		plusplus : {
			def : true,
			note : '禁止使用++和–-'
		},
		proto : {
			def : true,
			note : '允许使用__proto__'
		},
		scripturl : {
			def : true,
			note : '允许使用scripturl，像这样`javascript:...`'
		},
		strict : {
			def : true,
			note : '强制使用ES5的严格模式'
		},
		sub : {
			def : true,
			note : '允许类似person[\'name\']的用法'
		},
		supernew : {
			def : true,
			note : '允许`new function() {…}`和`new Object;`'
		},
		validthis : {
			def : true,
			note : '允许严格模式下在非构造函数中使用this'
		},
		withstmt : {
			def : true,
			note : '允许使用with语句'
		}
	},
	inputOptions : {
		_name : '设定选项',
		globals : {
			note : '预设全局变量(多个之间逗号分割)',
			def : ''
		},
		indent : {
			note : '代码缩进宽度',
			def : '4'
		},
		quotmark : {
			note : '代码统一引号(double/single/false)',
			def : 'single'
		}
	}
};