---
title: 使用Canvas压缩Jpg图片丢失Exif信息问题
date: 2019-08-16 18:54:34
summary: 
desc: 
tag: 
category: Js
---
#### 遇到的问题
最近开发遇到一个问题，后台想要在用户上传的图片中获取到 Exif 信息，APP 确认 Exif 信息有传，最后排查到 Exif 丢失的原因是 H5 对 APP 传回的照片进行了压缩。H5 使用的压缩库是 [lrz](https://github.com/think2011/localResizeIMG)，将 H5 压缩关闭后，后台就可以获取到 Exif 信息了。

APP 传给 H5 的图片内容是 base64 化的 jpg 图，前端压缩后，传压缩后的 base64 图片给后台。

APP 传给 H5 的图片比较大，本着节省用户流量与缩短上传时间的考虑，必须在前端压缩再传给后台。

#### 问题产生的原因
查看 lrz 的源码，发现它是使用 canvas 将原图绘制到其上，再将 canvas 的内容转为 base64 格式的图片。

我又看了其他一款纯前端图片压缩库后，发现它俩都是使用 canvas 来进行图片压缩（貌似纯前端图片压缩方法基本就canvas），使用 canvas 压缩图片虽然可以达到大比例压缩的目的，但是最后从 canvas 中导出的图片必然会将原图中保存的 Exif 等信息内容一并丢掉。

#### Base64
##### Base64 出现的原因
有些网络传输方式并不支持所有的字节，例如传统的邮件只支持可见字符的传输，像ASCII码的控制字符就不能传输。图片二进制流的每个字节不可能全部是可见字符，所以也不能传输。
那么就需要在不改变传统协议的情况下，做一种扩展来支持二进制文件传输，这就是 Base64 出现的原因，它可将不可打印的字符用可打印字符来表示，以实现传输的目的。
Base64 从名称就可以看出，它是一种基于64个可打印字符来表示二进制数据的方法。

##### Base64 原理
![Base64索引表](https://raw.githubusercontent.com/hbxywdk/hexo-blog/master/assets/2019-08/base64index.png)

Base64只有64个字符，6的bit即可表示64个字符(2的6次方为64)，正常的字符是使用8bit表示。我们看下面这张图：
![Base64原理图](https://raw.githubusercontent.com/hbxywdk/hexo-blog/master/assets/2019-08/base64-1.jp)
`Hello!` 这个字符串的二进制值如第三行所示，正常字符使用 8bit 表示，转换 base64 则使用 6bit 表示，以 6个一截断，再对照 base64 索引表可以很容易的得出其 base64 编码结果为 SGVsbG8h。
Tips: 转换后长度/转换前长度 为 4:3。

如果原始字符串长度不能被3整除，就需要用0来补充，如下图：
![Base64补位](https://raw.githubusercontent.com/hbxywdk/hexo-blog/master/assets/2019-08/base64-2.jpg)

Hello!! Base64编码的结果为 SGVsbG8hIQAA，由于补充的两个`AA`不应该携带信息，这里以
`AA`表示会造成数据错误，所以会以 `=`替换补位的`AA`，故最终的结果为 `SGVsbG8hIQ==`。

这里只是简单讲一下 Base64，更多详情可看这篇文章：https://www.cnblogs.com/peterYong/p/10959964.html

#### 什么是 Exif？
可交换图像文件格式 Exif（Exchangeable image file format），是专门为数码相机的照片设定的，可以记录数码照片的属性信息和拍摄数据，它储存在相机设备拍摄的图片的二进制文件中。
Exif信息以0xFFE1作为开头标记，后两个字节表示Exif信息的长度。所以Exif信息最大为64 kb，而内部采用TIFF格式。

JPEG文件的内容都以二进制值 `0xFFD8`（Start of image 简称 SOI）开始, 以二进制值`0xFFD9`（End of image 简称 EOI）结束。 在JPEG的数据 中有好几种类似于二进制 0xFFXX 的数据, 它们都统称作 "标记", 并且它们代表了一段JPEG的 信息数据。

SOI 与 EOI 两个特殊的标记的后不跟数据, 而其他的标记会在其后附带数据。

标记的基本结构：
```
0xFF+标记号(1个字节)+数据大小描述符(2个字节)+数据内容(n个字节)
```
标记的种类又很多种，0xFFE0~0xFFEF之间的标记被叫做 "应用标记"，存放 Exif 信息的标记以 `APP1(0xFFE1)` 开头，

#### 解决方案

#### 二进制数组

#### 参考
> https://www.cnblogs.com/peterYong/p/10959964.html
> https://blog.csdn.net/yyjsword/article/details/28876739
> http://icaife.github.io/2015/05/19/js-compress-JPEG-width-exif/#more

