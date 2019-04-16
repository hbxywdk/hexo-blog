---
title: 本地调试Google-Sign-In
date: 2018-12-01 18:11:13
summary: 
desc: 
tag: 
category: Js
---

最近要开发的项目需要做谷歌登录的功能 

[谷歌第三方登录](https://developers.google.com/identity/sign-in/web/sign-in)

在阅读文档的时候注意到，要先配置 OAuth client，其中有一项是配置重定向URL且不能是IP。

![OAuth client](https://raw.githubusercontent.com/hbxywdk/hexo-blog/master/assets/2018-12/googlecomfig.png)

看到这里就产生了本地开发如何调试获取用户信息的疑惑。

#### 解决方法：

使用SwitchHosts工具（可以直接在github搜索，下载对应版本），通过修改本地hosts（hosts无法修改的可自行百度解决），将某个域名指向为本地ip，如本地地址为 http://192.168.1.134:8000/ ，要配置为www.demo.com

![本地hosts配置](https://raw.githubusercontent.com/hbxywdk/hexo-blog/master/assets/2018-12/googlecomfig2.png)

打开 http://www.demo.com:8000 即可访问到和 http://192.168.1.134:8000一样的内容。

将之前的重定向地址填为 http://www.demo.com:8000 即可成功获得Google用户信息。

Tips：
所有的OAuth client均可在 [这里](https://console.developers.google.com/apis/credentials)管理。



