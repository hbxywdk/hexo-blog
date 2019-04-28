---
title: 实现一个Promise
date: 2019-04-28 11:50:11
summary: 
desc: 
tag: 
category: Js
---
### 先实现一个简易版Promise
既然是简易版直接看在代码里的注释就可以了。
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
  let self = this // 保存一份this
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

  // fn要传入 resolve 与 reject 然后'直接执行'，我们要捕获一下异常，如果存在异常直接执行reject
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
实现了简易的Promise当然不够，接下来我们要补全我们的Promise，让其符合[Promise/A+规范](https://promisesaplus.com/)，中文版的：[Promise/A+规范](http://www.ituring.com.cn/article/66566)。

首先我们大致梳理一下有哪些点需要完善的：
1. then必须返回一个Promise，使其可以继续then下去(then must return a promise)
2. onFulfilled 和 onRejected 只有在执行环境堆栈仅包含平台代码时才可被调用 (onFulfilled or onRejected must not be called until the execution context stack contains only platform code. [[3.1]](https://promisesaplus.com/#notes)) 。注解3.1中大概是说onFulfilled 和 onRejected 方法需要异步执行，且应该在 then 方法被调用的那一轮事件循环之后的新执行栈中执行，所以我们要用setTimeout把这两个方法包起来。
3. 最关键的是缺少`承诺解决程序`([2.3 The Promise Resolution Procedure](https://promisesaplus.com/#the-promise-resolution-procedure))，可以理解为处理then之后如何继续then（下面的代码块有详细注释）

### 先给then返回Promise
对MyPromise.prototype.then方法进行修改：
```
MyPromise.prototype.then = function (onFulfilled, onRejected) {
  // 处理不传参数的情况
  onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : val => val
  onRejected = typeof onRejected === 'function' ? onRejected : err => { throw err }

  let self = this
  let backPromise // 要返回的Promose
  return backPromise = new MyPromise(function(resolve, reject) {
    // pending状态下保存callbacks
    if (self.status === PENDING) {
      self.fulfillCallback.push(onFulfilled)
      self.rejectCallback.push(onRejected)
      resolvePromise()
    }
    // 状态如果已经成功则执行入参 onFulfilled
    else if (self.status === FULFILLED) {
      onFulfilled(self.value) // 1️⃣
      resolvePromise()
    }
    // 状态如果已经失败则执行入参 onRejected
    else if (self.status === REJECTED) {
      onRejected(self.value) // 2️⃣
      resolvePromise()
    }
  })

}
/*
（x指的是onFulfilled1️⃣, onRejected2️⃣的返回值）
resolvePromise处理then之后的Promise，这块要处理的问题比较复杂，
包括then中返回的Promise是否与x相等啊、
then中用户是否自己又返回了一个Promise啊（x 为 Promise）
x 为对象或函数啦
我们这里先把这个函数空着
*/
function resolvePromise() {
  
}
```

### 使用setTimeout包裹 onFulfilled 和 onRejected 方法，使其异步执行
> This can be implemented with either a “macro-task” mechanism such as setTimeout or setImmediate, or with a “micro-task” mechanism such as MutationObserver or process.nextTick.
 
使用setTimeout包裹之后：
 ```
MyPromise.prototype.then = function (onFulfilled, onRejected) {
  // 处理不传参数的情况
  onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : val => val
  onRejected = typeof onRejected === 'function' ? onRejected : err => { throw err }

  let self = this
  let backPromise // 要返回的Promose
  return backPromise = new MyPromise(function(resolve, reject) {
    // pending状态下保存callbacks
    if (self.status === PENDING) {
      self.fulfillCallback.push(() => {
        setTimeout(() => {
          try {
            let x = onFulfilled(self.value)
            resolvePromise(backPromise, x, resolve, reject)
          } catch (e) {
            reject(e)
          }
        }, 0)
      })
      self.rejectCallback.push(() => {
        setTimeout(() => {
          try {
            let x = onRejected(self.value)
            resolvePromise(backPromise, x, resolve, reject)
          } catch (e) {
            reject(e)
          }
        }, 0)
      })
      resolvePromise()
    }
    // 状态如果已经成功则执行入参 onFulfilled
    else if (self.status === FULFILLED) {
      setTimeout(() => {
        try {
          let x = onFulfilled(self.value) // 2️⃣
          resolvePromise(backPromise, x, resolve, reject)
        } catch (e) {
          reject(e)
        }
      }, 0)
    }
    // 状态如果已经失败则执行入参 onRejected
    else if (self.status === REJECTED) {
      setTimeout(() => {
        try {
          let x = onRejected(self.value) // 2️⃣
          resolvePromise(backPromise, x, resolve, reject)
        } catch (e) {
          reject(e)
        }
      }, 0)

    }
  })

}

// 我们这里先把这个函数空着
function resolvePromise(backPromise, x, resolve, reject) {
}
 ```

### 最后一步，也是最麻烦的一步，补全resolvePromise函数
#### 如果 promise 和 x 指向同一对象，则抛出错误，这样可以避免循环引用
 ```
function resolvePromise(backPromise, x, resolve, reject) {
  let self = this
  let typeString = val => Object.prototype.toString.call(val)

  // 规范2.3.1：如果 promise 和 x 指向同一对象，以 TypeError 为据因拒绝执行 promise
  if (backPromise === x) {
    reject(new TypeError('backPromise and x should not be the same'))
  }
}
 ```
#### x 为 Promise
这个其实不用判断也可以，这里跳过。

#### x为对象或者函数
大概是这样一个结构：
 ```
  // 先判断x是否为对象或者函数
  if (typeString(x) === '[object Object]' || typeString(x) === '[object Function]') {


    // code...


  } else {
    // 规范 2.3.4：如果 x 不为对象或者函数，以 x 为参数执行 promise
    resolve(x)
  }
 ```

 继续：
 ```
  // 先判断x是否为对象或者函数
  if (typeString(x) === '[object Object]' || typeString(x) === '[object Function]') {

    // ----------------------------------------------- 分割线 -----------------------------------------------
    // 定义一个hasUsed用于规范2.3.3.3.3：如果 resolvePromise 和 rejectPromise 均被调用，
    // 或者被同一参数调用了多次，则优先采用首次调用并忽略剩下的调用

    let hasUsed

    try {
      // 规范 2.3.3.1：把 x.then 赋值给 then
      let then = x.then
      if (typeof then === 'function') {
        // 规范 2.3.3.3：如果 then 是函数，将 x 作为函数的作用域 this 调用。
        // 传递两个回调函数作为参数，第一个参数叫做 resolvePromise ，第二个参数叫做 rejectPromise:
        then.call(x, 
          // 规范 2.3.3.1：如果/当 resolvePromise 以值 y 为参数被调用，则运行 [[Resolve]](promise, y)
          (y) => {
            if (hasUsed) return
            hasUsed = true
            resolvePromise(backPromise, y, resolve, reject)
          }, 
          // 规范 2.3.3.2：如果/当 rejectPromise 以据因 r 为参数被调用，则以 r 为理由拒绝 promise
          (r) => {
            if (hasUsed) return
            hasUsed = true
            reject(r)
          }
        )

      } else {
        // 规范 2.3.3.4：如果 then 不是函数，以 x 为参数执行 promise
        if (hasUsed) return
        hasUsed = true
        resolve(x)
      }
    } catch (e) {
      // 规范 2.3.3.2：如果执行x.then的时候抛出了错误e，则以e为理由reject掉promise
      if (hasUsed) return
      hasUsed = true
      reject(e)
    }
    // ----------------------------------------------- 分割线 -----------------------------------------------

  } else {
    // 规范 2.3.4：如果 x 不为对象或者函数，以 x 为参数执行 promise
    resolve(x)
  }
 ```

 ### 完整代码
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
  let self = this // 保存一份this
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

  let self = this
  let backPromise // 要返回的Promose
  return backPromise = new MyPromise(function(resolve, reject) {
    // pending状态下保存callbacks
    if (self.status === PENDING) {
      self.fulfillCallback.push(() => {
        setTimeout(() => {
          try {
            let x = onFulfilled(self.value)
            resolvePromise(backPromise, x, resolve, reject)
          } catch (e) {
            reject(e)
          }
        }, 0)
      })
      self.rejectCallback.push(() => {
        setTimeout(() => {
          try {
            let x = onRejected(self.value)
            resolvePromise(backPromise, x, resolve, reject)
          } catch (e) {
            reject(e)
          }
        }, 0)
      })
    }
    // 状态如果已经成功则执行入参 onFulfilled
    else if (self.status === FULFILLED) {
      setTimeout(() => {
        try {
          let x = onFulfilled(self.value) // 2️⃣
          resolvePromise(backPromise, x, resolve, reject)
        } catch (e) {
          reject(e)
        }
      }, 0)
    }
    // 状态如果已经失败则执行入参 onRejected
    else if (self.status === REJECTED) {
      setTimeout(() => {
        try {
          let x = onRejected(self.value) // 2️⃣
          resolvePromise(backPromise, x, resolve, reject)
        } catch (e) {
          reject(e)
        }
      }, 0)

    }
  })

}

/*
（x指的是onFulfilled1️⃣, onRejected2️⃣的返回值）
resolvePromise处理then之后的Promise，这块要处理的问题比较复杂，
包括then中返回的Promise是否与x相等啊、
then中用户是否自己又返回了一个Promise啊（x 为 Promise）
x 为对象或函数啦
*/
function resolvePromise(backPromise, x, resolve, reject) {
  // let self = this
  let typeString = val => Object.prototype.toString.call(val)
  // 如果 promise 和 x 指向同一对象，以 TypeError 为据因拒绝执行 promise（规范2.3.1）
  if (backPromise === x) {
    reject(new TypeError('backPromise and x should not be the same'))
  }

  // 先判断x是否为对象或者函数
  if (typeString(x) === '[object Object]' || typeString(x) === '[object Function]') {

    // ----------------------------------------------- 分割线 -----------------------------------------------
    // 定义一个hasUsed用于规范2.3.3.3.3：如果 resolvePromise 和 rejectPromise 均被调用，
    // 或者被同一参数调用了多次，则优先采用首次调用并忽略剩下的调用

    let hasUsed

    try {
      // 规范 2.3.3.1：把 x.then 赋值给 then
      let then = x.then
      if (typeof then === 'function') {
        // 规范 2.3.3.3：如果 then 是函数，将 x 作为函数的作用域 this 调用。
        // 传递两个回调函数作为参数，第一个参数叫做 resolvePromise ，第二个参数叫做 rejectPromise:
        then.call(x,
          // 规范 2.3.3.1：如果/当 resolvePromise 以值 y 为参数被调用，则运行 [[Resolve]](promise, y)
          y => {
            if (hasUsed) return
            hasUsed = true
            resolvePromise(backPromise, y, resolve, reject)
          },
          // 规范 2.3.3.2：如果/当 rejectPromise 以据因 r 为参数被调用，则以 r 为理由拒绝 promise
          r => {
            if (hasUsed) return
            hasUsed = true
            reject(r)
          }
        )

      } else {
        // 规范 2.3.3.4：如果 then 不是函数，以 x 为参数执行 promise
        if (hasUsed) return
        hasUsed = true
        resolve(x)
      }
    } catch (e) {
      // 规范 2.3.3.2：如果执行x.then的时候抛出了错误e，则以e为理由reject掉promise
      if (hasUsed) return
      hasUsed = true
      reject(e)
    }
    // ----------------------------------------------- 分割线 -----------------------------------------------

  } else {
    // 规范 2.3.4：如果 x 不为对象或者函数，以 x 为参数执行 promise
    resolve(x)
  }

}
 ```
### 最后提一下Promise.prototype.catch的实现
```
Promise.prototype.catch = function (onRejected) {
    return this.then(null, onRejected)
}
```
Promise.prototype.catch实际上就是对then方法的包装，他返回了一个`成功方法为null`，`失败方法为我们传如的function`的then方法，当Promise中发生语法错误：
```
new MyPromise(function (resolve, reject) {
  alert(a) // Uncaught ReferenceError: a is not defined
  /*
    alert(a)出现了语法错误
    MyPromise代码中执行fn时，catch了错误，直接执行了reject(e)，
    try {
      fn(resolve, reject)
    } catch (e) {
      reject(e)
    }
    但是第一个then中并没有定义失败的方法，失败方法被默认赋值为了这样err => { throw err }一个方法，又将错误抛出，然后被catch捕获到
  */
})
.then(function (val) {
  console.log(val)
})
.catch(function(err) {
  console.log('ERR', err) // ERR ReferenceError: a is not defined
})
```
#### 从catch的实现我想到了我遇到过的一道题目
catch在捕获语法错误的同时，也会使全局错误捕获`window.onerror`无法捕获这个错误，在then方法中如何写，才能使`window.onerror`成功捕获到错误？
```
window.onerror = (e) => {
  console.error('WINDOW', e) // 全局无法捕获错误
}
new Promise(function (resolve, reject) {
  resolve()
})
.then(function (val) {
  alert(hasNot)
})
.catch(function (err) {
  console.log('ERR', err) // hasNot is not defined 错误被catch捕获
})
```
这里的一种方案是使用setTimeout包裹代码：
```
window.onerror = (e) => {
  console.log('WINDOW', e) // 成功捕获错误
}
new Promise(function (resolve, reject) {
  resolve()
})
.then(function (val) {
  // 使用setTimeout将会报错的代码放到宏任务队列中去，
  // 以保证同步代码执行时不报错，不被catch捕获，
  // 待清空宏任务队列时，就会将错误抛到全局去
  setTimeout(() => {
    alert(hasNot)
  }, 0)
})
.catch(function (err) {
  console.log('ERR', err)
})
```


 ### 参考：
> [Promises/A+](https://promisesaplus.com/)
> [【翻译】Promises/A+规范](http://www.ituring.com.cn/article/66566)
> [Promise的源码实现](https://juejin.im/post/5c88e427f265da2d8d6a1c84#heading-0)
