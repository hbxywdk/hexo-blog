---
title: 学习Vue源码-Vue事件机制
date: 2019-05-13 16:33:53
summary: 
desc: 
tag: 
category: Vue
---
#### 这一篇来了解一下Vue的事件机制
core\instance\index.js
```
function Vue (options) {
  this._init(options)
}

initMixin(Vue) // 初始化混入
stateMixin(Vue)
eventsMixin(Vue) // 混入 Vue.prototype.$on 、$once、$off、$emit方法
lifecycleMixin(Vue)
renderMixin(Vue)

export default Vue
```
### 在this._init()方法中调用了initEvents(vm)初始化了Events；
```
core\instance\events.js
// 初始化事件
export function initEvents (vm: Component) {
  // 创建vm._events，它是一个空对象，用来存放事件
  vm._events = Object.create(null)
  // 是否存在事件钩子，初始为false
  vm._hasHookEvent = false
  // init parent attached events
  const listeners = vm.$options._parentListeners // 这个是父组件上添加的事件监听，HTML上的事件不走这里
  if (listeners) {
    updateComponentListeners(vm, listeners)
  }
}
```

### eventsMixin()方法，在Vue.prototype上定义了 $on 、$once、$off、$emit 四个方法；

#### $on
定义事件
```
  const hookRE = /^hook:/
  Vue.prototype.$on = function (event: string | Array<string>, fn: Function): Component {
    const vm: Component = this
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$on(event[i], fn)
      }
    } else {
      // 如果 vm._events 中定义过这个事件，就直接把回调 'fn' push进去
      // 没定义过这个事件就把 vm._events[event] 赋值为 []，在把 'fn' push进去
      (vm._events[event] || (vm._events[event] = [])).push(fn)
      // optimize hook:event cost by using a boolean flag marked at registration
      // instead of a hash lookup
      if (hookRE.test(event)) {
        vm._hasHookEvent = true
      }
    }
    return vm
  }
```
经过$on方法之后vm._event会变成这个样子：
```
  vm._events = {
    eventName1: [fna1, fna2],
    eventName2: [fnb1, fnb2]
  }
```

#### $once
使用该方法定义的事件只会触发一次
```
  Vue.prototype.$once = function (event: string, fn: Function): Component {
    const vm: Component = this
    function on () {
      vm.$off(event, on)
      fn.apply(vm, arguments)
    }
    on.fn = fn
    // 该事件只要执行过一次，就会执行 on 回调函数，销毁该事件
    vm.$on(event, on)
    return vm
  }
```

#### $off
移除定义的事件
```
  Vue.prototype.$off = function (event?: string | Array<string>, fn?: Function): Component {
    const vm: Component = this
    // all
    if (!arguments.length) {
      vm._events = Object.create(null)
      return vm
    }
    // event参数是个数组，循环，依次调用$off
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$off(event[i], fn)
      }
      return vm
    }
    // cbs 就是我们要 off 的事件
    const cbs = vm._events[event]
    if (!cbs) {
      return vm
    }
    // 没有fn传入，则直接销毁对应'全部'event，然后返回vm
    if (!fn) {
      vm._events[event] = null
      return vm
    }
    // 这里处理要销毁指定函数的情况
    let cb
    let i = cbs.length
    while (i--) {
      cb = cbs[i]
      if (cb === fn || cb.fn === fn) {
        cbs.splice(i, 1)
        break
      }
    }
    return vm
  }
```

#### $emit
```
  Vue.prototype.$emit = function (event: string): Component {
    const vm: Component = this
    if (process.env.NODE_ENV !== 'production') {
      const lowerCaseEvent = event.toLowerCase()
      if (lowerCaseEvent !== event && vm._events[lowerCaseEvent]) {
        tip(
          `Event "${lowerCaseEvent}" is emitted in component ` +
          `${formatComponentName(vm)} but the handler is registered for "${event}". ` +
          `Note that HTML attributes are case-insensitive and you cannot use ` +
          `v-on to listen to camelCase events when using in-DOM templates. ` +
          `You should probably use "${hyphenate(event)}" instead of "${event}".`
        )
      }
    }
    // 在 vm._events 中寻找有没有对应的事件
    let cbs = vm._events[event]
    if (cbs) {
      cbs = cbs.length > 1 ? toArray(cbs) : cbs
      // 截掉第一个event参数，保留其他参数
      const args = toArray(arguments, 1)
      const info = `event handler for "${event}"`
      for (let i = 0, l = cbs.length; i < l; i++) {
        // 带有错误处理的调用
        invokeWithErrorHandling(cbs[i], vm, args, vm, info)
      }
    }
    return vm
  }
```

core\instance\state.js 中 initState内根据参数会调用 initProps、initMethods、initData、initComputed、initWatch方法
`initMethods将每一个方法绑定在vm上，故可以以this.methodName()来调用methods{}中的方法`

`Vue中的事件可以分为两种，一类是绑定在DOM上的，另一类是绑定在组件上的自定义事件：`


### HTML事件
事件在何时进行绑定呢？
当然是在 vm.$mount 方法的执行中

看下面一段代码：
```
var vm = new Vue({
  el:'.arrow', 
  data:{a:1}, 
  template: '<div @click="b">{{ a }}</div>', 
  methods: {
    b: function() { alert(1) }
  }
})
console.log(vm.$options.render)
```
我们得到：
```
ƒ anonymous(
) {
with(this){return _c('div',{on:{"click":b}},[_v(_s(a))])}
}
```
在render函数中可以看到 {on:{"click":b}} 是_c的参数，在之前的文章我有提到 `_c 其实就是 createElement 这个方法`

执行 render 函数返回vNode树，对应的事件在 data 参数里，事件的绑定和代码运行环境有关（浏览器 和 Weex）

浏览器环境下：
platforms\web\runtime\modules\events.js
```
function add ( // 添加
  name: string,
  handler: Function,
  capture: boolean,
  passive: boolean
) {

  // code... 部分代码省略

  target.addEventListener(
    name,
    handler,
    supportsPassive
      ? { capture, passive }
      : capture
  )
}

function remove ( // 移除
  name: string,
  handler: Function,
  capture: boolean,
  _target?: HTMLElement
) {
  (_target || target).removeEventListener(
    name,
    handler._wrapper || handler,
    capture
  )
}
```
然后暴露 updateDOMListeners 来处理 vNode 变动之后的事件的变化：
```
function updateDOMListeners (oldVnode: VNodeWithData, vnode: VNodeWithData) {
  // 新老vNode都没有data.on，return
  if (isUndef(oldVnode.data.on) && isUndef(vnode.data.on)) {
    return
  }
  const on = vnode.data.on || {}
  const oldOn = oldVnode.data.on || {}
  target = vnode.elm
  normalizeEvents(on)
  // 更新事件
  updateListeners(on, oldOn, add, remove, createOnceHandler, vnode.context)
  target = undefined
}
```


### component自定义事件
关于组件的自定义事件，我们看下面的代码：
```
var vm = new Vue({
  el: '#logo',
  template: "<div>Father Text <test @show='fn'></test></div>",
  data: { },
  methods: {
    fn: function () {
      alert('Father Method')
    }
  },
  components: {
    'test': {
      template: "<div @click='cfn'>Child Text</div>",
      methods: {
        cfn: function () {
          console.log('Child Method')
          this.$emit('show')
        }
      },
    }
  }
})
console.log(vm.$options.render)
```
组件的render函数是这样的：
```
ƒ anonymous(
) {
with(this){return _c('div',[_v("Father Text "),_c('test',{on:{"show":fn}})],1)}
}
```
如果是组件的情况下，_createElement会调用 `createComponent(Ctor, data, context, children, tag)` 来创建组件

```
core\vdom\create-component.js

  // extract listeners, since these needs to be treated as
  // child component listeners instead of DOM listeners
  // 提取侦听器，因为需要将这些侦听器视为子组件侦听器而不是DOM侦听器。
  const listeners = data.on
  // replace with listeners with .native modifier
  // so it gets processed during parent component patch.
  // 替换为.NATIVE修饰符的侦听器，以便在父组件修补程序期间对其进行处理。
  data.on = data.nativeOn
```
如果绑定在组件上的事件又.native修饰符，该事件最终会和上面一样绑在DOM上，
如果没有，那么我们回到 core\instance\events.js 文件，看 initEvents 方法
```
// 初始化事件
export function initEvents (vm: Component) {
  // 创建vm._events，它是一个空对象，用来存放事件，之后会变为这个样子
  // vm._events = {
  //   eventName1: [fna1, fna2],
  //   eventName2: [fnb1, fnb2]
  // }
  vm._events = Object.create(null)
  // 是否存在事件钩子，初始为false
  vm._hasHookEvent = false
  // init parent attached events
  👇
  // 这个是父组件上添加的事件监听，HTML上的事件不走这里
  const listeners = vm.$options._parentListeners
  if (listeners) {
    updateComponentListeners(vm, listeners)
  }
  👆
}

```
箭头所指这一段代码，说明绑定在组件上的自定义事件会交由 updateComponentListeners 方法处理：
```
export function updateComponentListeners (
  vm: Component,
  listeners: Object,
  oldListeners: ?Object
) {
  target = vm
  updateListeners(listeners, oldListeners || {}, add, remove, createOnceHandler, vm)
  target = undefined
}

```

### 今天先到这把

好吧，在跳转到 updateListeners 方法：
```
core\vdom\helpers\update-listeners.js
export function updateListeners (
  on: Object,
  oldOn: Object,
  add: Function,
  remove: Function,
  createOnceHandler: Function,
  vm: Component
) {
  let name, def, cur, old, event
  for (name in on) {
    def = cur = on[name]
    old = oldOn[name]
    event = normalizeEvent(name)
    /* istanbul ignore if */
    if (__WEEX__ && isPlainObject(def)) {
      cur = def.handler
      event.params = def.params
    }
    if (isUndef(cur)) {
      process.env.NODE_ENV !== 'production' && warn(
        `Invalid handler for event "${event.name}": got ` + String(cur),
        vm
      )
    } else if (isUndef(old)) {
      if (isUndef(cur.fns)) {
        cur = on[name] = createFnInvoker(cur, vm)
      }
      if (isTrue(event.once)) {
        cur = on[name] = createOnceHandler(event.name, cur, event.capture)
      }
      add(event.name, cur, event.capture, event.passive, event.params)
    } else if (cur !== old) {
      old.fns = cur
      on[name] = old
    }
  }
  for (name in oldOn) {
    if (isUndef(on[name])) {
      event = normalizeEvent(name)
      remove(event.name, oldOn[name], event.capture)
    }
  }
}
```