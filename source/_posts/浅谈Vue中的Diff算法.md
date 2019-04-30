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

![同级比较](https://raw.githubusercontent.com/hbxywdk/hexo-blog/master/assets/2019-04/diff1.png)

所以如果我们进行了跨级别的组件移动操作，实际上是会先删除DOM，再在对应的层级上新建一个DOM。

#### 循环中为何需要key属性？
我们看这张图：

![为何需要key](https://raw.githubusercontent.com/hbxywdk/hexo-blog/master/assets/2019-04/diff2.png)

如果我们循环生成了5个组件，然后我们又插入了一个新的同类组件，对于我们来说很难知道如何在两个组件Lists中建立映射，所以就会变成上图左侧所示，按顺序一一建立关联。
如果有了key的存在情况则大不一样，它能很容易的帮助代码解决映射问题，让代码在正确的地方进行正确的操作，这对代码的性能提升也有很大的帮助。

#### 简单分析Diff算法
我们以Vue（v2.6.8）代码为例，代码位置在[src/core/vdom/patch.js](https://github.com/vuejs/vue/blob/dev/src/core/vdom/patch.js)中。

首先我们先明确几个方法：
1. 工具方法isUndef、isDef等：
```
// 判断v是否是undefined或null
export function isUndef (v: any): boolean %checks {
  return v === undefined || v === null
}
// 判断v是否不是undefined或null
export function isDef (v: any): boolean %checks {
  return v !== undefined && v !== null
}
// 其他工具方法可以自行查看
```
2. sameVnode：
```
// 判断是否是同一个Vnode
function sameVnode (a, b) {
  return (
    a.key === b.key && (
      (
        a.tag === b.tag &&
        a.isComment === b.isComment &&
        isDef(a.data) === isDef(b.data) &&
        sameInputType(a, b)
      ) || (
        isTrue(a.isAsyncPlaceholder) &&
        a.asyncFactory === b.asyncFactory &&
        isUndef(b.asyncFactory.error)
      )
    )
  )
}
```
3. patch：对比新、老vnode，进行最小程度的修改（未完成）
```
  function patch (oldVnode, vnode, hydrating, removeOnly) {
    // vnode不存在则调用oldVnode的销毁钩子
    if (isUndef(vnode)) {
      if (isDef(oldVnode)) invokeDestroyHook(oldVnode)
      return
    }

    let isInitialPatch = false
    const insertedVnodeQueue = []
    // 如果oldVnode不存在的话，就新建一个根节点
    if (isUndef(oldVnode)) {
      // empty mount (likely as component), create new root element
      isInitialPatch = true
      createElm(vnode, insertedVnodeQueue)
    } else {
      const isRealElement = isDef(oldVnode.nodeType) // oldVnode是否是一个真的节点，存在nodeType属性
      // 是同一个节点，就开始修补现有节点
      if (!isRealElement && sameVnode(oldVnode, vnode)) {
        // 修补现有根节点
        patchVnode(oldVnode, vnode, insertedVnodeQueue, null, null, removeOnly)
      } else {
        if (isRealElement) {
          // Vnode在服务端渲染的一些处理
          // code...
        }

        // 替换现有元素
        const oldElm = oldVnode.elm
        const parentElm = nodeOps.parentNode(oldElm)

        // 创建一个新的 node
        createElm(
          vnode,
          insertedVnodeQueue,
          oldElm._leaveCb ? null : parentElm,
          nodeOps.nextSibling(oldElm)
        )

        // update parent placeholder node element, recursively
        if (isDef(vnode.parent)) {
          let ancestor = vnode.parent
          const patchable = isPatchable(vnode)
          while (ancestor) {
            for (let i = 0; i < cbs.destroy.length; ++i) {
              cbs.destroy[i](ancestor)
            }
            ancestor.elm = vnode.elm
            if (patchable) {
              for (let i = 0; i < cbs.create.length; ++i) {
                cbs.create[i](emptyNode, ancestor)
              }
              const insert = ancestor.data.hook.insert
              if (insert.merged) {
                // start at index 1 to avoid re-invoking component mounted hook
                for (let i = 1; i < insert.fns.length; i++) {
                  insert.fns[i]()
                }
              }
            } else {
              registerRef(ancestor)
            }
            ancestor = ancestor.parent
          }
        }

        // 销毁老节点
        if (isDef(parentElm)) {
          removeVnodes(parentElm, [oldVnode], 0, 0)
        } else if (isDef(oldVnode.tag)) {
          invokeDestroyHook(oldVnode)
        }
      }
    }

    invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch)
    return vnode.elm
  }
}

```
4. patchVnode：修补vnode（未完成）
```
// 当新旧vnode都有子节点时，则会进入updateChildren方法对比子节点
```
#### updateChildren
```
  function updateChildren (parentElm, oldCh, newCh, insertedVnodeQueue, removeOnly) {
    let oldStartIdx = 0 // 旧list起始索引
    let newStartIdx = 0 // 新list起始索引
    let oldEndIdx = oldCh.length - 1 // 旧list结尾索引
    let oldStartVnode = oldCh[0] // 旧的起始vnode初始赋值为list的第一个
    let oldEndVnode = oldCh[oldEndIdx] // 旧的结尾vnode初始赋值为list的最后一个
    let newEndIdx = newCh.length - 1 // 新list结尾索引
    let newStartVnode = newCh[0] // 旧的起始vnode初始赋值为list的第一个
    let newEndVnode = newCh[newEndIdx] // 旧的结尾vnode初始赋值为list的最后一个
    /**
     * 变量定义
     * oldKeyToIdx要存一个哈希表，存放的内容是oldVnode的key
     * idxInOld会存放根据哈希表中的key找到的对应oldVnode
     * vnodeToMove我们要移动的vnode
     * refElm就到下面去看注释把
     */    
    let oldKeyToIdx, idxInOld, vnodeToMove, refElm

    // removeOnly是一个用于<transition-group>的特殊的flag
    // 以保证移除有过渡效果的的元素时保持它正确的定位
    const canMove = !removeOnly

    if (process.env.NODE_ENV !== 'production') {
      checkDuplicateKeys(newCh)
    }

    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {

      // oldStartVnode不存在，则将oldStartVnode赋值为下一个vnode
      if (isUndef(oldStartVnode)) {
        oldStartVnode = oldCh[++oldStartIdx] // Vnode has been moved left

      // oldEndVnode不存在则将oldEndVnode赋值为上一个vnode
      } else if (isUndef(oldEndVnode)) {
        oldEndVnode = oldCh[--oldEndIdx]

      // 如果oldStartVnode, newStartVnode为同一个vnode，直接去patchVnode（打补丁）
      // 然后，新旧startVnode各向前前进一格
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
        oldStartVnode = oldCh[++oldStartIdx]
        newStartVnode = newCh[++newStartIdx]

      // 如果oldEndVnode, newEndVnode为同一个vnode，直接去patchVnode（打补丁）
      // 然后，新旧endVnode各向后后退一格
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx)
        oldEndVnode = oldCh[--oldEndIdx]
        newEndVnode = newCh[--newEndIdx]

      // 如果oldStartVnode, newEndVnode为同一个vnode（vnode被移动到右边去了）
      // oldStartVnode前进一格
      // newEndVnode后退一格
      } else if (sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx)
        canMove && nodeOps.insertBefore(parentElm, oldStartVnode.elm, nodeOps.nextSibling(oldEndVnode.elm))
        oldStartVnode = oldCh[++oldStartIdx]
        newEndVnode = newCh[--newEndIdx]

      // 如果oldEndVnode, newStartVnode是同一个vnode，说明vnode被移到左边去了
      // newStartVnode前进一格
      // oldEndVnode后退一格
      } else if (sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
        canMove && nodeOps.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm)
        oldEndVnode = oldCh[--oldEndIdx]
        newStartVnode = newCh[++newStartIdx]

      // 最后，所有的对比不上
      } else {

        if (isUndef(oldKeyToIdx)) oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx)
        // 创建了一个哈希表，其存放的内容是old vnode的key
        idxInOld = isDef(newStartVnode.key) ? oldKeyToIdx[newStartVnode.key] : findIdxInOld(newStartVnode, oldCh, oldStartIdx, oldEndIdx)
        // old vnode的哈希表中找不到，则说明是新元素啊，这里就新建一个元素
        if (isUndef(idxInOld)) { // New element 新加进来的元素
          createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx)
        // else 就是找到啦，
        } else {
          // 这个就是我们找到的和 newVnode的startIndex 索引相同的 oldVnode，我们要把它移到当前的oldStartVnode的前面去
          vnodeToMove = oldCh[idxInOld]
          if (sameVnode(vnodeToMove, newStartVnode)) {
            patchVnode(vnodeToMove, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
            oldCh[idxInOld] = undefined
            canMove && nodeOps.insertBefore(parentElm, vnodeToMove.elm, oldStartVnode.elm)
          } else {
            // same key but different element. treat as new element
            // 不过呢，万一key相同，但是通过sameVnode方法比较出来的结果是不相同，则new一个元素，插到当前的oldStartVnode的前面去
            createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx)
          }
        }
        newStartVnode = newCh[++newStartIdx]
      }
    }
    // 这里就循环完毕啦
    // 但是如果这里发现 oldStartIdx > oldEndIdx 说明，有新增的元素
    // 我们把它们选出来，用refElm存一下，然后啊，使用addVnodes批量调用创建（createElm）把这些vnode加到真实DOM中
    if (oldStartIdx > oldEndIdx) {
      refElm = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm
      addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx, insertedVnodeQueue)
    // else呢，说明新的vnodes比老的少
    // 我们调用removeVnodes方法，参数包含oldStartIdx 与 oldEndIdx，把不要的删掉嘛
    } else if (newStartIdx > newEndIdx) {
      removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx)
    }
  }
```

updateChildren的代码中呢，主要是一个while循环，新旧Lists中无论哪一个先循环完都会退出循环
```
while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
  // code...
}

// oldStartIdx > oldEndIdx，新Lists中新增了某些元素
if (oldStartIdx > oldEndIdx) {
  // addVnodes操作
  // code...
}
// else说明新Lists中移除了某些元素
else if (newStartIdx > newEndIdx) {
  // removeVnodes操作
  // code...
}
```
直接看源码感觉头都炸了，这里通过画图的方式会更合适一些。
`注意：以下每张图之间没有联系`

首先会在新旧Lists的头尾定义各定义一个标记，分别为：oldStartIdx，oldEndIdx，newStartIdx，newEndIdx，用图表示是这个样子：
![diff-pic1](https://raw.githubusercontent.com/hbxywdk/hexo-blog/master/assets/2019-04/diff3.jpg)

1. oldStartVnode, newStartVnode相同的情况：
执行patchVnode方法
oldStartVnode与newStartVnode都前进一格
完成这些操作就变成了下图这样：
![diff-pic1](https://raw.githubusercontent.com/hbxywdk/hexo-blog/master/assets/2019-04/diff4.jpg)

2. oldEndVnode, newEndVnode相同的情况：
执行patchVnode方法
oldEndVnode与newEndVnode都后退一格
完成这些操作就变成了下图这样：
![diff-pic2](https://raw.githubusercontent.com/hbxywdk/hexo-blog/master/assets/2019-04/diff5.jpg)

3. oldStartVnode, newEndVnode相同的情况：
这种情况下意味着当前 `旧Lists的StartIdx位置的元素`，在`新Lists中`被挪到了`EndIdx位置`（Vnode moved right）
在执行完patchVnode方法之后，在真实DOM中我们还要将 `oldStart 插到 oldEnd之后`
![diff-pic3](https://raw.githubusercontent.com/hbxywdk/hexo-blog/master/assets/2019-04/diff6.jpg)

4. oldEndVnode, newStartVnode相同的情况：
这种情况下意味着当前 `旧Lists的EndIdx位置的元素`，在`新Lists中`被挪到了`StartIdx位置`（Vnode moved left）
在执行完patchVnode方法之后，在真实DOM中我们还要将 `oldEnd 插到 oldStart之前`
![diff-pic3](https://raw.githubusercontent.com/hbxywdk/hexo-blog/master/assets/2019-04/diff6.jpg)

### 参考
> [高频dom操作和页面性能优化探索](https://blog.csdn.net/u013929284/article/details/56483035)
> [React’s diff algorithm](https://calendar.perfplanet.com/2013/diff/)
> https://github.com/answershuto/learnVue