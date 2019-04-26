---
title: 实现一个Promise
date: 2019-04-26 17:50:11
summary: 
desc: 
tag: 
category: Js
---

### 先实现一个简易版Promise
详细的注释都写在代码里了。
```
// 定义三种状态，pending可以向其他两个状态转换，但是一旦转换将不可再更改
const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'
/**
 * 
 * @param {Function} fn Promise要执行的函数
 */
function MyPromise(fn) {
  var self = this // 保存一份this
  self.status = PENDING // 默认为pending状态
  self.value = null // Promise 的 value 值
  self.fulfillCallback = [] // 成功回调
  self.rejectCallback = [] // 失败回调

  // resolve方法
  function resolve(value) {
    // 只有在pending状态时才会执行
    if (self.status === PENDING) {
      // 修改为对应状态
      self.status = FULFILLED
      // 修改对应状态的 value
      self.value = value
      // 执行所有回调
      self.fulfillCallback.map(cb => cb(self.value))
    }
  }
  // reject方法
  function reject(reason) {
    if (self.status === PENDING) {
      self.status = REJECTED
      self.value = reason
      self.rejectCallback.map(cb => cb(self.value))
    }
  }

  // fn要传入 resolve 与 reject 然后直接执行的，我们要捕获一下异常，如果存在异常直接执行reject
  try {
    fn(resolve, reject)
  } catch (e) {
    reject(e)
  }
}

/**
 * @param {Function} onFulfilled // 成功callback
 * @param {Function} onRejected // 失败callback
 */
MyPromise.prototype.then = function (onFulfilled, onRejected) {
  // 处理不传参数的情况
  onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : val => val
  onRejected = typeof onRejected === 'function' ? onRejected : err => { throw err }

  // pending状态下保存callbacks
  if (this.status === PENDING) {
    this.fulfillCallback.push(onFulfilled)
    this.rejectCallback.push(onRejected)
  }
  // 状态如果已经成功则执行入参 onFulfilled
  if (this.status === FULFILLED) {
    onFulfilled(this.value)
  }
  // 状态如果已经失败则执行入参 onRejected
  if (this.status === REJECTED) {
    onRejected(this.value)
  }
}
```

#### 测试一下，可以看到两秒后弹出了'啦啦啦'
```
new MyPromise(function (resolve, reject) {
  setTimeout(() => {
    resolve('啦啦啦')
  }, 2000)
})
.then(function (val) {
  alert(val)
})
```

### 实现符合Promise/A+规范的Promise
实现了简单的Promise当然不够，接下来我们要补全我们的Promise，让其符合[Promise/A+规范](https://promisesaplus.com/)，中文版的：[Promise/A+规范](http://www.ituring.com.cn/article/66566)。

首先我们梳理一下有哪些点需要完善的：
1. then必须返回一个Promise(then must return a promise)，包括后面的一系列实现
2. onFulfilled 和 onRejected 只有在执行环境堆栈仅包含平台代码时才可被调用 (onFulfilled or onRejected must not be called until the execution context stack contains only platform code. [[3.1]](https://promisesaplus.com/#notes)) 。注解3.1中大概是说onFulfilled 和 onRejected 方法需要异步执行，且应该在 then 方法被调用的那一轮事件循环之后的新执行栈中执行，所以我们要用setTimeout把这两个方法包起来。
3. 最关键的是缺少`承诺解决程序`([2.3 The Promise Resolution Procedure](https://promisesaplus.com/#the-promise-resolution-procedure))
4. ......

### 未完待续