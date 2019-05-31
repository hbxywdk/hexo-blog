---
title: 学习Vue源码12-Vue中的watch与computed
date: 2019-05-14 15:04:41
summary: 
desc: 
tag: 
category: Vue
---

Vue 的 _init() 方法调用了 initState 方法：
```
core\instance\state.js
export function initState (vm: Component) {
  vm._watchers = []
  const opts = vm.$options

  // code... 省略代码

  // 处理computed
  if (opts.computed) initComputed(vm, opts.computed)
  // 处理watch
  if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch)
  }
}
```

先看watch：
### Watch
```
core\instance\state.js
function initWatch (vm: Component, watch: Object) {
  // 遍历 options.watch 参数
  // 调用 createWatcher
  for (const key in watch) {
    const handler = watch[key]
    if (Array.isArray(handler)) {
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i])
      }
    } else {
      createWatcher(vm, key, handler)
    }
  }
}

function createWatcher (
  vm: Component,
  expOrFn: string | Function,
  handler: any,
  options?: Object
) {
  if (isPlainObject(handler)) {
    options = handler
    handler = handler.handler
  }
  if (typeof handler === 'string') {
    handler = vm[handler]
  }
  return vm.$watch(expOrFn, handler, options)
}
```
createWatcher 会调用 vm.$watch(expOrFn, handler, options)

vm.$watch 是在 core\instance\index.js 调用  stateMixin(Vue) 时定义的

```
  Vue.prototype.$watch = function (
    expOrFn: string | Function,
    cb: any,
    options?: Object
  ): Function {
    const vm: Component = this
    if (isPlainObject(cb)) {
      return createWatcher(vm, expOrFn, cb, options)
    }
    options = options || {}
    options.user = true
    
    // 实例化了一个 Watcher
    const watcher = new Watcher(vm, expOrFn, cb, options)
    if (options.immediate) {
      try {
        cb.call(vm, watcher.value)
      } catch (error) {
        handleError(error, vm, `callback for immediate watcher "${watcher.expression}"`)
      }
    }
    // 返回 unwatchFn
    return function unwatchFn () {
      watcher.teardown()
    }
  }
```
Vue.prototype.$watch 中`实例化了一个 Watcher`，返回了一个 `unwatchFn 函数，调用它可以卸载该 watch`。

接下来我们转到 Watcher ，这一块的代码有些多，我会省略大部分代码：
```
core\observer\watcher.js
export default class Watcher {
  // code... 省略代码

  constructor (vm: Component, expOrFn: string | Function, cb: Function, options?: ?Object, isRenderWatcher?: boolean) {
    this.vm = vm
    // 如果是渲染的 Watcher ，vm._watcher 指向当前 this
    if (isRenderWatcher) {
      vm._watcher = this
    }
    // 向 vm._watchers push this
    vm._watchers.push(this)
    
    // 这是 watch 的配置项
    if (options) {
      this.deep = !!options.deep
      this.user = !!options.user
      this.lazy = !!options.lazy
      this.sync = !!options.sync
      this.before = options.before
    } else {
      // watch 没配置项，给默认配置
      this.deep = this.user = this.lazy = this.sync = false
    }
    // 一系列初始化
    this.cb = cb
    this.id = ++uid // uid for batching
    this.active = true
    this.dirty = this.lazy // for lazy watchers
    this.deps = []
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = noop
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    this.value = this.lazy
      ? undefined
      : this.get() // 调用 this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   */
  get () {
    // 👇 pushTarget(this)，将 Dep.target 赋值为 this
    pushTarget(this)
    let value
    const vm = this.vm
    try {
      // 要 watch 的获取值
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) {
        traverse(value)
      }
      // 👇 清空 Dep.target
      popTarget()
      // 清空依赖
      this.cleanupDeps()
    }
    return value
  }

  // 👇 以下代码全部省略
  addDep (dep: Dep) {} // 向此指令添加依赖项

  cleanupDeps () {} // 清理依赖集合

  update () {} // 在依赖变更时调用

  run () {}

  evaluate () {}

  depend () {}
  
  teardown () {} // 移除 watch
}
```

这里调用 pushTarget(this)，将 Dep.target 赋值为 this ，这样做的目的是可以将 当前 Watcher 添加到 Dep 的订阅列表中
我们回过头看 defineReactive 函数的其中一段：
```
  // 使用 Object.defineProperty 对数据进行监听
  Object.defineProperty(obj, key, {
    enumerable: true, // 可枚举
    configurable: true, // 可配置
    get: function reactiveGetter () {
      const value = getter ? getter.call(obj) : val
      // 这个Dep.target是用于添加 Watcher 的，正常情况下它的值为 null
      if (Dep.target) { 👈👈👈👈👈👈👈
        // 添加 Watcher 相关
        dep.depend()
        if (childOb) {
          childOb.dep.depend()
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      // 返回对应值
      return value
    },
    set: function reactiveSetter (newVal) {
      // code... 代码省略
    }
  })
```
通过 defineReactive 函数，我们劫持了数据，`Watcher 的 get 方法会去获取劫持过的数据，获取数据就会触发 get`，
上面手指所指的地方，`当 Dep 存在静态属性 target 的时候，就成功的向 Dep 添加了 Watcher`，一旦数据改变，就会触发用户定义好的回调。

接着看 computed：


### Computed
#### 第一部分代码
```
core\instance\state.js

// 初始化 computed
const computedWatcherOptions = { lazy: true }

function initComputed (vm: Component, computed: Object) {
  // watchers = vm._computedWatchers = 空对象
  const watchers = vm._computedWatchers = Object.create(null)

  // computed properties are just getters during SSR
  const isSSR = isServerRendering()

  // 遍历 computed 
  for (const key in computed) {
    const userDef = computed[key]
    // 如果定义的 computed 是函数，则获取函数，如果是 getter、setter 形式，则获取 get函数
    const getter = typeof userDef === 'function' ? userDef : userDef.get

    if (process.env.NODE_ENV !== 'production' && getter == null) {
      warn(
        `Getter is missing for computed property "${key}".`,
        vm
      )
    }

    // 非服务端渲染下 赋值 watchers[key] 为 Watcher
    // 比如赋值后 watchers 变为 { 'computedName': new Watcher(args) }
    if (!isSSR) {
      // create internal watcher for the computed property.
      // 为 computed 属性定义 Watcher

      ------------------------------------ 标注一 ------------------------------------
      watchers[key] = new Watcher(
        vm,
        getter || noop,
        noop,
        computedWatcherOptions // { lazy: true }
      )
    }

    // component-defined computed properties are already defined on the
    // component prototype. We only need to define computed properties defined
    // at instantiation here.
    
    // 定义过重名的（data、props中），则报错，没有重名则调用 defineComputed
    if (!(key in vm)) {
      defineComputed(vm, key, userDef)
    } else if (process.env.NODE_ENV !== 'production') {
      if (key in vm.$data) {
        warn(`The computed property "${key}" is already defined in data.`, vm)
      } else if (vm.$options.props && key in vm.$options.props) {
        warn(`The computed property "${key}" is already defined as a prop.`, vm)
      }
    }
  }
}

```
`这里以一个最简单的例子来说明：`
```
computed: {
  fullName: function () {
    return this.firstName + this.lastName
  }
}

```
首先：const getter = typeof userDef === 'function' ? userDef : userDef.get
getter 其实就是我们定义的 computed 函数:
```
function () {
  return this.firstName + this.lastName
}
```
然后看`标注一`的位置，这里 `new 了一个 Watcher`
```
watchers[key] = new Watcher(
  vm,
  getter || noop,
  noop,
  computedWatcherOptions // { lazy: true }
)
```
这里只 new Watcher()，Watcher 内部的方法都不会被调用。

之后调用了 defineComputed 方法，我们接着看第二部分代码：

#### 第二部分代码
```
const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
}

function createComputedGetter (key) {
  return function computedGetter () {
    const watcher = this._computedWatchers && this._computedWatchers[key]
    if (watcher) {
      if (watcher.dirty) {
        watcher.evaluate()
      }
      if (Dep.target) {
        watcher.depend()
      }
      return watcher.value
    }
  }
}

function createGetterInvoker(fn) {
  return function computedGetter () {
    return fn.call(this, this)
  }
}

export function defineComputed (
  target: any,
  key: string,
  userDef: Object | Function
) {
  const shouldCache = !isServerRendering() // isServerRendering() 我们直接认为是 false，所以 shouldCache = true

  // 修改 sharedPropertyDefinition 的getter/setter
  // 之后会用 Object.defineProperty 劫持 computed 数据
  // 获取数据的时候，走 getter 函数，getter 函数会处理我们定义的 computed 函数，并返回结果

  // 函数形式的 computed
  if (typeof userDef === 'function') {
    ------------------------------------ 标注二 ------------------------------------
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key)
      : createGetterInvoker(userDef)
    sharedPropertyDefinition.set = noop

  // getter / setter 形式的 computed 
  } else {
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)
        : createGetterInvoker(userDef.get)
      : noop
    sharedPropertyDefinition.set = userDef.set || noop
  }

  if (process.env.NODE_ENV !== 'production' &&
      sharedPropertyDefinition.set === noop) {
    sharedPropertyDefinition.set = function () {
      warn(
        `Computed property "${key}" was assigned to but it has no setter.`,
        this
      )
    }
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}
```

我们看`标注二`，这里我们默认只考虑浏览器环境，所以：
```
// 假设 key = 'fullName'

sharedPropertyDefinition.get = createComputedGetter(fullName)]

// => 等同于

sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: function computedGetter () {
    const watcher = this._computedWatchers && this._computedWatchers['fullName']
    if (watcher) {
      if (watcher.dirty) {
        watcher.evaluate()
      }
      if (Dep.target) {
        ------------------------------------ 标注四 ------------------------------------
        watcher.depend()
      }
      return watcher.value
    }
  },
  set: noop
}

// 然后使用 Object.defineProperty 对 fullName 进行劫持
Object.defineProperty(target, key, sharedPropertyDefinition)
```
当我们使用 computed 时，就触发了他的 get 方法，然后会调用前面定义的 Watcher 的 evaluate 方法。
`evaluate 方法会调用 Watcher 的 get`，然后我们转到 Watcher 中看 get 方法：

```
core\observer\watcher.js
// Watcher 的 get 方法会被调用
get () {
  // 👇 pushTarget(this)，将 Dep.target 赋值为 this（当前Watcher）
  pushTarget(this)
  let value
  const vm = this.vm
  try {
    // 要 watch 的获取值
    ------------------------------------ 标注三 ------------------------------------
    value = this.getter.call(vm, vm)
  } catch (e) {
    if (this.user) {
      handleError(e, vm, `getter for watcher "${this.expression}"`)
    } else {
      throw e
    }
  } finally {
    if (this.deep) {
      traverse(value)
    }
    // 👇 清空 Dep.target
    popTarget()
    // 清空依赖
    this.cleanupDeps()
  }
  return value
}

```
get 方法首先将 Dep.target 指向当前 Watcher
接着`标注三`的位置调用了 `this.getter.call(vm, vm)`，也就是 `return this.firstName + this.lastName`。
然后触发了 firstName 与 lastName 的 getter，将当前 Watcher 添加到 这两个 data 的订阅者列表中，如果 `firstName 与 lastName 发生变化都会调用当前 Watcher 的 update 方法。`
`同时也算出了 value 值`。
Watcher 的 update 方法被调用，就会触发 get 方法，获取最新的值，`算出最新的 value`。

最后 return watcher.value

END

TIPS: 这里如果不清楚如何订阅者列表可以去看[这篇](https://hbxywdk.github.io/2019/03/15/%E5%AD%A6%E4%B9%A0Vue%E6%BA%90%E7%A0%814-%E7%AE%80%E7%89%88%E5%93%8D%E5%BA%94%E5%BC%8F%E6%95%B0%E6%8D%AE%E5%8E%9F%E7%90%86/)










