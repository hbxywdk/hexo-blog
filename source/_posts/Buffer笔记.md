---
title: Buffer笔记
date: 2019-04-26 09:51:04
summary: 
desc: 
tag: 
category: Node
---

### Buffer
Buffer是一个类数组对象，主要用于操作字节，它的元素为16进制两位数，即0-255的数值。Buffer非常像数组，它可以访问length属性的到长度，也可以通过下标访问元素。Buffer对象的内存分配不是在V8堆内存中，而是在Node的C++层实现内存申请的。

### Buffer对象
```
var str = "Buffer笔记" 
var buf = new Buffer(str, 'utf-8')
console.log(buf)
// <Buffer 42 75 66 66 65 72 e7 ac 94 e8 ae b0>
```

Buffer对象的length
```
var buf = new Buffer(100)
console.log(buf.length) // => 100
```

通过下标赋值
```
console.log(buf[10]) // 这里会发现buf的元素是一个0-255的随机值
buf[10] = 100
console.log(buf[10]) // => 100
给元素赋值如果小于0，就将该值逐次加256，直到得到一个0-255之间的整数，如果得到的数值大于255，就逐次减256，直到得到0-255间的数值。如果是小数，则只保留整数部分。
buf[20] = -100; 
console.log(buf[20]); // 156 
buf[21] = 300; 
console.log(buf[21]); // 44 
buf[22] = 3.1415; 
console.log(buf[22]); // 3
```

### Buffer内存分配
为高效使用申请来的内存，Node采用`slab`分配机制，简单来说`slab`就是一块申请好的固定大小的内存区域，它有三个状态：
1. full: 完全分配
2. partial: 部分分配
3. empty: 没有被分配

Node以8KB为界限来区分Buffer是大对象还是小对象，同时8KB(8*1024)也是每个slab的大小值，在Js中，以它作为单位单元进行内存分配。

### Buffer转换
Buffer对象可以与字符串相互转换，但目前只支持这几种：`ASCII`、`UTF-8`、`UTF-16LE/UCS-2`、`Base64`、`Binary`、`Hex`

```
// 字符串转Buffer
new Buffer(str, [编码方式，默认UTF-8])
// Buffer转字符串
buf.write(string, [offset], [length], [encoding])
```

### Buffer的拼接
Buffer通常是一段一段传输的：
```
var fs = require('fs')
var rs = fs.createReadStream('test.md')
var data = ''
rs.on("data", function (chunk){ 
 data += chunk // chunk就是Buffer对象
})
rs.on("end", function () { 
 console.log(data)
})
```
使用字符串拼接的方式拼接Buffer在英文中并没有什么问题，但是，一旦输入流中又`宽位字节码`，就可能出现乱码。
```
data += chunk // 问题出在这里
data = data.toString() + chunk.toString() // 字符串拼接会隐式调用toString方法
```
toString()对于英文没什么影响，但对于宽字节的中文就会造成乱码。

#### 解决
添加setEncoding()，但这种方式局限于`UTF-8`、`UTF-16LE/UCS-2`、`Base64`这三种编码。
```
var rs = fs.createReadStream('test.md', { highWaterMark: 11})
rs.setEncoding('utf8')
```
#### 正确的拼接Buffer
正确的拼接方式是用一个数组来储存接受到的所有Buffer片段并记录下所有片段的总长度，然后调用Buffer.concat()方法生成一个河边的Buffer对象：
```
var chunks = []
var size = 0
res.on('data', function (chunk) {
  chunks.push(chunk)
  size += chunk.length
}); 
res.on('end', function () {
  var buf = Buffer.concat(chunks, size); 
  var str = iconv.decode(buf, 'utf8'); 
  console.log(str); 
})
```