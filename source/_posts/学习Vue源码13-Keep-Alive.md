---
title: 学习Vue源码13-Keep-Alive
date: 2019-07-02 18:04:41
summary: 
desc: 
tag: 
category: Vue
---
keep-alive组件本身就是一个组件，其代码位于 `core/components/keep-alive.js` 中:
```
export default {
  name: 'keep-alive',
  abstract: true,

  props: {
    include: patternTypes, // 字符串或正则表达式。只有名称匹配的组件会被缓存。
    exclude: patternTypes, // 字符串或正则表达式。任何名称匹配的组件都不会被缓存。
    max: [String, Number] // 数字。最多可以缓存多少组件实例。
  },
  
  // created
  created () {
    // code...
  },

  // mounted
  mounted () {
    // code...
  },

  // destroyed 时销毁虽有组件
  destroyed () {
    // code...
  },

  render () {
    // code...
  }
}

```

首先，定义了三个 props，对应[keep-alive文档](https://cn.vuejs.org/v2/api/#keep-alive) 中的三个可传参数。

接下来，按着 vue 生命周期来看，由于 keep-alive 组件使用了 render 方法，则这里的生命周期为：created -> render -> mounted -> destroyed。

#### created
这一步比较简单，定义了一个空对象 cache，一个空数组 key 用来存放要缓存的内容：
```
  created () {
    this.cache = Object.create(null)
    this.keys = []
  }
```

#### render
接下来是 render 函数，这一步代码比较多，也是 keep-alive 的核心内容：
```
  render () {
    const slot = this.$slots.default // 获取 slot
    // 获取 slot 中第一个有效 component
    const vnode: VNode = getFirstComponentChild(slot) 
    const componentOptions: ?VNodeComponentOptions = vnode && vnode.componentOptions // vnode 的配置项
    if (componentOptions) {
      // check pattern
       // 组件名，没有组件名就返回 tag 名
      const name: ?string = getComponentName(componentOptions)
      const { include, exclude } = this
      // 不在 included 或者说 在 excluded 中，则是不缓存的组件，直接返回 vnode。
      if (
        // not included
        (include && (!name || !matches(include, name))) ||
        // excluded
        (exclude && name && matches(exclude, name))
      ) {
        return vnode
      }

      const { cache, keys } = this
      // vnode 有 key 则赋值为 key，没 key 则赋一个 key，这个 key 用于缓存组件
      const key: ?string = vnode.key == null
        // same constructor may get registered as different local components
        // so cid alone is not enough (#3269)
        ? componentOptions.Ctor.cid + (componentOptions.tag ? `::${componentOptions.tag}` : '')
        : vnode.key

      // 已缓存过，直接取缓存中的 componentInstance 给 vnode
      if (cache[key]) {
        vnode.componentInstance = cache[key].componentInstance
        // make current key freshest
        remove(keys, key)
        keys.push(key)
      // 未缓存过，添加缓存
      } else {
        cache[key] = vnode
        keys.push(key)
        // prune oldest entry
        // 最大缓存组件
        if (this.max && keys.length > parseInt(this.max)) {
          pruneCacheEntry(cache, keys[0], keys, this._vnode)
        }
      }
      // keepAlive 标记
      vnode.data.keepAlive = true
    }
    return vnode || (slot && slot[0])
  }
```
#### mounted

#### destoryed

