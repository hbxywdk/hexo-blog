---
title: 学习Vue源码3
date: 2019-03-14 17:12:10
summary: 
desc: 
tag: 
category: Vue
---
### 暴露出Vue src/core/instance/index.js
1. 首先定义了名为Vue的函数
```
function Vue (options) {
  // 使用函数调用Vue()来调用Vue时给出错误警告
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}
```
2. 然后初始化&挂载一些功能
```
initMixin(Vue)
stateMixin(Vue)
eventsMixin(Vue)
lifecycleMixin(Vue)
renderMixin(Vue)
```
3. 最后将Vue函数导出

### 先看initMixin(Vue) src/core/instance/init.js
initMixin在Vue.prototype上挂载了_init方法，该_init方法会在new Vue({})时首先调用。
```
  // 参数的处理
  // merge options
  if (options && options._isComponent) {
    // optimize internal component instantiation
    // since dynamic options merging is pretty slow, and none of the
    // internal component options needs special treatment.
    initInternalComponent(vm, options)
  } else {
    // 合并配置options
    vm.$options = mergeOptions(
      // 解析构造函数配置
      resolveConstructorOptions(vm.constructor),
      options || {},
      vm
    )
  }
```
resolveConstructorOptions：
```
// 处理Vue与Vue子类这两种情况的options
  export function resolveConstructorOptions (Ctor: Class<Component>) {
    let options = Ctor.options
    // 是否是Vue的子类
    if (Ctor.super) {
      const superOptions = resolveConstructorOptions(Ctor.super) // 找到超类的Options
      const cachedSuperOptions = Ctor.superOptions // 
      if (superOptions !== cachedSuperOptions) { // 对比父类中的options 有没有发生变化
        // super(Vue)的Options配置若改变，处理新的Options
        // super option changed,
        // need to resolve new options.
        Ctor.superOptions = superOptions
        // check if there are any late-modified/attached options (#4976)
        const modifiedOptions = resolveModifiedOptions(Ctor)
        // update base extend options
        if (modifiedOptions) {
          extend(Ctor.extendOptions, modifiedOptions)
        }
        options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
        if (options.name) {
          options.components[options.name] = Ctor
        }
      }
    }
    // 返回获merge自己的options与父类的options属性
    return options
  }
```
后续还有

```
  // 😀初始化生命周期
  initLifecycle(vm)
  export function initLifecycle (vm: Component) {
    const options = vm.$options

    // 建立所有父子关系
    let parent = options.parent
    if (parent && !options.abstract) {
      while (parent.$options.abstract && parent.$parent) {
        parent = parent.$parent
      }
      parent.$children.push(vm)
    }

    // 又是一波属性挂载
    vm.$parent = parent
    vm.$root = parent ? parent.$root : vm

    vm.$children = []
    vm.$refs = {}

    vm._watcher = null
    vm._inactive = null
    vm._directInactive = false
    vm._isMounted = false
    vm._isDestroyed = false
    vm._isBeingDestroyed = false
  }
```

```
  // 😀️初始化事件
  initEvents(vm)

  export function initEvents (vm: Component) {
    vm._events = Object.create(null)
    vm._hasHookEvent = false

    // init parent attached events
    // vm.$options._parentListeners为父组件中定义的事件，如@click
    const listeners = vm.$options._parentListeners
    if (listeners) {
      updateComponentListeners(vm, listeners)
    }
  }
```
```

  // 😀初始化Render
  initRender(vm)
```
```

  // 😀触发beforeCreate钩子
  callHook(vm, 'beforeCreate')
```
```

  // 在data/props之前初始化注入
  // resolve injections before data/props
  initInjections(vm)
```

```

  // 😀State初始化，prop/method/data/computed/watch都在这里完成初始化，是Vue实例create的关键
  initState(vm)
  export function initState (vm: Component) {
    vm._watchers = []
    const opts = vm.$options
    // 处理props
    if (opts.props) initProps(vm, opts.props)
    // 处理methods，然后将每一个方法绑定在vm上，故可以以this.methodName()来调用methods{}中的方法
    if (opts.methods) initMethods(vm, opts.methods)
    if (opts.data) {
      // 存在data处理data
      initData(vm)
    } else {
      // 不存在data默认data为{}
      observe(vm._data = {}, true /* asRootData */)
    }
    // 处理computed
    if (opts.computed) initComputed(vm, opts.computed)
    // 处理watch
    if (opts.watch && opts.watch !== nativeWatch) {
      initWatch(vm, opts.watch)
    }
  }

  // initData中会调用observe方法，这里就会调用Vue最核心，利用Object.defineProperty对data进行劫持
  function initData (vm: Component) {
    let data = vm.$options.data
    data = vm._data = typeof data === 'function'
      ? getData(data, vm)
      : data || {}
    if (!isPlainObject(data)) {
      data = {}
      process.env.NODE_ENV !== 'production' && warn(
        'data functions should return an object:\n' +
        'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
        vm
      )
    }
    // proxy data on instance
    const keys = Object.keys(data)
    const props = vm.$options.props
    const methods = vm.$options.methods
    let i = keys.length
    while (i--) {
      const key = keys[i]
      if (process.env.NODE_ENV !== 'production') {
        if (methods && hasOwn(methods, key)) {
          warn(
            `Method "${key}" has already been defined as a data property.`,
            vm
          )
        }
      }
      if (props && hasOwn(props, key)) {
        process.env.NODE_ENV !== 'production' && warn(
          `The data property "${key}" is already declared as a prop. ` +
          `Use prop default value instead.`,
          vm
        )
      } else if (!isReserved(key)) {
        // 代理data，即this.xxx 可以的到this.data.xxx的数据
        proxy(vm, `_data`, key)
      }
    }
    // observe data
    observe(data, true /* asRootData */)
  }
```
```
  // 在data/props之后初始化provide
  // resolve provide after data/props
  initProvide(vm) 
```
```
  // 😀触发created钩子
  callHook(vm, 'created')
```



