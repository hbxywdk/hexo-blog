---
title: 在Hexo生成的github博客中使用本地图片
date: 2019-04-16 14:36:44
summary: 
desc: 
tag: 
category: 其他
---

1. 将项目根目录的 _config.yml 中的 post_asset_folder 字段设为 true。
2. 将 post_asset_folder 设置为 true 后 使用 hexo new "filename" 命令时会在_posts下生成一个同名文件夹。
3. 安装 npm install hexo-asset-image --save
4. 键入 hexo new "test" 命令，创建一片名为test的博文。
5. 将图片资源放入test文件夹中。
```
|- _posts
|-  test
|-   Bg.png
|-  test.md
```
6. 在test.md写入图片地址 test/Bg.png。
7. 运行 hexo server 即可看到效果。

`
由于本blog使用的 anatole 主题在安装 hexo-asset-image 时报错，这里不做深究，故将图片放入github上另外一个项目中，再在博客中引用github资源。
`



