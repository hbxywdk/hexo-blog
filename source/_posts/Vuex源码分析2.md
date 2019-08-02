---
title: Vuex源码分析2
date: 2019-08-01 18:54:33
summary: 
desc: 
tag: 
category: Vue
---
接下来就是实例化一个 Vuex.Store：
```
const store = new Vuex.Store({
  state: {
    count: 0
  },
  mutations: {
    increment (state) {
      state.count++
    }
  }
})
```
#### Store
Store的代码位于 src/store.js 中，先看 Store 的构造函数：
```
  constructor (options = {}) {
    // code... 省略

    const {
      plugins = [], // 传入的插件配置 https://vuex.vuejs.org/zh/guide/plugins.html
      strict = false // 是否开启严格模式 https://vuex.vuejs.org/zh/guide/strict.html
    } = options

    /* 初始化内部状态 */

    this._committing = false
    // actions
    this._actions = Object.create(null)
    // 存放 actions 的订阅者
    this._actionSubscribers = []
    // mutations
    this._mutations = Object.create(null)
    // getters
    this._wrappedGetters = Object.create(null)
    // 模块收集
    this._modules = new ModuleCollection(options)
    // 模块命名空间 Map
    this._modulesNamespaceMap = Object.create(null)
    // 存放订阅者
    this._subscribers = []
    // 用以实现 Vuex.Store.watch 方法的Vue实例
    this._watcherVM = new Vue()

    // 给 Store 绑定 commit 与 dispacth 方法
    const store = this
    const { dispatch, commit } = this
    this.dispatch = function boundDispatch (type, payload) {
      return dispatch.call(store, type, payload)
    }
    this.commit = function boundCommit (type, payload, options) {
      return commit.call(store, type, payload, options)
    }

    // 严格模式下，任何 mutation 处理函数以外修改 Vuex state 都会抛出错误。https://vuex.vuejs.org/zh/api/#strict
    this.strict = strict

    // 根 state
    const state = this._modules.root.state

    // 初始化根模块，同时递归注册所有子模块，并收集所有模块的 getters 存放到 this._wrappedGetters 中 
    installModule(this, state, [], this._modules.root)

    // 初始化 store 的 vm，负责反应，同时将 _wrappedGetters 注册为计算属性）
    resetStoreVM(this, state)

    // plugins 应用插件
    plugins.forEach(plugin => plugin(this))

    // devtool 插件相关
    const useDevtools = options.devtools !== undefined ? options.devtools : Vue.config.devtools
    if (useDevtools) {
      devtoolPlugin(this)
    }
  }

```
构造函数中主要是一些内部值的初始化与一些初始化方法的执行，我们按照构造函数的执行顺序由上到下分析。

#### ModuleCollection
首先是这一句：`this._modules = new ModuleCollection(options)`，这里实例化了 ModuleCollection，用于模块收集，并处理成 Vuex 所需的数据结构。

```
export default class ModuleCollection {
  constructor (rawRootModule) {
    // 使用 Vuex.Store 的 options 注册根模块
    this.register([], rawRootModule, false)
  }

  get (path) {
    return path.reduce((module, key) => {
      return module.getChild(key) // 获取名为入参 key 的子模块
    }, this.root)
  }

  getNamespace (path) {
    let module = this.root
    return path.reduce((namespace, key) => {
      module = module.getChild(key)
      return namespace + (module.namespaced ? key + '/' : '')
    }, '')
  }

  // 更新
  update (rawRootModule) {
    update([], this.root, rawRootModule)
  }

  // 注册
  register (path, rawModule, runtime = true) {
    if (process.env.NODE_ENV !== 'production') {
      assertRawModule(path, rawModule)
    }
    // Module（Store 的基础数据结构）
    const newModule = new Module(rawModule, runtime)
    // path [] 、path ['modulesName1', 'modulesName2', 'modulesName3']
    if (path.length === 0) {
      // 首次注册将 this.root 设置为 newModule
      this.root = newModule
    } else {
      // 子模块走这里，给 parent 添加 child
      const parent = this.get(path.slice(0, -1))
      parent.addChild(path[path.length - 1], newModule) // 调用 Module 的 addChild 添加子模块
    }

    // 如果用户有使用嵌套模块（modules），则遍历所有模块，为每个模块都执行 this.register 注册
    if (rawModule.modules) {
      forEachValue(rawModule.modules, (rawChildModule, key) => {
        this.register(path.concat(key), rawChildModule, runtime)
      })
    }
  }

  unregister (path) {
    const parent = this.get(path.slice(0, -1))
    const key = path[path.length - 1]
    if (!parent.getChild(key).runtime) return

    parent.removeChild(key)
  }
}
```

ModuleCollection 的构造函数中从`根`开始调用 `this.register([], rawRootModule, false)`

```
  register (path, rawModule, runtime = true) {
    if (process.env.NODE_ENV !== 'production') {
      assertRawModule(path, rawModule)
    }
    // Module（Store 的基础数据结构）
    const newModule = new Module(rawModule, runtime)
    // path [] 、path ['modulesName1', 'modulesName2', 'modulesName3']
    if (path.length === 0) {
      // 首次注册将 this.root 设置为 newModule
      this.root = newModule
    } else {
      // 子模块走这里，给 parent 添加 child
      const parent = this.get(path.slice(0, -1))
      parent.addChild(path[path.length - 1], newModule) // 调用 Module 的 addChild 添加子模块
    }

    // 如果用户有使用嵌套模块（modules），则遍历所有模块，为每个模块都执行 this.register 注册
    if (rawModule.modules) {
      forEachValue(rawModule.modules, (rawChildModule, key) => {
        this.register(path.concat(key), rawChildModule, runtime)
      })
    }
  }
```
从`根`开始调用 register 会调用将 `this.root` 设置为 `new Module(rawModule, runtime)`,
Module (src/module/module.js) 是 Store 的基础数据结构，对于使用了 modules 子模块的则会调用 `父 Module 的 addChild` 方法添加到 父 Module 的 _children 中。

#### 继续看构造函数
##### 赋值 this._watcherVM 为一个 Vue 实例，用以实现 Vuex.Store.watch 方法。
```
  this._watcherVM = new Vue()
```
```
  watch (getter, cb, options) {
    if (process.env.NODE_ENV !== 'production') {
      assert(typeof getter === 'function', `store.watch only accepts a function.`)
    }
    return this._watcherVM.$watch(() => getter(this.state, this.getters), cb, options)
  }
```

##### 给 Store 绑定 commit 与 dispacth 方法
```
  const store = this
  const { dispatch, commit } = this
  this.dispatch = function boundDispatch (type, payload) {
    return dispatch.call(store, type, payload)
  }
  this.commit = function boundCommit (type, payload, options) {
    return commit.call(store, type, payload, options)
  }
```
##### 调用 installModule 与 resetStoreVM 方法
```
  // 初始化根模块，同时递归注册所有子模块，并收集所有模块的 getters 存放到 this._wrappedGetters 中 
  installModule(this, state, [], this._modules.root)

  // 初始化 store 的 vm，负责反应，同时将 _wrappedGetters 注册为计算属性）
  resetStoreVM(this, state)
```

##### 插件相关
```
  // plugins 应用插件
  plugins.forEach(plugin => plugin(this))

  // devtool 插件相关
  const useDevtools = options.devtools !== undefined ? options.devtools : Vue.config.devtools
  if (useDevtools) {
    devtoolPlugin(this)
  }
```




