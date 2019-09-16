---
title: Vuex源码分析3
date: 2019-09-16 18:54:34
summary: 
desc: 
tag: 
category: Vue
---
上篇写到 Store 构造函数中的 installModule 与 resetStoreVM 方法，这篇继续。

#### installModule
installModule 会处理开启 namespaced 的情况。
所有模块的 action、mutation、getter 都会被分别挂载到 Store._actions、Store._mutations、Store._wrappedGetters 上
如果`没有开启 namespaced`，以 getter 为例会被处理成这样：
```
// Store._wrappedGetters
{
    'getterName1': function wrappedGetter() { // code... },
    'getterName2': function wrappedGetter() { // code... }
}
```
如果`开启了 namespaced`，会被处理成这样：
```
// Store._wrappedGetters
{
    'moduleName/getterName1': function wrappedGetter() { // code... },
    'moduleName/getterName2': function wrappedGetter() { // code... }
}
```
``` 
function installModule (store, rootState, path, module, hot) {
  // 是否是 root
  const isRoot = !path.length
  // 根据 path 入参获取 namespace 如：'/moduleA'
  const namespace = store._modules.getNamespace(path)

  // register in namespace map
  if (module.namespaced) {
    if (store._modulesNamespaceMap[namespace] && process.env.NODE_ENV !== 'production') {
      console.error(`[vuex] duplicate namespace ${namespace} for the namespaced module ${path.join('/')}`)
    }
    // 如果开启命名空间，就将当前 module 添加到 store._modulesNamespaceMap 中
    store._modulesNamespaceMap[namespace] = module
  }

  // 非根结点 & 非 热修改
  if (!isRoot && !hot) {
    // 获取父亲的 state
    const parentState = getNestedState(rootState, path.slice(0, -1))
    // 当前模块名
    const moduleName = path[path.length - 1]
    store._withCommit(() => {
      // 使用 Vue.set https://cn.vuejs.org/v2/api/#Vue-set 将当前模块设置为响应式的
      Vue.set(parentState, moduleName, module.state)
    })
  }
  // 本地化dispatch，commit，getters，state，如果没有名称空间，只需使用root
  const local = module.context = makeLocalContext(store, namespace, path)

  // 遍历注册当前 module 的 mutation
  module.forEachMutation((mutation, key) => {
    const namespacedType = namespace + key
    registerMutation(store, namespacedType, mutation, local)
  })

  // 遍历注册当前 module 的 action
  module.forEachAction((action, key) => {
    const type = action.root ? key : namespace + key
    const handler = action.handler || action
    registerAction(store, type, handler, local)
  })

  // 遍历注册当前 module 的 getter
  module.forEachGetter((getter, key) => {
    const namespacedType = namespace + key
    registerGetter(store, namespacedType, getter, local)
  })

  // 遍历调用 installModule，安装子模块 
  module.forEachChild((child, key) => {
    installModule(store, rootState, path.concat(key), child, hot)
  })
}
```
#### resetStoreVM
```
function resetStoreVM (store, state, hot) {
  // 旧 vm
  const oldVm = store._vm

  // bind store public getters 绑定 store 的 public getters
  store.getters = {}
  const wrappedGetters = store._wrappedGetters
  const computed = {}
  forEachValue(wrappedGetters, (fn, key) => { // fn 为 当前遍历 getter 值，key 为名
    // use computed to leverage its lazy-caching mechanism 使用computed来利用其惰性缓存机制
    // direct inline function use will lead to closure preserving oldVm. 直接内联函数使用将导致关闭保留oldVm。
    // using partial to return function with only arguments preserved in closure enviroment. 使用partial返回函数，只在闭包环境中保留参数。
    computed[key] = partial(fn, store)
    
    // 使用 Object.defineProperty 为每个 getter 定义 get 方法，
    // 当使用 getter 访问时实际返回的是 store._vm 下的同名值
    Object.defineProperty(store.getters, key, {
      get: () => store._vm[key],
      enumerable: true // for local getters
    })
  })

  // use a Vue instance to store the state tree
  // suppress warnings just in case the user has added
  // some funky global mixins
  // 使用一个 Vue 实例来存储 state 树

  const silent = Vue.config.silent
  Vue.config.silent = true // 暂时取消 Vue 的日志与警告
  // 设置 store._vm 为 Vue 实例
  store._vm = new Vue({
    data: {
      $$state: state // state 为 root.state
    },
    computed
  })
  Vue.config.silent = silent // 实例化完成后设置回原值

  // enable strict mode for new vm
  if (store.strict) {
    enableStrictMode(store)
  }

  if (oldVm) {
    if (hot) {
      // dispatch changes in all subscribed watchers
      // to force getter re-evaluation for hot reloading.
      store._withCommit(() => {
        oldVm._data.$$state = null
      })
    }
    // 销毁旧 Vue 实例
    Vue.nextTick(() => oldVm.$destroy())
  }
}
```

先遍历所有定义了的 getter ，然后使用 Object.defineProperty 将 getter 的值都转到了 store._vm 上，等于说访问 store.getter.xxx 等同于访问 store._vm.xxx。
```
  Object.defineProperty(store.getters, key, {
    get: () => store._vm[key],
    enumerable: true // for local getters
  })
```
之后以 root.state 为 data 实例化一个 Vue 实例，以 Vue 的响应式能力来实现 Vuex 的功能。
```
  // 设置 store._vm 为 Vue 实例
  store._vm = new Vue({
    data: {
      $$state: state // state 为 root.state
    },
    computed
  })
```

Vuex 设置了 store.state 的 get 函数，当使用 store.state.xxx 时实际返回的是 store._vm._data.$$state 中的数据。
```
  // 获取 store.vm 的数据
  get state () {
    return this._vm._data.$$state
  }

  // 设置 state（不允许直接修改 state）
  set state (v) {
    if (process.env.NODE_ENV !== 'production') {
      // 只可使用 store.replaceState() 替换存储状态，不允许直接设置
      assert(false, `use store.replaceState() to explicit replace store state.`)
    }
  }
```

接下来看其他部分：

#### Store.commit 方法
```
  // 提交 mutation https://vuex.vuejs.org/zh/api/#commit （注意：mutation为同步事物）
  commit (_type, _payload, _options) { 
    // check object-style commit
    const {
      type, // 类型
      payload, // 数据
      options
    } = unifyObjectStyle(_type, _payload, _options) // 统一不同风格的入参

    const mutation = { type, payload }
    const entry = this._mutations[type] // 对应类型的 mutations

    // 找不到对应类型的 mutation 则返回
    if (!entry) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[vuex] unknown mutation type: ${type}`)
      }
      return
    }
    // 传入数据（载荷/payload）执行每一个 mutation 
    this._withCommit(() => {
      entry.forEach(function commitIterator (handler) {
        handler(payload)
      })
    })
    // 执行所有订阅了该 mutation 的回调 https://vuex.vuejs.org/zh/api/#subscribe
    this._subscribers.forEach(sub => sub(mutation, this.state))

    if (
      process.env.NODE_ENV !== 'production' &&
      options && options.silent
    ) {
      console.warn(
        `[vuex] mutation type: ${type}. Silent option has been removed. ` +
        'Use the filter functionality in the vue-devtools'
      )
    }
  }
```
mutation 执行后，会执行所有订阅了该 mutation 的回调，订阅相关 API： https://vuex.vuejs.org/zh/api/#subscribe

#### Store.dispatch 方法
```
  // 分发 action https://vuex.vuejs.org/zh/api/#dispatch（action 内可异步）
  dispatch (_type, _payload) {
    // check object-style dispatch
    const {
      type, // 类型
      payload // 数据
    } = unifyObjectStyle(_type, _payload) // 统一不同风格的入参

    const action = { type, payload }
    const entry = this._actions[type] // 对应类型的 actions

    // 找不到对应类型的 action 则返回
    if (!entry) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[vuex] unknown action type: ${type}`)
      }
      return
    }

    // action 执行前，调用 subscribeAction.before 回调
    try {
      this._actionSubscribers
        .filter(sub => sub.before)
        .forEach(sub => sub.before(action, this.state))
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[vuex] error in before action subscribers: `)
        console.error(e)
      }
    }

    // 执行 action
    const result = entry.length > 1
      ? Promise.all(entry.map(handler => handler(payload)))
      : entry[0](payload)

    // action 执行后，调用 subscribeAction.after 回调（Promise 的 then 内执行）
    return result.then(res => {
      try {
        this._actionSubscribers
          .filter(sub => sub.after)
          .forEach(sub => sub.after(action, this.state))
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[vuex] error in after action subscribers: `)
          console.error(e)
        }
      }
      return res
    })
  }
```
action 的执行同样也有订阅回调，与 mutation 不同的是 action 的订阅有两个 一个 before，一个 after 分别在 执行前、执行后调用。