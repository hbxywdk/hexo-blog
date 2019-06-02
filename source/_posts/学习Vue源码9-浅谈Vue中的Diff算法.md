---
title: 学习Vue源码9-浅谈Vue中的Diff算法
date: 2019-05-06 18:46:26
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
3. nodeOps 封装了一些原生DOM操作方法，在platforms\web\runtime\node-ops.js中
```
// code...
export function createElementNS (namespace: string, tagName: string): Element {
  return document.createElementNS(namespaceMap[namespace], tagName)
}

export function createTextNode (text: string): Text {
  return document.createTextNode(text)
}

export function createComment (text: string): Comment {
  return document.createComment(text)
}

export function insertBefore (parentNode: Node, newNode: Node, referenceNode: Node) {
  parentNode.insertBefore(newNode, referenceNode)
}

export function removeChild (node: Node, child: Node) {
  node.removeChild(child)
}

export function appendChild (node: Node, child: Node) {
  node.appendChild(child)
}
// code...
```

#### patch
对比新、老vnode，进行最小程度的修改
  - 如果是`初始化`会传以下几个参数（core\instance\lifecycle.js）：
  - `vm.__patch__(vm.$el, vnode, hydrating, false)` 
  - // vm.$el 是要挂载到的DOM，vnode就是vnode，hydrating用于服务端渲染不用管，最后一个参数是removeOnly
  - 如果是`更新`会传两个参数
  - `vm.__patch__(prevVnode, vnode)` 
  - // prevVnode 是旧 vNode，vnode 是新 vNode
```
core\vdom\patch.js
return function patch (oldVnode, vnode, hydrating, removeOnly) {
  // vnode不存在，oldVnode存在，说明节点被移除了，直接调用销毁钩子
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

    // 👇根据 oldVnode 是否存在 nodeType 属性 来判断是否是一个真实DOM节点
    // 👇如果存在 nodeType 说明当前走的是 初始化 流程
    const isRealElement = isDef(oldVnode.nodeType)

    // 走update流程 且 是同一个节点，直接调用 patchVnode 方法
    if (!isRealElement && sameVnode(oldVnode, vnode)) {
      // 修补现有根节点
      patchVnode(oldVnode, vnode, insertedVnodeQueue, null, null, removeOnly)
    } 
    else {
      // oldVnode 是 真实节点，走 init 流程
      if (isRealElement) {
        // mounting to a real element
        // check if this is server-rendered content and if we can perform
        // a successful hydration.
        // Vnode在服务端渲染的一些处理，这里暂且不看
        // 如果oldVnode的是一个Element节点 && 存在服务端渲染的属性
        if (oldVnode.nodeType === 1 && oldVnode.hasAttribute(SSR_ATTR)) {
          // 则移除其SSR属性，再将hydrating设置为true
          oldVnode.removeAttribute(SSR_ATTR)
          hydrating = true
        }
        if (isTrue(hydrating)) {
          if (hydrate(oldVnode, vnode, insertedVnodeQueue)) {
            invokeInsertHook(vnode, insertedVnodeQueue, true)
            return oldVnode
          } else if (process.env.NODE_ENV !== 'production') {
            warn(
              'The client-side rendered virtual DOM tree is not matching ' +
              'server-rendered content. This is likely caused by incorrect ' +
              'HTML markup, for example nesting block-level elements inside ' +
              '<p>, or missing <tbody>. Bailing hydration and performing ' +
              'full client-side render.'
            )
          }
        }

        // either not server-rendered, or hydration failed.
        // create an empty node and replace it
        // 不是服务端渲染的话，且是初始化流程，把oldVnode替换为一个空的vNode
        oldVnode = emptyNodeAt(oldVnode)
      }

      // 当前节点与其父节点
      const oldElm = oldVnode.elm
      const parentElm = nodeOps.parentNode(oldElm)

      // 创建一个新的 node
      createElm(
        vnode,
        insertedVnodeQueue,
        // extremely rare edge case: do not insert if old element is in a
        // leaving transition. Only happens when combining transition +
        // keep-alive + HOCs. (#4590)
        oldElm._leaveCb ? null : parentElm,
        nodeOps.nextSibling(oldElm)
      )

      // update parent placeholder node element, recursively
      // 递归更新父节点占位节点元素
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
            // #6513
            // invoke insert hooks that may have been merged by create hooks.
            // e.g. for directives that uses the "inserted" hook.
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

      // 有父元素
      if (isDef(parentElm)) {
        removeVnodes(parentElm, [oldVnode], 0, 0)
      } 
      // 没有父元素触发销毁
      else if (isDef(oldVnode.tag)) {
        invokeDestroyHook(oldVnode)
      }
    }
  }

  invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch)
  return vnode.elm
}

```
patch 方法针对`初始化`与`更新`这两种情况做处理，
关于`初始化`与`更新`的判断：patch 函数的第一个参数传的如果是一个真实DOM，那么就会有nodeType属性，则是初始化。
如果是更新，且新旧两个vNode值得比较（即调用samevnode方法返回true，说明是同一个节点）则会调用 patchVnode 进一步比较。


#### patchVnode
修补vnode
```
function patchVnode ( oldVnode, vnode, insertedVnodeQueue, ownerArray, index, removeOnly ) {
  // 如果是同一个vnode return
  if (oldVnode === vnode) { return }
  if (isDef(vnode.elm) && isDef(ownerArray)) {
    // 克隆重用 vnode
    vnode = ownerArray[index] = cloneVNode(vnode)
  }

  // 设置 新vnode的elm 与 旧vnode.elm 相同（都为同一个DOM）
  const elm = vnode.elm = oldVnode.elm

  if (isTrue(oldVnode.isAsyncPlaceholder)) {
    if (isDef(vnode.asyncFactory.resolved)) {
      hydrate(oldVnode.elm, vnode, insertedVnodeQueue)
    } else {
      vnode.isAsyncPlaceholder = true
    }
    return
  }
  // 静态树重用元素
  if (isTrue(vnode.isStatic) &&
    isTrue(oldVnode.isStatic) &&
    vnode.key === oldVnode.key &&
    (isTrue(vnode.isCloned) || isTrue(vnode.isOnce))
  ) {
    vnode.componentInstance = oldVnode.componentInstance
    return
  }

  let i
  const data = vnode.data
  if (isDef(data) && isDef(i = data.hook) && isDef(i = i.prepatch)) {
    i(oldVnode, vnode)
  }

  const oldCh = oldVnode.children
  const ch = vnode.children
  if (isDef(data) && isPatchable(vnode)) {
    for (i = 0; i < cbs.update.length; ++i) cbs.update[i](oldVnode, vnode)
    if (isDef(i = data.hook) && isDef(i = i.update)) i(oldVnode, vnode)
  }
  if (isUndef(vnode.text)) {
    // 如果新旧 vNode都有 children 则调用 updateChildren 方法来对比他俩的 children
    if (isDef(oldCh) && isDef(ch)) {
      if (oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue, removeOnly)
    } else if (isDef(ch)) {
      if (process.env.NODE_ENV !== 'production') {
        checkDuplicateKeys(ch)
      }
      if (isDef(oldVnode.text)) nodeOps.setTextContent(elm, '')
      addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue)
    } else if (isDef(oldCh)) {
      removeVnodes(elm, oldCh, 0, oldCh.length - 1)
    } else if (isDef(oldVnode.text)) {
      nodeOps.setTextContent(elm, '')
    }
  } else if (oldVnode.text !== vnode.text) {
    nodeOps.setTextContent(elm, vnode.text)
  }
  if (isDef(data)) {
    if (isDef(i = data.hook) && isDef(i = i.postpatch)) i(oldVnode, vnode)
  }
}
```
这里主要看这段：
```
if (isDef(oldCh) && isDef(ch)) {
  if (oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue, removeOnly)
} 
```
1. 如果 oldVnode 与 vNode 都有 children 则调用 `updateChildren` 方法来对比他俩的 children，
在 updateChildren 方法中就会用到 `Diff算法` 来对比、更新节点，同时再 updateChildren 中也会调用 patchVnode 继续对比下一级子节点。
2. 如果oldVnode 没有 children，而 vNode 有，则调用 addVnode 方法，添加所有的 children。
3. 如果 oldVnode 有 children，而 vNode 有，则调用 removeVnode 方法，移除原有的 children。
4. 如果 oldVnode 与 vNode 都是文本节点，则会用 vNode 的文本替换 oldVnode 的文本。

#### updateChildren
这个方法是 diff 算法的核心：
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
![diff3](https://raw.githubusercontent.com/hbxywdk/hexo-blog/master/assets/2019-04/diff3.jpg)

1. oldStartVnode, newStartVnode相同的情况：
执行patchVnode方法
oldStartVnode与newStartVnode都前进一格
完成这些操作就变成了下图这样：
![diff4](https://raw.githubusercontent.com/hbxywdk/hexo-blog/master/assets/2019-04/diff4.jpg)

2. oldEndVnode, newEndVnode相同的情况：
执行patchVnode方法
oldEndVnode与newEndVnode都后退一格
完成这些操作就变成了下图这样：
![diff5](https://raw.githubusercontent.com/hbxywdk/hexo-blog/master/assets/2019-04/diff5.jpg)

3. oldStartVnode, newEndVnode相同的情况：
这种情况下意味着当前 `旧Lists的StartIdx位置的元素`，在`新Lists中`被挪到了`EndIdx位置`（Vnode moved right）
在执行完patchVnode方法之后，在`真实DOM中`我们还要将 `oldStart 插到 oldEnd之后`
oldStartVnode前进一格
newEndVnode后退一格
![diff6](https://raw.githubusercontent.com/hbxywdk/hexo-blog/master/assets/2019-04/diff6.jpg)

4. oldEndVnode, newStartVnode相同的情况：
这种情况下意味着当前 `旧Lists的EndIdx位置的元素`，在`新Lists中`被挪到了`StartIdx位置`（Vnode moved left）
在执行完patchVnode方法之后，在`真实DOM中`我们还要将 `oldEnd 插到 oldStart之前`
newStartVnode前进一格
oldEndVnode后退一格
![diff7](https://raw.githubusercontent.com/hbxywdk/hexo-blog/master/assets/2019-04/diff7.jpg)

`ELSE！`如果上面四种情况都比对不中，也是就出现下图的情况：
![diff8](https://raw.githubusercontent.com/hbxywdk/hexo-blog/master/assets/2019-04/diff8.jpg)

则会执行 `createKeyToOldIdx` 方法，
```
function createKeyToOldIdx (children, beginIdx, endIdx) {
  let i, key
  const map = {}
  for (i = beginIdx; i <= endIdx; ++i) {
    key = children[i].key
    if (isDef(key)) map[key] = i
  }
  return map
}
```
返回一个 哈希表(obj)，各项 键为 vnode 的 key属性，值为 vnode 的下标
哈希表中的内容包含处于 oldStart 至 oldEnd 的 vnode，大概长这样：
```
{
  vnodeKeyA: 1,
  vnodeKeyC: 2,
  vnodeKeyD: 3
}
```
接着从哈希表中寻找是否有与newStartVnode`一致key`的oldVNode节点
接着看下面第5条：

5. 我们在哈希表中找到了oldVnode节点：
```
vnodeToMove = oldCh[idxInOld] // 这个就是我们找到的`旧的vnode`
```
这里还分了两种情况
- 一、`光比较key，肯定不足以判断两个vnode相同`，我着这里再调用sameVnode(vnodeToMove, newStartVnode)方法来对比
如果相同：
执行patchVnode
oldCh[idxInOld]赋undefined // oldCh[idxInOld] = undefined ，我们已经用vnodeToMove保存了一份了
然后在`真实DOM中`，`把vnodeToMove插入到oldStart之前`
newStartVnode都前进一格
放代码把：
```
vnodeToMove = oldCh[idxInOld]
if (sameVnode(vnodeToMove, newStartVnode)) {
  patchVnode(vnodeToMove, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
  oldCh[idxInOld] = undefined
  canMove && nodeOps.insertBefore(parentElm, vnodeToMove.elm, oldStartVnode.elm)
} else {}
```
![diff9](https://raw.githubusercontent.com/hbxywdk/hexo-blog/master/assets/2019-04/diff9.jpg)

- 二、key相同，但sameVnode比较出来不相同
这种情况下则调用createElm创建一个新的元素插到oldStart前面
newStartVnode都前进一格
![diff10](https://raw.githubusercontent.com/hbxywdk/hexo-blog/master/assets/2019-04/diff10.jpg)

6. 我们在哈希表中！！！没有找到oldVnode！！！节点：
这种情况下和 5 中的第二种情况一模一样
调用createElm创建一个新的元素插到oldStart前面
newStartVnode都前进一格

7. 到了这一步，while已经循环完毕了，接下来要处理新旧List长短不相同的情况
- 一、oldStartIdx > oldEndIdx，oldStart 超过了oldEnd，说明`新List比旧Lists长`
我们需要把没遍历到的vnode选出来，用refElm存一下，然后啊，使用addVnodes批量调用创建（createElm）把这些vnode加到真实DOM中
```
if (oldStartIdx > oldEndIdx) {
  refElm = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm
  addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx, insertedVnodeQueue)
}
```
![diff11](https://raw.githubusercontent.com/hbxywdk/hexo-blog/master/assets/2019-04/diff11.jpg)

- 二、newStartIdx > newEndIdx，说明`旧List比新Lists长`
我们调用removeVnodes方法，参数包含oldStartIdx 与 oldEndIdx，把多余的删掉
```
if{
  // code...
}
else if (newStartIdx > newEndIdx) {
  removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx)
}
```
![diff12](https://raw.githubusercontent.com/hbxywdk/hexo-blog/master/assets/2019-04/diff12.jpg)


### 参考
> [高频dom操作和页面性能优化探索](https://blog.csdn.net/u013929284/article/details/56483035)
> [React’s diff algorithm](https://calendar.perfplanet.com/2013/diff/)
> https://github.com/answershuto/learnVue