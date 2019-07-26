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

#### <router-link>
```
export default {
  name: 'RouterLink',
  props: {
    to: {
      type: toTypes,
      required: true
    },
    tag: { // 组件渲染成的标签名，默认为a
      type: String,
      default: 'a'
    },
    exact: Boolean,
    append: Boolean,
    replace: Boolean,
    activeClass: String,
    exactActiveClass: String,
    event: { // 声明可以用来触发导航的事件。
      type: eventTypes,
      default: 'click'
    }
  },
  render (h: Function) {
    const router = this.$router
    const current = this.$route
    const { location, route, href } = router.resolve(
      this.to,
      current,
      this.append
    )

    const classes = {}
    // <router-link> 的默认“激活 class 类名。https://router.vuejs.org/zh/api/#linkactiveclass
    const globalActiveClass = router.options.linkActiveClass
    // 全局配置 <router-link> 精确激活的默认的 class。https://router.vuejs.org/zh/api/#linkexactactiveclass
    const globalExactActiveClass = router.options.linkExactActiveClass
    // 如果没传 linkActiveClass 或 linkExactActiveClass，为它俩设置默认值
    const activeClassFallback =
      globalActiveClass == null ? 'router-link-active' : globalActiveClass
    const exactActiveClassFallback =
      globalExactActiveClass == null
        ? 'router-link-exact-active'
        : globalExactActiveClass
    // router-link 没有传入 active-class 属性，就将其赋值为全局配置的 linkActiveClass
    const activeClass =
      this.activeClass == null ? activeClassFallback : this.activeClass
    // router-link 没有传入 exact-active-class 属性，就将其赋值为全局配置的 linkExactActiveClass
    const exactActiveClass =
      this.exactActiveClass == null
        ? exactActiveClassFallback
        : this.exactActiveClass
    // 对重定向的处理
    const compareTarget = route.redirectedFrom
      ? createRoute(null, normalizeLocation(route.redirectedFrom), null, router)
      : route

    classes[exactActiveClass] = isSameRoute(current, compareTarget)
    classes[activeClass] = this.exact
      ? classes[exactActiveClass]
      : isIncludedRoute(current, compareTarget)

    // 事件处理函数
    const handler = e => {
      if (guardEvent(e)) {
        // 调用 router.replace 或 router.push 跳转路由
        if (this.replace) {
          router.replace(location)
        } else {
          router.push(location)
        }
      }
    }

    const on = { click: guardEvent }
    if (Array.isArray(this.event)) {
      this.event.forEach(e => {
        on[e] = handler
      })
    } else {
      on[this.event] = handler
    }

    // 构造 createElement 的 data 参数
    const data: any = {
      class: classes
    }

    if (this.tag === 'a') {
      data.on = on
      data.attrs = { href }
    } else {
      // find the first <a> child and apply listener and href
      const a = findAnchor(this.$slots.default)
      if (a) {
        // in case the <a> is a static node
        a.isStatic = false
        const aData = (a.data = extend({}, a.data))
        aData.on = on
        const aAttrs = (a.data.attrs = extend({}, a.data.attrs))
        aAttrs.href = href
      } else {
        // doesn't have <a> child, apply listener to self
        data.on = on
      }
    }

    return h(this.tag, data, this.$slots.default)
  }
}
```

<router-link> 组件比较简单，首先处理全局配置的 linkActiveClass 与 linkExactActiveClass，之后处理 router-link 组件的 active-class 属性与 exact-active-class 属性。
构造 createElement 的 data 参数，包括 `on`、`attrs`。handel 函数为事件的回调函数：
```
  const handler = e => {
    if (guardEvent(e)) {
      // 调用 router.replace 或 router.push 跳转路由
      if (this.replace) {
        router.replace(location)
      } else {
        router.push(location)
      }
    }
  }
```
guardEvent 函数会过滤掉无需处理事件，最后根据是否有 replace 属性，调用 router.replace 或 router.push 跳转路由。