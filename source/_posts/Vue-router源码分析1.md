---
title: Vue-router源码分析1
date: 2019-07-16 20:54:33
summary: 
desc: 
tag: 
category: Vue
---
Axios 版本 0.19.0

#### 目录结构
```
-- lib
  -- components // 存放 <router-view> 与 <router-link> 组件
  -- history // 存放几种路由方式文件
    -- base.js // 所有模式共有部分
    -- hash.js // hash 模式
    -- html5.js // h5 history 模式
    ......
  -- util // 工具函数
  -- create-matcher.js // 
  -- create-route-map.js // 
  -- index.js // 入口文件
  -- install.js // 用于 Vue.use()

```

#### Vue-router 在模块化项目中的常规使用
```
import Vue from 'vue'
import VueRouter from 'vue-router'

// 调用 Vue.use()，在模块化项目中必须手动调用，在常规项目中（script 标签引入） Vue 会主动调用 use。
Vue.use(VueRouter)

// 创建路由实例
var router = new VueRouter({
  mode: 'hash', // 路由模式
  routes: routes // 路由配置
})

// 创建 Vue 实例
new Vue({
  el: '#app',
  render: h => h(App),
  router,
})
```
我们按照 Vue-router 的使用一步步来看。

#### Vue.use(VueRouter) 
Vue.use 方法会调用插件的 install 方法，Vue-router 的 install 方法位于 `src/install.js` 文件中：
```
export let _Vue
export function install (Vue) {
  if (install.installed && _Vue === Vue) return // 已被安装 return
  install.installed = true
  _Vue = Vue
  const isDef = v => v !== undefined
  const registerInstance = (vm, callVal) => {
    let i = vm.$options._parentVnode
    if (isDef(i) && isDef(i = i.data) && isDef(i = i.registerRouteInstance)) {
      i(vm, callVal)
    }
  }

  // 全局注入 beforeCreate 与 destroyed 
  Vue.mixin({
    beforeCreate () {
      // 这里判断 this.$options.router 是否存在，我们在 new Vue() 时传入 router，vue就会把 router 挂载到 this.$options 上，这是 new Vue() 需要传入 router 的原因
      if (isDef(this.$options.router)) {
        this._routerRoot = this
        this._router = this.$options.router
        this._router.init(this)
        Vue.util.defineReactive(this, '_route', this._router.history.current)
      } else {
        this._routerRoot = (this.$parent && this.$parent._routerRoot) || this
      }
      registerInstance(this, this)
    },
    destroyed () {
      registerInstance(this)
    }
  })
  // 在 Vue 的原型上定义 $router，使之可以在 Vue 组件中以 this.$router 调用
  Object.defineProperty(Vue.prototype, '$router', {
    get () { return this._routerRoot._router }
  })
  // 在 Vue 的原型上定义 $route，使之可以在 Vue 组件中以 this.$route 调用
  Object.defineProperty(Vue.prototype, '$route', {
    get () { return this._routerRoot._route }
  })
  // 全局注册 <router-view> 与 <router-link> 组件
  Vue.component('RouterView', View)
  Vue.component('RouterLink', Link)

  const strats = Vue.config.optionMergeStrategies
  // use the same hook merging strategy for route hooks
  strats.beforeRouteEnter = strats.beforeRouteLeave = strats.beforeRouteUpdate = strats.created
}
```
首先使用 Vue.mixin 全局混入了 `beforeCreate` 与 `destroyed` 两个周期函数。
接着在 Vue 的原型上定义 `$router` 和 `$route`，我们就可以在 Vue 组件中访问到 `this.$router` 和 `this.router`。
最后使用 Vue.component 全局注册 `<router-view>` 与 `<router-link>` 组件。

#### new VueRouter()
VueRouter 的构造函数：
```
  constructor (options: RouterOptions = {}) {
    this.app = null
    this.apps = []
    this.options = options
    this.beforeHooks = []
    this.resolveHooks = []
    this.afterHooks = []
    this.matcher = createMatcher(options.routes || [], this)

    let mode = options.mode || 'hash'
    this.fallback = mode === 'history' && !supportsPushState && options.fallback !== false
    if (this.fallback) {
      mode = 'hash'
    }
    if (!inBrowser) {
      mode = 'abstract'
    }
    this.mode = mode

    // 根据模式的不同实例化不同的 this.history
    switch (mode) {
      case 'history':
        this.history = new HTML5History(this, options.base)
        break
      case 'hash':
        this.history = new HashHistory(this, options.base, this.fallback)
        break
      case 'abstract':
        this.history = new AbstractHistory(this, options.base)
        break
      default:
        if (process.env.NODE_ENV !== 'production') {
          assert(false, `invalid mode: ${mode}`)
        }
    }
  }
```
VueRouter的构造函数中会根据模式的不同实例化不同的 this.history，包括 `hash`、`history`、`abstract` 三种，对应 `HashHistory`、`HTML5History`、`AbstractHistory` 三个类，
这三个类分别实现了自己的 `onReady`、`onError`、`push`、`replace`、`go`、`getCurrentLocation` 等方法，VueRouter 类向外暴露的同名方法实际上就是调用了上面三个类自己实现的方法：
```
  onReady (cb: Function, errorCb?: Function) {
    this.history.onReady(cb, errorCb)
  }

  onError (errorCb: Function) {
    this.history.onError(errorCb)
  }

  push (location: RawLocation, onComplete?: Function, onAbort?: Function) {
    this.history.push(location, onComplete, onAbort)
  }

  replace (location: RawLocation, onComplete?: Function, onAbort?: Function) {
    this.history.replace(location, onComplete, onAbort)
  }

  go (n: number) {
    this.history.go(n)
  }

  back () {
    this.go(-1)
  }

  forward () {
    this.go(1)
  }
```



