---
title: 浅谈Vue中的Diff算法
date: 2019-04-30 11:46:26
summary: 
desc: 
tag: 
category: Vue
---
### 虚拟DOM
#### 操作DOM的代价
`操作DOM的代价很高`，影响页面性能的主要问题有以下几点：

- 访问和修改DOM元素
- 修改DOM元素的样式，导致`重绘`或`重排`
- 通过对DOM元素的事件处理，完成与用户的交互功能

`DOM的修改会导致重绘或重排`
- 重绘：重绘是指一些样式的修改，元素的位置和大小都没有改变，浏览器会根据元素的新属性重新绘制，使元素呈现新的外观。
- 重排/回流：是指元素的位置或尺寸发生了变化，浏览器需要重新计算渲染树，而新的渲染树建立后，浏览器会重新绘制页面。

`重绘相对于重排还好一些，重绘仅仅改变变化元素的样式即可，但重排（回流）则会重新计算所有元素之间的位置关系然后重新绘制元素`<br>
`如果频繁操作DOM，其必然带来性能变低，浏览器卡慢`

#### 为何需要虚拟DOM？
接下来，我们看一下真实的DOM元素，我们打开某度的首页，在控制台输入以下代码：
```
var dom1 = document.querySelectorAll('div')[0]
for ( let x in dom1 ) {
  console.log(x)
}
```
可以看到一个div下其实是有很多属性的：
```
align
title
lang
translate
dir
dataset
hidden
tabIndex
accessKey
draggable
spellcheck
autocapitalize
contentEditable
isContentEditable
......等上百个
```
一个DOM拥有这么多属性，这也是带来性能问题的原因之一，撇开我们用不上的属性，我们其实可以`使用js来模拟一个仅保留我们需要的属性的DOM`，这样的模拟DOM其实就是`虚拟DOM`。<br>
比如我们可以用以下代码模拟一个内容为'Hello Word'，id名与class名为test的div元素：
```
{
  tag: 'div',
  id: 'test',
  className: 'test'
  text: 'Hello Word'
}
```

Vue、React都使用了虚拟DOM技术，让新、旧DOM的变化对比在Js层完成，最后仅修改变化了的DOM，直接避免了频繁操作DOM的情况，大大提升页面性能。

### Vnode
Vnode就是虚拟DOM技术在Vue中的实现，它的源码在[这里](https://github.com/vuejs/vue/blob/dev/src/core/vdom/vnode.js)，它在模拟DOM的情况下又添加了很多框架本身需要的属性。
```
export default class VNode {
  tag: string | void;
  data: VNodeData | void;
  children: ?Array<VNode>;
  text: string | void;
  elm: Node | void;
  ns: string | void;
  context: Component | void; // rendered in this component's scope
  key: string | number | void;
  componentOptions: VNodeComponentOptions | void;
  componentInstance: Component | void; // component instance
  parent: VNode | void; // component placeholder node

  // code...
}
```
有了虚拟DOM那么就要有对比新、旧虚拟DOM的变化算法，这种算法就叫Diff算法：

### Diff算法
#### Diff算法同级比较
求两个任意树之间的最小修改是一个时间复杂度为O(n^3)问题。这样的时间复杂度是我们无法接受的。
在Web应用中将组件移动到树中的不同级别是非常罕见的，通常只在孩子中间横向移动。
所以Diff算法采用的是`同级比较`，将算法的时间复杂度降低到了O(N)，这大大降低了复杂性，同时也不会造成很大损失，正如下图所示：

![同级比较](diff1.png)

所以如果我们进行了跨级别的组件移动操作，实际上是会先删除DOM，再在对应的层级上新建一个DOM。

#### 循环中为何需要key属性？
我们看这张图：

![为何需要key](diff1.png)

如果我们循环生成了5个组件，然后我们又插入了一个新的同类组件，对于我们来说将很难知道如何在两个组件Lists中建立映射，所以就会变成上图左侧中按顺序一一建立关联。
如果有了key的存在情况则大不一样，它能很容易的帮助代码解决映射问题，让代码在正确的地方进行正确的操作，这对代码的性能提升也有很大的帮助。



### 参考
> [高频dom操作和页面性能优化探索](https://blog.csdn.net/u013929284/article/details/56483035)
> [React’s diff algorithm](https://calendar.perfplanet.com/2013/diff/)