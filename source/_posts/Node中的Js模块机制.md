---
title: Node中的Js模块机制
date: 2019-04-25 15:00:15
summary: 
desc: 
tag: 
category: Node
---

### CommonJS模块规范

#### 模块定义
```
exports.add = function() {
  console.log('add')
}
```

#### 模块引用
在另一个文件中通过require引入模块后即可调用定义的属性或方法了
```
var add = require('./add').add
add()
```

### node模块分类

#### 核心模块（Node自带模块）
在node源代码编译的过程中，就编译进了二进制执行文件，属于安装包的一部分。在node进程启动时，部分核心模块会被直接加载进内存，因此，这部分核心模块的引入不需要文件定位和编译执行，并且优先进行路径分析，所以核心模块加载速度最快。`如果想要提高自己的node的加载速度，可以把自己的包，写入到安装包装中，使之变成核心模块`。

核心模块的优先级，仅次于缓存加载，它在node的源代码编辑过程中已经编译为二进制代码，加载速度最快。

#### 文件模块（用户编写第三方模块）
文件模块是在运行时动态加载的，需要完整的路径分析、文件定位、编译执行的过程，加载速度比核心模块加载的速度要慢。
我们新建一个文件`module_path.js`
```
console.log(module.paths)
```
执行
```
node module_path.js
```
可以看到这样一个输出
```
//linux
[ '/home/jackson/research/node_modules',
'/home/jackson/node_modules',
'/home/node_modules',
'/node_modules' ]

//win
[ 'c:\\nodejs\\node_modules', 'c:\\node_modules' ]
```
我们可以看出，这个模块路径的生成规则是：
1.当前文件目录下的node_modules目录
2.父目录下的的node_modules目录
3.爷爷目录下的node_modules目录
4.祖宗目录下的的node_modules目录，也就是向上一直找，直到根目录下的node_modules目录

这很像Js中的原型链，层层查找，找到为止。

#### 注：Node对引入过的模块都会进行缓存，以减少二次引用时的开销。

### 模块编译
Node中每个文件就是一个模块，他的定义如下：
```
function Module(id, parent) {
  this.id = id;
  this.exports = {};
  this.parent = parent;
  if (parent && parent.children) {
    parent.children.push(this);
  }
  this.filename = null;
  this.loaded = false;
  this.children = [];
}
```
对于不同的扩展名文件，其加载方式如下：
- js文件，通过fs模块同步读取后编译执行。
- node文件，这是用c/c++编写的扩展文件，通过dlopen()方法加载并编译。
- json文件，通过fs模块同步读取后，用JSON.parse()解析并返回结果。
- 其余扩展名文件都当做js处理

每一个编译成功的模块都会将文件路径作为索引缓存到Module._cache对象中，以提高二次引入的性能。

### JavaScript模块的编译
我们知道每个模块中都有require、exports、module、__filename、__dirname，它们从何而来，事实上，在编译过程中，Node对js文件内容进行了头尾包装，变为如下形式：
```
(function (exports, require, module, __filename, __dirname) {
  var math = require('math')
  exports.area = function (radius) {
    return Math.PI * radius * radius
  }
})
```
这样每个文件模块之间都有了作用域隔离，包装后的代码会通过vm原生模块调用runInThisContext()方法执行（类似于eval），返回一个具体的function对象。

最后`将当前模块对象的exports属性、require方法、module（模块对象自身）、文件完整路径、文件目录当做参数传给这个function执行`，最后`return了模块的exports`。

故exports上的任何方法和属性都可以被外部调用到。

### exports和module.exports
module.exports才是真正的接口，exports只不过是它的一个辅助工具。　最终返回给调用的是module.exports而不是exports。
所有的exports收集到的属性和方法，都赋值给了Module.exports。当然，这有个前提，就是module.exports本身不具备任何属性和方法。
如果，module.exports已经具备一些属性和方法，那么exports收集来的信息将被忽略。

### 参考：
> 《深入浅出Node.js》