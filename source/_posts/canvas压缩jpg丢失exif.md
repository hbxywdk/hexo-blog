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
![Base64原理图](https://raw.githubusercontent.com/hbxywdk/hexo-blog/master/assets/2019-08/base64-1.jpg)
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
标记的种类又很多种，0xFFE0~0xFFEF之间的标记被叫做 `应用标记`，存放 Exif 信息的标记以 `APP1(0xFFE1)` 开头，

#### 问题的解决方案
##### 方案一
原压缩图片不变，通过 [Exif.js](https://github.com/exif-js/exif-js) 获取到原图  Exif 信息后通过接口传给后台，这种方案没什么意思，接着看方案二。

##### 方案二
保存原图  Exif 信息，待图片压缩完成后，将原图  Exif 信息拼接到压缩图上。

由于传输的图片都是 base64 格式，这里提供一个网址可以查看 base64 图片的 exif 信息：http://code.ciaoca.com/javascript/exif-js/demo/base64

在方案一中，我提到了 Exif.js，不过遗憾的是它提供的只有读 Exif 信息的方法，没有写 Exif 信息的方法，所以想要实现 Exif 信息拼接就得手撸了，不过好在我找到了一篇相关文章：http://icaife.github.io/2015/05/19/js-compress-JPEG-width-exif/#more，里面的代码已经实现了这个功能，所以我准备直接修改 lrz 源码，使其可以额外输出一个带有 Exif 信息的 base64 压缩图。

拼接 Exif 的核心代码：

压缩原始 base64 图片：
```
// 原始 base64 图片，由于太长，这里省略展示
let orignBase64 = 'data:image/jpeg;base64,/9j/4QIMRXhpZgAATU0AKgAAAAgACQEAAAQAA 省略......'；;
let minBase64 = null; // 压缩图
let exif = null; // 存 Exif 信息

// 压缩使用的是 lrz 可自行在 github 上搜索
lrz(orignBase64, { width: 800})
.then(function (rst) {
    minBase64 = rst.base64;
})
.catch(function (err) {
})
```
取得 Exif 信息：
```
// 工具函数 将 base64 转 ArrayBuffer
function base64ToArrayBuffer(base64, contentType) {
    contentType = contentType || base64.match(/^data\:([^\;]+)\;base64,/mi)[1] || ''; // e.g. 'data:image/jpeg;base64,...' => 'image/jpeg'
    base64 = base64.replace(/^data\:([^\;]+)\;base64,/gmi, '');
    // btoa是binary to ascii，将binary的数据用ascii码表示，即Base64的编码过程
    // atob则是ascii to binary，用于将ascii码解析成binary数据
    var binary = atob(base64);
    // console.log(binary)
    var len = binary.length;
    var buffer = new ArrayBuffer(len);
    var view = new Uint8Array(buffer);
    for (var i = 0; i < len; i++) {
        view[i] = binary.charCodeAt(i);
    }
    return buffer;
}
// 将原始 base64 转换为 arrayBuffer
let orignBuffer = base64ToArrayBuffer(orignBase64);
// 调用 getSegments 获取 0xFFE0~0xFFEF 开头的应用标记片段
getSegments(orignBuffer);
```
这里给出标记的大致结构，下面的代码会用到：
标记开头 | 标记类型 | 标记大小 | 标记内容
- | - | - | -
0xff | 标记类型(1字节) | 数据大小(2字节) | 数据内容(n字节)

关于标记类型，可以在 [Exif.js](https://github.com/exif-js/exif-js/blob/master/exif.js) 的源码中找到，比如`图片宽度 ImageWidth 对应的标记是 0x0100`。
```
// 获取 0xFFE0~0xFFEF 开头的应用标记片段
function getSegments(arrayBuffer) {
    var head = 0, segments = [];
    var length, endPoint, seg;
    var arr = [].slice.call(new Uint8Array(arrayBuffer), 0);

    while (true) {
        // SOS(Start of Scan, 由 0xff 0xda 开头)
        // 遍历到 SOS 表示已经遍历完所有标记，再往下就是图像数据流了，直接 break
        if (arr[head] === 0xff && arr[head + 1] === 0xda) { break;}

        // SOI(Start of Image)是 JPG 文件的开头内容，由 0xff 0xd8 开头
        if (arr[head] === 0xff && arr[head + 1] === 0xd8) {
            head += 2;
        } 
        // 找出每个标记片段
        else {
            // 每个标记开头后跟着的两个字节记录了该标记所记录内容的长度
            length = arr[head + 2] * 256 + arr[head + 3]; // 内容长度
            endPoint = head + length + 2; // 内容结束位置
            // 从0xff开头，到标记数据内容结束全部截出来
            seg = arr.slice(head, endPoint);
            head = endPoint;
            // push整个标记信息
            segments.push(seg);
        }
        if (head > arr.length) {
            break;
        }
    }
    // console.warn('分割片段', segments);
    getEXIF(segments)
}
// 从标记片段筛选 & 取出 exif 信息
function getEXIF(segments) {
    if (!segments.length) { return []; }
    var seg = [];
    for (var x = 0; x < segments.length; x++) {
        var s = segments[x];
        // 0xff 0xe1开头的才是 exif数据(即app1)
        if (s[0] === 0xff && s[1] === 0xe1) { // app1 exif 0xff 0xe1
            seg = seg.concat(s);
        }
    }
    exif = seg;
}
```
拼接 Exif 到压缩后的 base64 中：
```
// 插入 Exif 信息
function insertEXIF(resizedImg, exifArr) {
    var arr = [].slice.call(new Uint8Array(resizedImg), 0);
    //不是标准的JPEG文件
    if (arr[2] !== 0xff || arr[3] !== 0xe0) {
        return resizedImg; 
    }
    var app0_length = arr[4] * 256 + arr[5]; //两个字节

    // 拼接文件 SOI + EXIF + 去除APP0的图像信息
    var newImg = [0xff, 0xd8].concat(exifArr, arr.slice(4 + app0_length)); 
    return new Uint8Array(newImg);
}

let minBuffer = base64ToArrayBuffer(minBase64);
let newImg = insertEXIF(minBuffer, exif);
console.log('最终输出图片', newImg)
```
把新生成的图片复制到 http://code.ciaoca.com/javascript/exif-js/demo/base64 可以看到 Exif 信息已经成功添加。

#### 二进制数组
上面有很多二进制文件操作，这里简单补充一些相关知识。

##### 二进制数组产生的原因
二进制数组产生的原因与WebGL项目有关，为的满足 JavaScript 与显卡之间大量的、实时的数据交换，这些通信的数据都得是二进制的。

##### ArrayBuffer 对象
ArrayBuffer 是内存中的一段二进制数据，无法直接操作，可使用 `视图（TypedArray、DataView）`提供的数组方法，操作内存，其作用是以指定格式解读二进制数据。

##### TypedArray 对象
用来生成内存的视图，通过9个构造函数，可以生成9种数据格式的视图。
```
Int8Array：8位有符号整数，长度1个字节。
Uint8Array：8位无符号整数，长度1个字节。
Uint8ClampedArray：8位无符号整数，长度1个字节，溢出处理不同。
Int16Array：16位有符号整数，长度2个字节。
Uint16Array：16位无符号整数，长度2个字节。
Int32Array：32位有符号整数，长度4个字节。
Uint32Array：32位无符号整数，长度4个字节。
Float32Array：32位浮点数，长度4个字节。
Float64Array：64位浮点数，长度8个字节。
```
TypedArray 指定数据格式读取整个 ArrayBuffer。
##### DataView 对象
用来生成内存的视图，可以自定义格式和字节序，同样支持9种数据类型，相较于 TypedArray 更加灵活，比如可以以不同的格式读取同一个 ArrayBuffer 上不同位置的数据。

##### Blob
Blob(binary large object)，二进制文件大对象，是存储二进制文件的“容器”。Blob构造函数接受两个参数，第一个参数是一个包含实际数据的数组，第二个参数是数据的MIME类型。
```
new Blob([data], {type: "application/octet-binary"})
```
与 ArrayBuffer 的区别：
- 它俩都能存二进制数据，但 Blob 储存量更大。
- Blob 可以设置数据的 MIME 类型。
- ArrayBuffer 表示原始的二进制数据，需要通过视图进行操作。
- Blob对象表示一个不可变、原始数据的类文件对象。

#### 参考
> https://www.cnblogs.com/peterYong/p/10959964.html
> https://blog.csdn.net/yyjsword/article/details/28876739
> http://icaife.github.io/2015/05/19/js-compress-JPEG-width-exif/#more
> http://javascript.ruanyifeng.com/stdlib/arraybuffer.html#toc2
> https://www.jianshu.com/p/54d878aa0237

