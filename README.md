## My Hexo Blog
1. 安装Hexo
```
npm install -g hexo-cli
```
2. 初始化一个项目
```
hexo init <folder>
cd <folder>
npm install
```
3. 运行项目
```
hexo server
默认运行在http://localhost:4000
```
4. 更换主题
```
// 1.以anatole主题为例，按照文档安装。
// 2.修改根目录下_config.yml中themes一项为themes文件夹下对应目录名。
// 3.重新运行hexo server，刷新网页即可看到效果。
// 4.如果无效，或者有报错出现，请重新查看文档，是否有包漏装。
// Hexo anatole 主题 https://github.com/Ben02/hexo-theme-Anatole
// anatole 主题的文档 https://github.com/Ben02/hexo-theme-Anatole/wiki/Installation
```
5. 使用本地图片
```
// 1.npm install hexo-asset-image --save
// 2.将_config.yml 中 post_asset_folder 一项目修改为true。
// 3.假设Page名为test，则创建一个名字也为test的文件夹，将图片放进去。
// 4.在Page中使用![logo](test/logo.jpg)即可。
// https://www.jianshu.com/p/8d28027fec76
// https://blog.csdn.net/qq_37497322/article/details/80628713

注意：使用anatole主题时，会与hexo-asset-image产生冲突，暂时将图片放在github上的hexo-blog项目中直接引用。

```
6. 部署到github
```
1.创建github仓库，仓库名字必须为 '你的Github用户名.github.io' (大小写也相同)，如果使用的其他的仓库名，访问时会出现文件引用404错误。
2.在新创建的github仓库的设置中开启github page选项。
3.回到Hexo中，安装 npm install hexo-deployer-git --save
4.修改_config.yml的deploy配置为：
deploy:
  type: git # 类型
  repo: https://github.com/你的Github用户名/你的Github用户名.github.io
  branch: master # 分支
  message: # 自定义提交信息 (默认为 Site updated: {{ now('YYYY-MM-DD HH:mm:ss') }})
5. 运行 hexo clean && hexo generate && hexo deploy，或将其写入package.json的scripts中，使用npm运行部署命令。
```

## Page相关
1. 自定义文章展示标题、发布时间、摘要、描述
```
// 在文章markdown的开头写入：
---
title: Hello World # 展示标题
date: 2015-12-31 14:49:13 # 发布时间
summary: # 摘要
desc: # 这里是对此文章的描述，有利于收录
comments: false # 设为false可单独关闭该文章的评论
tag: 标签
category: 分类
---
```

## anatole主题包相关
1. 主题文件夹内有一个 _config.sample.yml 文件，里面列出了主题支持的所有设置项，可以参考新建一个 _config.yml 文件并进行自定义配置。
```
# 博客信息
keywords: Hexo,HTML,CSS,android,Linux  # 博客的关键词
author: Author Name,name@example.com  # 博客作者和联系邮箱（目前 Google 可以识别）
description: Nothing lasts forever.  # 博客描述，会显示在侧栏的 LOGO 下面
avatar: /images/favicon.png  # 右上角的头像，可用绝对路径引入他站资源（本地资源则是在主题文件夹/source/images下）

# 社交账户（只需要填用户名即可，填了显示，不填隐藏）
twitter: DKWang8
rss: 
weibo: 3136805851
instagram: 
github: hbxywdk
facebook: 
```
2. 关于主题的about与link页面
```
解决方式为直接hexo new page "pagename" 再添加跳转路由即可
具体可见这个issues https://github.com/Ben02/hexo-theme-Anatole/issues/31
```
3. 更换主题默认语言
```
// anatole主题默认是英语
// 在主题文件夹themes/anatole/languages自带了两种语言。
// 修改_config.yml的language一项为对应语言名即可（如：zh-cn）。
```

## archer主题包相关
