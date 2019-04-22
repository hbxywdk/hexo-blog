---
title: 学习Vue源码6
date: 2019-04-22 11:49:10
summary: 
desc: 
tag: 
category: Vue
---

#### nextTick的实现原理 core/util/next-tick.js

作用：Vue的DOM更新是异步的，nextTick可以让我们在下次DOM更新后，拿到更新后的DOM。

原理（Vue版本2.6.8）： 

四套方案：
1. Promise
2. MutationObserver
3. setImmediate
4. setTimeout

依据运行环境的支持度，层层降级，最后的方案是都支持的 setTimeout

源码如下：
```
import { noop } from 'shared/util'
import { handleError } from './error'
import { isIE, isIOS, isNative } from './env'

export let isUsingMicroTask = false

// 用于存放要执行的callback lists
const callbacks = []
// 状态flag
let pending = false

// 这个函数会将所有点饿callback拿出来执行
function flushCallbacks () {
  pending = false
  const copies = callbacks.slice(0)
  callbacks.length = 0
  for (let i = 0; i < copies.length; i++) {
    copies[i]()
  }
}

// 定义一个定时器方法变量，在下面的代码中会根据运行环境的不同赋予其不同的值
let timerFunc

if (typeof Promise !== 'undefined' && isNative(Promise)) {
  // 1.优先使用 Promise
  const p = Promise.resolve()
  timerFunc = () => {
    p.then(flushCallbacks)
    if (isIOS) setTimeout(noop)
  }
  isUsingMicroTask = true
} else if (!isIE && typeof MutationObserver !== 'undefined' && (
  isNative(MutationObserver) ||
  // PhantomJS and iOS 7.x
  MutationObserver.toString() === '[object MutationObserverConstructor]'
)) {
  // 2.次选方案 MutationObserver，其提供了监视对DOM树所做更改的能力
  let counter = 1
  const observer = new MutationObserver(flushCallbacks)
  const textNode = document.createTextNode(String(counter))
  observer.observe(textNode, {
    characterData: true
  })
  timerFunc = () => {
    counter = (counter + 1) % 2
    textNode.data = String(counter)
  }
  isUsingMicroTask = true
} else if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
  // 3.降级方案 setImmediate，其优于 setTimeout
  timerFunc = () => {
    setImmediate(flushCallbacks)
  }
} else {
  // 4.如果以上都不支持，则最终会使用 setTimeout
  timerFunc = () => {
    setTimeout(flushCallbacks, 0)
  }
}

export function nextTick (cb?: Function, ctx?: Object) {
  let _resolve
  
  callbacks.push(() => {
    if (cb) {
      try {
        cb.call(ctx)
      } catch (e) {
        handleError(e, ctx, 'nextTick')
      }
    } else if (_resolve) {
      _resolve(ctx)
    }
  })
  // pending为false就直接执行timerFunc
  if (!pending) {
    pending = true
    timerFunc()
  }
  // $flow-disable-line
  if (!cb && typeof Promise !== 'undefined') {
    return new Promise(resolve => {
      _resolve = resolve
    })
  }
}

```