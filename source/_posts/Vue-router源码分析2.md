---
title: Vue-router源码分析2-路由模式
date: 2019-07-23 20:54:33
summary: 
desc: 
tag: 
category: Vue
---

前文说到，Vue-Router 有三种模式包括 `hash`、`history`、`abstract`，对应 `HashHistory`、`HTML5History`、`AbstractHistory` 三个类。

1. hash: 使用 URL hash 值来作路由。支持所有浏览器，包括不支持 HTML5 History Api 的浏览器。
2. history: 依赖 HTML5 History API 和服务器配置。查看 HTML5 History 模式。
3. abstract: 支持所有 JavaScript 运行环境，如 Node.js 服务器端。如果发现没有浏览器的 API，路由会自动强制进入这个模式。

它们提供了一些方法的各自实现供对外暴露的 `this.history` 调用。
通常我们用到的就是 hash 和 history 两种，这里哟也只看 `HashHistory` 与 `HTML5History` 两个类。

#### HashHistory
```
export class HashHistory extends History {
  constructor (router: Router, base: ?string, fallback: boolean) {
    super(router, base)
    // check history fallback deeplinking
    if (fallback && checkFallback(this.base)) {
      return
    }
    ensureSlash()
  }

  // 延迟到 app 装载完毕，以免过早的触发 hashchange事件，
  // 此方法会在 newRouter 时会被调用
  setupListeners () {
    const router = this.router
    const expectScroll = router.options.scrollBehavior // 滚动行为函数
    const supportsScroll = supportsPushState && expectScroll

    if (supportsScroll) {
      setupScroll()
    }
    // 开启监听
    window.addEventListener(supportsPushState ? 'popstate' : 'hashchange', () => {
      const current = this.current
      if (!ensureSlash()) {
        return
      }
      // 先调用 transitionTo 之后处理 scroll 与修改 hash
      this.transitionTo(getHash(), route => {
        if (supportsScroll) {
          handleScroll(this.router, route, current, true)
        }
        if (!supportsPushState) {
          replaceHash(route.fullPath)
        }
      })
    })
  }

  push (location: RawLocation, onComplete?: Function, onAbort?: Function) {
    const { current: fromRoute } = this
    this.transitionTo(location, route => {
      pushHash(route.fullPath)
      handleScroll(this.router, route, fromRoute, false)
      onComplete && onComplete(route)
    }, onAbort)
  }

  replace (location: RawLocation, onComplete?: Function, onAbort?: Function) {
    const { current: fromRoute } = this
    this.transitionTo(location, route => {
      replaceHash(route.fullPath)
      handleScroll(this.router, route, fromRoute, false)
      onComplete && onComplete(route)
    }, onAbort)
  }

  go (n: number) {
    window.history.go(n)
  }

  ensureURL (push?: boolean) {
    const current = this.current.fullPath
    if (getHash() !== current) {
      push ? pushHash(current) : replaceHash(current)
    }
  }

  getCurrentLocation () {
    return getHash()
  }
}

```
#### HTML5History
```
export class HTML5History extends History {
  constructor (router: Router, base: ?string) {
    super(router, base)

    const expectScroll = router.options.scrollBehavior
    const supportsScroll = supportsPushState && expectScroll

    if (supportsScroll) {
      setupScroll()
    }

    const initLocation = getLocation(this.base)
    window.addEventListener('popstate', e => {
      const current = this.current

      // Avoiding first `popstate` event dispatched in some browsers but first
      // history route not updated since async guard at the same time.
      const location = getLocation(this.base)
      if (this.current === START && location === initLocation) {
        return
      }

      this.transitionTo(location, route => {
        if (supportsScroll) {
          handleScroll(router, route, current, true)
        }
      })
    })
  }

  go (n: number) {
    window.history.go(n)
  }

  push (location: RawLocation, onComplete?: Function, onAbort?: Function) {
    const { current: fromRoute } = this
    this.transitionTo(location, route => {
      pushState(cleanPath(this.base + route.fullPath))
      handleScroll(this.router, route, fromRoute, false)
      onComplete && onComplete(route)
    }, onAbort)
  }

  replace (location: RawLocation, onComplete?: Function, onAbort?: Function) {
    const { current: fromRoute } = this
    this.transitionTo(location, route => {
      replaceState(cleanPath(this.base + route.fullPath))
      handleScroll(this.router, route, fromRoute, false)
      onComplete && onComplete(route)
    }, onAbort)
  }

  ensureURL (push?: boolean) {
    if (getLocation(this.base) !== this.current.fullPath) {
      const current = cleanPath(this.base + this.current.fullPath)
      push ? pushState(current) : replaceState(current)
    }
  }

  getCurrentLocation (): string {
    return getLocation(this.base)
  }
}
```
HashHistory 监听的是 hashchange 事件，HashHistory 监听的是 popstate 事件。
HashHistory 与 HTML5History 提供了各自的 go、push、replace 等方法，并且他俩都继承自 History 类，它位于 src/history/base.js，它有这样几个主要的方法：

#### transitionTo
调用路由过渡，他会调用 confirmTransition 方法确认路由的过渡。
```
  transitionTo (
    location: RawLocation,
    onComplete?: Function,
    onAbort?: Function
  ) {
    const route = this.router.match(location, this.current)
    // 确认路由的过渡
    this.confirmTransition(
      route,
      () => {
        this.updateRoute(route)
        onComplete && onComplete(route)
        this.ensureURL()

        // fire ready cbs once // ready 回调只触发一次
        if (!this.ready) {
          this.ready = true
          this.readyCbs.forEach(cb => {
            cb(route)
          })
        }
      },
      err => {
        if (onAbort) {
          onAbort(err)
        }
        if (err && !this.ready) {
          this.ready = true
          this.readyErrorCbs.forEach(cb => {
            cb(err)
          })
        }
      }
    )
  }
```

#### confirmTransition
确认路由的过渡。
```
  // 确认过渡
  confirmTransition (route: Route, onComplete: Function, onAbort?: Function) {
    const current = this.current
    const abort = err => {
      // 当用户使用前进后退按钮时，我们不想抛出错误。我们只想在调用 push/replace 时抛出。这是它不包含在 isError 中的原因
      if (!isExtendedError(NavigationDuplicated, err) && isError(err)) {
        if (this.errorCbs.length) {
          this.errorCbs.forEach(cb => {
            cb(err)
          })
        } else {
          warn(false, 'uncaught error during route navigation:')
          console.error(err)
        }
      }
      onAbort && onAbort(err)
    }
    if (
      isSameRoute(route, current) &&
      // in the case the route map has been dynamically appended to
      route.matched.length === current.matched.length
    ) {
      this.ensureURL()
      return abort(new NavigationDuplicated(route))
    }

    // updated, deactivated, activated 生命周期钩子函数，deactivated 是当前路由的，其他两个是下一个路由的
    const { updated, deactivated, activated } = resolveQueue(
      this.current.matched, // 当前路由
      route.matched // 目标路由
    )
    
    // 执行队列
    const queue: Array<?NavigationGuard> = [].concat(
      // 组件内的 leave 导航(即 deactivated 钩子)
      extractLeaveGuards(deactivated),
      // 全局的(VueRouter) before 钩子
      this.router.beforeHooks,
      // 组件内的 updated 钩子
      extractUpdateHooks(updated),
      // in-config enter guards
      // 配置的进入钩子 activated
      activated.map(m => m.beforeEnter),
      // 处理异步组件，然后触发 activated 钩子
      resolveAsyncComponents(activated)
    )

    this.pending = route

    // 该迭代器后面会依次迭代 queue
    const iterator = (hook: NavigationGuard, next) => {
      if (this.pending !== route) {
        return abort()
      }
      try {
        hook(route, current, (to: any) => {
          if (to === false || isError(to)) {
            // next(false) -> abort navigation, ensure current URL
            this.ensureURL(true)
            abort(to)
          } else if (
            typeof to === 'string' ||
            (typeof to === 'object' &&
              (typeof to.path === 'string' || typeof to.name === 'string'))
          ) {
            // next('/') or next({ path: '/' }) -> redirect
            abort()
            if (typeof to === 'object' && to.replace) {
              this.replace(to)
            } else {
              this.push(to)
            }
          } else {
            // confirm transition and pass on the value
            next(to)
          }
        })
      } catch (e) {
        abort(e)
      }
    }

    // 运行队列
    runQueue(queue, iterator, () => {
      const postEnterCbs = []
      const isValid = () => this.current === route
      // wait until async components are resolved before
      // extracting in-component enter guards
      // 等异步组件执行完成再提取组件内钩子，使用 runQueue 再次迭代
      const enterGuards = extractEnterGuards(activated, postEnterCbs, isValid)
      const queue = enterGuards.concat(this.router.resolveHooks)
      runQueue(queue, iterator, () => {
        if (this.pending !== route) {
          return abort()
        }
        this.pending = null
        onComplete(route)
        if (this.router.app) {
          this.router.app.$nextTick(() => {
            postEnterCbs.forEach(cb => {
              cb()
            })
          })
        }
      })
    })
  }
```
取出当前组件的 deactivated 生命周期函数，目标路由的 updated, activated 生命周期函数。
将它们与全局钩子函数组合成一个名为 queue 的队列。又定义了一个名为 iterator 的迭代器。
调用 runQueue 方法，使用 iterator 来迭代执行 queue。runQueue 执行完之后再对异步加载的组件执行一此 runQueue。
最后调用 updateRoute 更新路由：
```
  // 更新路由
  updateRoute (route: Route) {
    const prev = this.current
    this.current = route
    this.cb && this.cb(route)
    this.router.afterHooks.forEach(hook => {
      hook && hook(route, prev)
    })
  }
```


