---
title: 使用void 0代替undefined
date: 2019-03-20 11:41:13
summary: 
desc: 
tag: 
category: Js
---

### 为什么建议使用void 0 来替代 undefined ?
1. undefined 不是保留字，在低版本的IE浏览器中会被重写。
```
  var undefined = 1
  console.log(undefined)
  // chrome undefined
  // 低版本IE 1
```
2. 局部作用域中 undefined 仍然可以被重写。
```
(function() {
  var undefined = 1
  console.log(undefined)
  // chrome 1
  // 低版本IE 1
})()
```
3. void 后面无论跟什么，其返回的都是 undefined ，且无法被修改。
