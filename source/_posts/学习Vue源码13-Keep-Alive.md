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
    const slot = this.$slots.default // 所有slots数组
    // 获取 slots 中第一个有效子组件
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
        // 移除缓存 key，之后重新添加，使 key 保持最新
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
1. 首先，获取第一个子组件，接着会检测是否存在于 included 和 excluded 中，如果不在 included 或者说在 excluded 中，则是不缓存的组件，就直接返回 vnode 渲染。
2. 接着会定义一个 key 用于组件的缓存。
3. 如果缓存中存在，则直接取缓存中的 componentInstance 赋给 vnode（keep-alive的第一个slot组件） 的 componentInstance，最后返回让 render 函数渲染。
4. 如果缓存中不存在，则将其添加进缓存，并做最大缓存组件数量的处理，最后添加 keep-alive 标记，并返回 vnode。

#### mounted
```
  mounted () {
    // 监听 include，变化后执行 pruneCache
    this.$watch('include', val => {
      pruneCache(this, name => matches(val, name))
    })
    // 监听 exclude，变化后执行 pruneCache
    this.$watch('exclude', val => {
      pruneCache(this, name => !matches(val, name))
    })
  },
```
在 mounted 中使用 $watch 分别对 include 与 exclude 两个 props 进行了监听，一旦变化则执行对应函数 pruneCache。
注意：include 与 exclude 的函数参数是有区别的，一个是 name => matches(val, name) 一个是 name => !matches(val, name)。

##### pruneCache:
遍历 cache ，这里分两种情况：
一种是 include 的，当新的 include 改变，移除了某个组件，则会调用 pruneCacheEntry 函数清除该缓存。
另一种是 exclude 的，当新的 exclude 改变，添加了某个忽略，则也会调用 pruneCacheEntry 函数清除该缓存。
```
/**
 * 
 * @param {any} keepAliveInstance keep-alive实例
 * @param {Function} filter 返回是否匹配上的函数
 */
function pruneCache (keepAliveInstance: any, filter: Function) {
  // cache（create中创建的一个空对象）
  // keys（create中创建的一个空数组）
  // _vnode（keep-alive组件的_vnode属性）
  const { cache, keys, _vnode } = keepAliveInstance

  // 遍历缓存
  for (const key in cache) {
    const cachedNode: ?VNode = cache[key]
    if (cachedNode) {
      // 当前遍历组件名称
      const name: ?string = getComponentName(cachedNode.componentOptions)
      if (name && !filter(name)) {
        pruneCacheEntry(cache, key, keys, _vnode)
      }
    }
  }
  
}
```

##### matches
matches 函数用来匹配 pattern 中是否有 name，有返回 true，无返回 false。
```
function matches (pattern: string | RegExp | Array<string>, name: string): boolean {
  if (Array.isArray(pattern)) {
    return pattern.indexOf(name) > -1
  } else if (typeof pattern === 'string') {
    return pattern.split(',').indexOf(name) > -1
  } else if (isRegExp(pattern)) {
    return pattern.test(name)
  }
  /* istanbul ignore next */
  return false
}
```

##### pruneCacheEntry
销毁实例，并从 cache 中移除
```
function pruneCacheEntry (
  cache: VNodeCache,
  key: string,
  keys: Array<string>,
  current?: VNode
) {
  const cached = cache[key]
  if (cached && (!current || cached.tag !== current.tag)) {
    cached.componentInstance.$destroy()
  }
  cache[key] = null
  remove(keys, key)
}
```

#### destoryed
最后是 destoryed，这个没啥说的，keep-alive 组件销毁的时候，清空所有缓存过的内容，完事。
```
  destroyed () {
    for (const key in this.cache) {
      pruneCacheEntry(this.cache, key, this.keys)
    }
  }
```


