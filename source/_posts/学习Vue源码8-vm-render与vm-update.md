---
title: 学习Vue源码8-vm._render与vm._update
date: 2019-05-06 09:35:36
summary: 
desc: 
tag: 
category: Vue
---
#### 接上篇

### $mount方法总结
- 获得模版 `template`。
- 调用 compileToFunctions 获得 template 对应的 `render函数`。
- 调用 mountComponent ，其中的 `vm._render()` 将 `render函数` 转化为 `vNode`。
- `vm._update()` 以生成的 `vNode` 为参数发布更新。

### vm._render()
```
core\instance\render.js
Vue.prototype._render = function (): VNode {
  const vm: Component = this
  // 这个 render 是之前以 template 生成的 'render函数'，生成后它就在 vm.$options 上挂着，这里将他取出。
  const { render, _parentVnode } = vm.$options

  if (_parentVnode) {
    vm.$scopedSlots = normalizeScopedSlots(
      _parentVnode.data.scopedSlots,
      vm.$slots,
      vm.$scopedSlots
    )
  }

  // 设置父vNode，允许 render函数 访问占位节点上的数据
  vm.$vnode = _parentVnode
  // render self
  let vnode
  try {
    // There's no need to maintain a stack becaues all render fns are called
    // separately from one another. Nested component's render fns are called
    // when parent component is patched.
    currentRenderingInstance = vm

    // vm._renderProxy在core\instance\init.js中，这里可以看做this
    // vnode = render.call(this, vm.$createElement)
    vnode = render.call(vm._renderProxy, vm.$createElement) // 👈👈👈👈👈
    
  } catch (e) {
    handleError(e, vm, `render`)
    // return error render result,
    // or previous vnode to prevent render error causing blank component
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production' && vm.$options.renderError) {
      try {
        vnode = vm.$options.renderError.call(vm._renderProxy, vm.$createElement, e)
      } catch (e) {
        handleError(e, vm, `renderError`)
        vnode = vm._vnode
      }
    } else {
      vnode = vm._vnode
    }
  } finally {
    currentRenderingInstance = null
  }
  // if the returned array contains only a single node, allow it
  // 如果返回的数组只有一个元素，则 vnode = vnode[0]
  if (Array.isArray(vnode) && vnode.length === 1) {
    vnode = vnode[0]
  }
  // return empty vnode in case the render function errored out
  if (!(vnode instanceof VNode)) {
    if (process.env.NODE_ENV !== 'production' && Array.isArray(vnode)) {
      warn(
        'Multiple root nodes returned from render function. Render function ' +
        'should return a single root node.',
        vm
      )
    }
    // render 函数抛错则返回一个空vNode
    vnode = createEmptyVNode()
  }
  // set parent
  vnode.parent = _parentVnode
  return vnode
}
```
vm._render主要是这一句：`vnode = render.call(vm._renderProxy, vm.$createElement)`，第一个参数可以直接看做this，第二个参数是 createElement 方法。

### vm.$options.render 的内容
以这段代码为例：
```
var vm = new Vue({
  el: '.logo',
  data: { a: 1 },
  template: `
            <div>
              hello{{ a }}
              <div>111</div>
              <div>222</div>
            </div>
            `
})
console.log(vm.$options.render)
```
这里输出的是一段匿名函数
```
(function anonymous(
) {
  with(this){return _c('div',[_v("hello"+_s(a)),_c('div',[_v("111")]),_c('div',[_v("222")])])}
})
```
这些函数简写对应如下：
_c = createElement // createElement 其实就是 _createElement
_v = createTextVNode
_s = toString
// 等.....其他的可以在 core\instance\render-helpers\index.js 找。

### _createElement方法
```
// core\vdom\create-element.js
export function _createElement (
  context: Component,
  tag?: string | Class<Component> | Function | Object,
  data?: VNodeData,
  children?: any,
  normalizationType?: number
): VNode | Array<VNode> {
  if (isDef(data) && isDef((data: any).__ob__)) {
    process.env.NODE_ENV !== 'production' && warn(
      `Avoid using observed data object as vnode data: ${JSON.stringify(data)}\n` +
      'Always create fresh vnode data objects in each render!',
      context
    )
    return createEmptyVNode()
  }
  // object syntax in v-bind
  if (isDef(data) && isDef(data.is)) {
    tag = data.is
  }
  if (!tag) {
    // in case of component :is set to falsy value
    return createEmptyVNode()
  }
  // warn against non-primitive key
  if (process.env.NODE_ENV !== 'production' &&
    isDef(data) && isDef(data.key) && !isPrimitive(data.key)
  ) {
    if (!__WEEX__ || !('@binding' in data.key)) {
      warn(
        'Avoid using non-primitive value as key, ' +
        'use string/number value instead.',
        context
      )
    }
  }
  // support single function children as default scoped slot
  if (Array.isArray(children) &&
    typeof children[0] === 'function'
  ) {
    data = data || {}
    data.scopedSlots = { default: children[0] }
    children.length = 0
  }
  if (normalizationType === ALWAYS_NORMALIZE) {
    children = normalizeChildren(children)
  } else if (normalizationType === SIMPLE_NORMALIZE) {
    children = simpleNormalizeChildren(children)
  }
  let vnode, ns
  if (typeof tag === 'string') {
    let Ctor
    ns = (context.$vnode && context.$vnode.ns) || config.getTagNamespace(tag)

    // 检查是否是当前运行环境（默认指浏览器）下存在的标签名，方法在：platforms\web\util\element.js中
    if (config.isReservedTag(tag)) {
      // platform built-in elements
      // 创建 vNode
      vnode = new VNode(
        config.parsePlatformTagName(tag), data, children,
        undefined, undefined, context
      )
    } else if ((!data || !data.pre) && isDef(Ctor = resolveAsset(context.$options, 'components', tag))) {
      // component
      // 创建组件
      vnode = createComponent(Ctor, data, context, children, tag)
    } else {
      // unknown or unlisted namespaced elements
      // check at runtime because it may get assigned a namespace when its
      // parent normalizes children
      // 未知元素
      vnode = new VNode(
        tag, data, children,
        undefined, undefined, context
      )
    }
  } else {
    // direct component options / constructor
    // 直接就是个组件
    vnode = createComponent(tag, data, context, children)
  }

  // return vnode 的各种判断
  if (Array.isArray(vnode)) {
    return vnode
  } else if (isDef(vnode)) {
    if (isDef(ns)) applyNS(vnode, ns)
    if (isDef(data)) registerDeepBindings(data)
    return vnode
  } else {
    return createEmptyVNode()
  }
}
```
- 如果tag是浏览器中存在的标签，则返回 `new Vnode()`
- 如果是个组件，则返回 `createComponent()`
- 如果是未知元素也返回 `new VNode()`

resolveAsset：寻找options中对应组件，作为 `createComponent` 的第一个参数
```
core\util\options.js
export function resolveAsset (
  options: Object,
  type: string,
  id: string,
  warnMissing?: boolean
): any {
  /* istanbul ignore if */
  if (typeof id !== 'string') {
    return
  }
  const assets = options[type] // 找出options中的所有组件 --> vm.$options['components']

  // 先检查本地的 components 有没有对应的组件（对应形参id）
  if (hasOwn(assets, id)) return assets[id]

  // 上面一步如果没找到，则将组件名称转为驼峰写法。
  const camelizedId = camelize(id)
  
  // 用驼峰写法的组件名再次寻找
  if (hasOwn(assets, camelizedId)) return assets[camelizedId]

  // 还找不到，则将组件名首字母转为大写，再找一次
  const PascalCaseId = capitalize(camelizedId)
  if (hasOwn(assets, PascalCaseId)) return assets[PascalCaseId]

  // fallback to prototype chain
  const res = assets[id] || assets[camelizedId] || assets[PascalCaseId]

  // 找不到组件警告
  if (process.env.NODE_ENV !== 'production' && warnMissing && !res) {
    warn(
      'Failed to resolve ' + type.slice(0, -1) + ': ' + id,
      options
    )
  }
  return res
}
```
最终生成了vNode：
![vNode](https://raw.githubusercontent.com/hbxywdk/hexo-blog/master/assets/2019-05/vNode.jpg)


### vm._update()
```
// core\instance\lifecycle.js
Vue.prototype._update = function (vnode: VNode, hydrating?: boolean) {
  const vm: Component = this
  const prevEl = vm.$el
  const prevVnode = vm._vnode
  const restoreActiveInstance = setActiveInstance(vm)
  vm._vnode = vnode

  // 没有vm._vnode说明没有 mount过，这里走初始化流程
  if (!prevVnode) {
    // initial render
    vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */)
  }
  // 有vm._vnode说明已经 mount过，这里走更新流程
  else {
    // updates
    vm.$el = vm.__patch__(prevVnode, vnode)
  }
  
  restoreActiveInstance()

  // 更新 __vue__ 引用
  if (prevEl) {
    prevEl.__vue__ = null
  }
  if (vm.$el) {
    vm.$el.__vue__ = vm
  }
  if (vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode) {
    vm.$parent.$el = vm.$el
  }
}
```
这里的 `vm.__patch__` 就是 `core\vdom\patch.js` 中的 `patch` 方法。
#### `之后 patch函数 会使用 diff 算法来更新 DOM。`
