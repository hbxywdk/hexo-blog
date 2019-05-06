---
title: 学习Vue源码7-Vue中的$mount方法
date: 2019-05-05 14:56:34
summary: 
desc: 
tag: 
category: Vue
---
### 用法
使用 vm.$mount() 可以手动地挂载一个未挂载的实例，比如：
```
var MyComponent = Vue.extend({
  template: '<div>Hello!</div>'
})

// 创建并挂载到 #app (会替换 #app)
new MyComponent().$mount('#app')

// 如果传入了el参数，则会直接调用$mount，最终效果和上面一样
new MyComponent({ el: '#app' })

// 或者，在文档之外渲染并且随后挂载
var component = new MyComponent().$mount()
document.getElementById('app').appendChild(component.$el)
```

### 分析
```
// platforms\web\entry-runtime-with-compiler.js
const idToTemplate = cached(id => {
  const el = query(id)
  return el && el.innerHTML
})

// 缓存原型上的$mount方法，具体会跟运行环境不同而不同
// 如：浏览器 和 weex
const mount = Vue.prototype.$mount

// 接着重写$mount方法
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {

  // 查找el
  el = el && query(el)

  /* istanbul ignore if */
  // Vue不允许挂载到<html>或<body>上面
  if (el === document.body || el === document.documentElement) {
    process.env.NODE_ENV !== 'production' && warn(
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    return this
  }

  // 配置项
  const options = this.$options
  // resolve template/el and convert to render function
  // 解析template并转换为render函数
  if (!options.render) {
    // 这里有一些列的判断 👇
    let template = options.template
    if (template) {
      if (typeof template === 'string') {
        if (template.charAt(0) === '#') {
          template = idToTemplate(template)
          /* istanbul ignore if */
          if (process.env.NODE_ENV !== 'production' && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      } else if (template.nodeType) {
        template = template.innerHTML
      } else {
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        return this
      }
    } else if (el) {
      template = getOuterHTML(el)
    }
    // 我们忽略这些判断代码，最终我们得到了template 👈
    if (template) {
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile')
      }
      // 调用 compileToFunctions 方法，将template转化为render函数 👇
      // 根据 platforms\web\compiler\index.js 里的代码 compileToFunctions 方法就是
      // compiler\index.js 中 export 的 createCompiler
      const { render, staticRenderFns } = compileToFunctions(template, {
        outputSourceRange: process.env.NODE_ENV !== 'production',
        shouldDecodeNewlines,
        shouldDecodeNewlinesForHref,
        delimiters: options.delimiters,
        comments: options.comments
      }, this)
      // compileToFunctions 返回的东西可以看 compiler\index.js 里的注释
      options.render = render
      options.staticRenderFns = staticRenderFns

      /* istanbul ignore if 这个可以忽略 */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile end')
        measure(`vue ${this._name} compile`, 'compile', 'compile end')
      }
    }
  }
  // 调用缓存的$mount方法挂载Vue
  return mount.call(this, el, hydrating)
}
```
1. 首先，缓存原型上的 $mount 方法，具体会跟运行环境不同而不同，如：浏览器 和 weex。
2. 重写原型上的$mount方法，如果有el参数，则会查找该DOM元素，且Vue不允许挂载到 html 或 body 上面
3. 调用 compileToFunctions 方法将 template 转换为 render 函数
```
// compiler\index.js 
export const createCompiler = createCompilerCreator(function baseCompile (
  template: string,
  options: CompilerOptions
): CompiledResult {
  // 生成AST树
  const ast = parse(template.trim(), options)
  // 优化AST
  if (options.optimize !== false) {
    optimize(ast, options)
  }
  // generate函数会返回render与staticRenderFns
  const code = generate(ast, options)
  // 最后将 ast、render、staticRenderFns全部返回
  return {
    // AST
    ast,
    /*
      这个是render函数
      如果有这样一段代码
      var v = new Vue({
        el:'.arrow', data:{a:1}, template: '<div>{{ a }}</div>'
      })
      console.log(v.$options.render)
      会得到：
      ƒ anonymous() { with(this){return _c('div',[_v(_s(a))])} }
      _c其实就是createElement函数的内部用法
      Vue最终编译template的结果和我们直接用createElement手写render函数没两样。
    */
    render: code.render,
    // staticRenderFns 存放纯静态 render函数（就是没有使用data中的数据），比如这一段：
    // var v = new Vue({
    //   el: '.arrow', data: { a: 1 }, template: '<div>hello</div>'
    // })
    // console.log(v.$options.staticRenderFns) // 这里输出就会看到里面的东西
    staticRenderFns: code.staticRenderFns
  }
})
```
4. 将 compileToFunctions 方法返回的 render 与 staticRenderFns 挂到options上
5. 调用之前缓存的 mount.call(this, el, hydrating) 方法
```
// 之前缓存的mount方法
// platforms\web\runtime\index.js
// public mount method
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  el = el && inBrowser ? query(el) : undefined
  return mountComponent(this, el, hydrating)
}
```
我们看到缓存的$mount方法调用了 mountComponent 方法，它在 core\instance\lifecycle.js 里面
```
export function mountComponent (
  vm: Component,
  el: ?Element,
  hydrating?: boolean
): Component {
  // el
  vm.$el = el
  // 一些警告提示语
  if (!vm.$options.render) {
    // code...
  }
  // 触发 beforeMount 钩子
  callHook(vm, 'beforeMount')

  let updateComponent
  /* istanbul ignore if */
  if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
    // 非生产环境下的性能监控
    // code...
  } else {
    updateComponent = () => {
      // vm._render() 将 render函数转换为 vNode ，vm._update 以其为参数发布更新
      vm._update(vm._render(), hydrating)
    }
  }

  // we set this to vm._watcher inside the watcher's constructor 
  // since the watcher's initial patch may call $forceUpdate (e.g. inside child
  // component's mounted hook), which relies on vm._watcher being already defined

  // 我们在 watcher的 构造函数中将 vm._watcher 设置为 this（isRenderWatcher参数）
  // watcher 初始化时可能会调用 $forceUpdate 方法（比如：内部子组件的 mounted 钩子）
  // 这需要 vm._watcher 已经定义过，如下：
  // Vue.prototype.$forceUpdate = function () {
  //   const vm: Component = this
  //   if (vm._watcher) {
  //     vm._watcher.update()
  //   }
  // }

  // 实例化一个 Watcher 通过它的回调函数 updateComponent 来调用 vm._update 更新视图
  new Watcher(vm, updateComponent, noop, {
    before () {
      // Vue已挂载且没被销毁才会触发 beforeUpdate 钩子
      if (vm._isMounted && !vm._isDestroyed) {
        callHook(vm, 'beforeUpdate')
      }
    }
  }, true /* isRenderWatcher参数 */)
  hydrating = false

  // manually mounted instance, call mounted on self
  // mounted is called for render-created child components in its inserted hook
  // 修改 vm._isMounted 为 true ，手动触发 mounted 钩子
  if (vm.$vnode == null) {
    vm._isMounted = true
    callHook(vm, 'mounted')
  }
  return vm
}
```
- mountComponent 中最主要的是 调用 vm._render() 将 render函数 转换为 vNode ，再调用 vm._update 以生成的 vNode 为参数发布更新。
```
updateComponent = () => {
  vm._update(vm._render(), hydrating)
}
```
- 这里实例化一个 Watcher 通过它的回调函数 updateComponent 来调用 vm._update 更新视图
```
new Watcher(vm, updateComponent, noop, {
  before () {
    // Vue已挂载且没被销毁才会触发 beforeUpdate 钩子
    if (vm._isMounted && !vm._isDestroyed) {
      callHook(vm, 'beforeUpdate')
    }
  }
}, true /* isRenderWatcher参数 */)
```
- 修改 vm._isMounted 为 true ，触发 mounted 钩子

### 总结
- 获得模版 `template`。
- 调用 compileToFunctions 获得 template 对应的 `render函数`。
- 调用 mountComponent ，其中的 `vm._render()` 将 `render函数` 转化为 `vNode`。
- `vm._update()` 以生成的 `vNode` 为参数发布更新。