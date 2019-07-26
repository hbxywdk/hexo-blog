---
title: Vuex源码分析1
date: 2019-07-26 18:54:33
summary: 
desc: 
tag: 
category: Vue
---
Vuex 版本 3.1.1
#### 目录结构
```
-- src
  -- module // 模块
    -- module-collection.js
    -- module.js
    
  -- plugins // 插件
    -- devtool.js // 开发工具插件
    -- logger.js // 日志插件

  -- helpers.js // 辅助函数
  -- index.esm.js
  -- index.js // 入口文件
  -- mixin.js
  -- store.js // Vuex.Sotre
  -- util.js // 工具函数

```
#### Vuex 基本用法
照例，先放基本用法：
```
Vue.use(Vuex)
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

new Vue({
  el: '#app',
  render: h => h(App),
  store,
})
```

#### 入口文件
可以看到主要是导出了 Store 等相关内容。
```
import { Store, install } from './store'
import { mapState, mapMutations, mapGetters, mapActions, createNamespacedHelpers } from './helpers'

// 入口文件，导出 Store 等相关内容
export default {
  Store, // Store
  install, // install 方法
  version: '__VERSION__',
  mapState,
  mapMutations,
  mapGetters,
  mapActions,
  createNamespacedHelpers
}
```

#### install 方法
Vue.use(Vuex) 会调用 Vuex 的 install 方法，它位于 src/store.js:
```
// 对外暴露 install 函数
export function install (_Vue) {
  // 二次 install 的警告
  if (Vue && _Vue === Vue) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(
        '[vuex] already installed. Vue.use(Vuex) should be called only once.'
      )
    }
    return
  }
  Vue = _Vue // 将变量 Vue 赋值为 install 方法传入的 Vue
  // 调用 applyMixin 开始混入
  applyMixin(Vue)
}
```
install 函数对二次 install 做了处理，并将 store.js 中名为 Vue 的变量赋值为 install 方法传入的 Vue，最后调用 applyMixin() 方法混入代码到 Vue。

#### applyMixin 方法
applyMixin() 方法位于 src/mixin.js：

```
export default function (Vue) {
  const version = Number(Vue.version.split('.')[0])

  // 版本兼容，2.x 版本使用 Vue.mixin 混入到 beforeCreate 中
  if (version >= 2) {
    Vue.mixin({ beforeCreate: vuexInit })
  // 版本兼容，1.x 版本
  } else {
    // Vue.prototype._init 中注入 vuex init过程，适用于 1.x 版本向后兼容。
    const _init = Vue.prototype._init
    Vue.prototype._init = function (options = {}) {
      options.init = options.init
        ? [vuexInit].concat(options.init)
        : vuexInit
      _init.call(this, options)
    }
  }

  /**
   * Vuex init hook, injected into each instances init hooks list.
   */

  function vuexInit () {
    const options = this.$options // 传入的配置项
    // store injection
    // 将实例化后的 store 挂载到 Vue.$store 上，这里的 store 是我们实例化后的 Store 并作为参数传给了 Vue
    if (options.store) {
      this.$store = typeof options.store === 'function'
        ? options.store()
        : options.store
    } else if (options.parent && options.parent.$store) {
      this.$store = options.parent.$store
    }
  }
}
```
applyMixin 比较清晰明了，首先是对 Vue 进行了版本兼容。
2.x 版本使用 Vue.mixin 混入到 beforeCreate 中；
1.x 版本则是在 Vue.prototype._init 中注入 vuex init过程。
vuexInit() 函数则会将实例化后的 store 挂载到 Vue.$store 上。





