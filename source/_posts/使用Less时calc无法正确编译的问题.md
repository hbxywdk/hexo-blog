---
title: 使用Less时calc无法正确编译的问题
date: 2019-02-21 14:46:13
summary: 
desc: 
tag: 
category: Less
---
#### 问题
编写Less时使用calc：
```
  width: calc(100% - 30px);
```
会被编译成：
```
  width: calc(100%);
```
#### 解决方法
写为如下形式可解决：
```
  width: calc(~"100% - 30px");
```
如写入变量：
```
  @a: 30px;
  width: calc(~"100% - " + @a);
  或
  width: calc(~"100% - " @a);
  或
  width: calc(~"100% - @{a}");
```
