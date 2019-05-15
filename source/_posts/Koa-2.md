---
title: 学习KOA源码2
date: 2019-05-15 17:49:37
summary: 
desc: 
tag: 
category: Node
---
### compose处理中间件

上篇说到在 this.handleRequest(ctx, fn) 中的这一句 fnMiddleware(ctx).then(handleResponse).catch(onerror)，
这里使用了 `Promise.resolve() 依次执行各中间件，最后执行.then()`，结束请求。
我们向上寻找，可以发现 fnMiddleware 就是 `compose(this.middleware)` 的结果，compose 函数来自 `koa-compose` 这个库，
在 node_modules 中找到它：
```

function compose (middleware) {
  if (!Array.isArray(middleware)) throw new TypeError('Middleware stack must be an array!')
  for (const fn of middleware) {
    if (typeof fn !== 'function') throw new TypeError('Middleware must be composed of functions!')
  }
  /**
   * @param {Object} context
   * @return {Promise}
   * @api public
   */
  return function (context, next) {
    // last called middleware #
    let index = -1
    return dispatch(0)
    function dispatch (i) {
      if (i <= index) return Promise.reject(new Error('next() called multiple times'))
      index = i
      let fn = middleware[i] // 当前中间件
      if (i === middleware.length) fn = next

      // 没有中间件了，返回一个没有参数的 Promise.resolve() 就会调用 .then()
      if (!fn) return Promise.resolve()
      try {
        /**
         * 使用 Promise.resolve 可以依次执行当前中间件，第二个参数 dispatch.bind(null, i + 1) 它就是我们定义中间件时的 next 参数：
         * app.use(async (ctx, next) => {
         *  next();
         * });
         * 这也是中间件不调用 next() 下一个中间件绝不会执行的原因
         */
        return Promise.resolve(fn(context, dispatch.bind(null, i + 1)));
      } catch (err) {
        return Promise.reject(err)
      }
    }
  }
}

```
这里主要利用了 `Promise.resolve 的参数如果还是一个 Promise，Promise.resolve 会将参数原封不动的 resolve 下去`这一点实现中间件的顺序执行。
我这里把代码简化一下：
```
// 中间件
var middleware = [
  (ctx, next) => { console.log(1); next() },
  (ctx, next) => { console.log(2); next() },
  (ctx, next) => { console.log(3) }
]
var ctx = {} // 模拟 ctx 这里直接给个空对象
var index = 0 // 起始下标

function run(ctx) {
  return dispatch(0)
  function dispatch(i) {
    index = i
    var fn = middleware[i] // 当前要执行的中间件
    // 没有中间件了，返回一个没有参数的 Promise.resolve() 就会调用 .then()
    if (!fn) return Promise.resolve()
    // dispatch.bind(null, i + 1) = 中间件的 next 参数 = 下一个中间件
    return Promise.resolve( fn(ctx, dispatch.bind(null, i + 1)) )
  }
}

run(ctx)
.then(() => {
  console.log('res.end()')
})
.catch(err => {
  console.error(err)
})
```
`Promise.resolve 的参数是当前要执行的中间件`，中间件有两个参数 ctx 与 dispatch.bind(null, i + 1)，
这个 dispatch 被调用后就会执行下一个中间件（我们在编写中间件时调用的 next() 就是这个玩意儿），并返回一个Promise.resolve。
这样最开始的 Promise.resolve 的参数就是一个 Promise，而这个 Promise 的参数还会是一个 Promise（有多少 middleware 就重复多少次），就可以将所有的 middleware 全部执行完。

这里我再把代码简化一下：
```
var middleware = [() => console.log(1), () => console.log(2), () => console.log(3)] // 中间件
var index = 0 // 起始下标

function run() {
  var fn = middleware[index] // 当前要执行的中间件
  index++
  // 没有中间件了，返回一个没有参数的 Promise.resolve() 就会调用 .then()
  if (!fn) return Promise.resolve()
  return Promise.resolve(run(fn()))
}

run().then(function () {
  console.log('End')
})
```
这样看就更简单明了了。


### context.js

#### 未完待续