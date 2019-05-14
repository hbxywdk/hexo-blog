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
```
core\instance\state.js
function initComputed (vm: Component, computed: Object) {
  // watchers = vm._computedWatchers = 空对象
  const watchers = vm._computedWatchers = Object.create(null)
  // computed properties are just getters during SSR
  const isSSR = isServerRendering()

  // 遍历 computed 
  for (const key in computed) {
    const userDef = computed[key]
    const getter = typeof userDef === 'function' ? userDef : userDef.get // 正确获取要计算的值
    if (process.env.NODE_ENV !== 'production' && getter == null) {
      warn(
        `Getter is missing for computed property "${key}".`,
        vm
      )
    }

    // 非服务端渲染下 赋值 watchers[key] 为 Watcher
    // 比如赋值后 watchers 变为 { 'dataName': new Watcher(args) }
    if (!isSSR) {
      // create internal watcher for the computed property.
      // computed 属性的内部观察器
      watchers[key] = new Watcher(
        vm,
        getter || noop,
        noop,
        computedWatcherOptions
      )
    }

    // vm 上已经定义过与当前 computed 同名属性的话，我们就只需要调用 defineComputed 来定义计算属性。
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

```
const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
}

export function defineComputed (
  target: any,
  key: string,
  userDef: Object | Function
) {
  const shouldCache = !isServerRendering()

  // 修改 sharedPropertyDefinition 的getter/setter
  // 之后会用 Object.defineProperty 劫持 computed 数据
  // 获取数据的时候，走 getter 函数，getter 函数会处理我们定义的 computed 函数，并返回结果
  if (typeof userDef === 'function') {
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key)
      : createGetterInvoker(userDef)
    sharedPropertyDefinition.set = noop
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
```
我们定义的 computed 被绑定在 vm 上，defineComputed 函数会劫持我们定义的 computed 数据
获取数据的时候，走 getter 函数，getter 函数会处理我们定义的 `computed 函数`，并返回结果




