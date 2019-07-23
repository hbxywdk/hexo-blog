---
title: Vue-router源码分析3-视图更新
date: 2019-07-23 20:54:33
summary: 
desc: 
tag: 
category: Vue
---

transitionTo 与 confirmTransition 修改的只是 URL 与数据，视图是如何更新的呢？

VueRouter全局注册 <router-view> 与 <router-link> 组件
#### <router-view>
```
export default {
  name: 'RouterView',
  functional: true,
  props: {
    // 命名视图（https://router.vuejs.org/zh/guide/essentials/named-views.html）
    // 用的不多，通常就是默认值 'default' 
    name: {
      type: String,
      default: 'default'
    }
  },
  render (_, { props, children, parent, data }) {
    // used by devtools to display a router-view badge
    data.routerView = true

    // 直接使用父上下文的createElement（）函数
    // 使router-view渲染的组件可以解析命名slots
    const h = parent.$createElement // 父组件的createElement()函数
    const name = props.name // 传入的视图名
    const route = parent.$route
    // routerView 缓存
    const cache = parent._routerViewCache || (parent._routerViewCache = {})

    // determine current view depth, also check to see if the tree
    // has been toggled inactive but kept-alive.
    let depth = 0
    let inactive = false
    while (parent && parent._routerRoot !== parent) {
      const vnodeData = parent.$vnode && parent.$vnode.data
      if (vnodeData) {
        if (vnodeData.routerView) {
          depth++
        }
        if (vnodeData.keepAlive && parent._inactive) {
          inactive = true
        }
      }
      parent = parent.$parent
    }
    data.routerViewDepth = depth

    // 如果树处于待用状态并保持活动状态，则渲染上一个视图
    if (inactive) {
      return h(cache[name], data, children)
    }

    const matched = route.matched[depth]
    // 未匹配到，渲染空节点
    if (!matched) {
      cache[name] = null
      return h()
    }

    // 默认取 ‘default’ 组件 或 取传入的命名组件
    const component = cache[name] = matched.components[name]

    // 附带实例注册钩子，它将会在实例的注入生命周期时被调用
    data.registerRouteInstance = (vm, val) => {
      // val could be undefined for unregistration
      const current = matched.instances[name] // 组件实例
      if (
        (val && current !== vm) ||
        (!val && current === vm)
      ) {
        matched.instances[name] = val
      }
    }

    ;(data.hook || (data.hook = {})).prepatch = (_, vnode) => {
      matched.instances[name] = vnode.componentInstance
    }

    data.hook.init = (vnode) => {
      if (vnode.data.keepAlive &&
        vnode.componentInstance &&
        vnode.componentInstance !== matched.instances[name]
      ) {
        matched.instances[name] = vnode.componentInstance
      }
    }

    let propsToPass = data.props = resolveProps(route, matched.props && matched.props[name])
    if (propsToPass) {
      // clone to prevent mutation
      propsToPass = data.props = extend({}, propsToPass)
      // pass non-declared props as attrs
      const attrs = data.attrs = data.attrs || {}
      for (const key in propsToPass) {
        if (!component.props || !(key in component.props)) {
          attrs[key] = propsToPass[key]
          delete propsToPass[key]
        }
      }
    }

    return h(component, data, children)
  }
}
```
主要是根据匹配到的路由的不同，render 函数渲染不同的视图。

#### 监听 _route
```
  src/install.js
  // 全局注入 beforeCreate 与 destroyed 
  Vue.mixin({
    beforeCreate () {
      /**
       * 我们在 new Vue() 时传入 router，vue就会把 router 挂载到 this.$options 上，
       * 这里判断 this.$options.router 是否存在，
       * 这就是 new Vue() 需要传入 router 的原因
       */
      if (isDef(this.$options.router)) {
        this._routerRoot = this // Vue
        this._router = this.$options.router // VueRouter
        this._router.init(this) // 调用 VueRouter init 方法
        // 添加对 ‘_route’ 的监听。
        // 调用 history.transitionTo，改变路由后会改变 ‘_route’，
        // 就会使 ‘<router-view>’ 组件的 render 方法重新渲染。
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
```

#### 修改 _route
1. 在 VueRouter 的 init 方法中提供一个回调函数，并调用 history.listen。 这个回调函数会去修改 `_route` 
```
  history.listen(route => {
    this.apps.forEach((app) => {
      app._route = route
    })
  })
```
2. history.listen 保存回调函数
```
  listen (cb: Function) {
    this.cb = cb
  }
```
3. confirmTransition 方法执行成功后，调用 this.updateRoute(route) 他会调用之前保存的回调函数改变 _route。_route改变后，RouterView 的 render 方法会重新执行渲染界面。
```
  // 更新路由
  updateRoute (route: Route) {
    const prev = this.current
    this.current = route
    this.cb && this.cb(route) // <======
    this.router.afterHooks.forEach(hook => {
      hook && hook(route, prev)
    })
  }
```