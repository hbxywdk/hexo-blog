---
title: 学习Vue源码2
date: 2019-03-13 17:12:10
summary: 
desc: 
tag: 
category: Vue
---
### 全局api挂载 src/core/global-api/index.js
在Vue上挂载Vue的配置文件、工具、属性，初始化各种全局方法:

* Vue.util  各种工具函数 
* Vue.set/delete 
* Vue.nextTick 
* Vue.options
* initUse(Vue)  挂载Vue.use方法
* initMixin(Vue)  挂载Vue.mixin方法
* initExtend(Vue)  挂载方法（使用 Vue 的基础构造函数，创建一个“子类(subclass)”。）
* initAssetRegisters(Vue)

* Vue.extend需要单独提一下

1. 在Vue.extend的内部定义一个Sub，Sub继承于Super（指Vue）
2. Vue.extend()返回Sub，Sub 是 Vue 的子类
3. 所以 'new Vue({});' 与 'var p = Vue.extend({}); new P();' 实际上是类似的东西

```
  Vue.cid = 0
  let cid = 1

  /**
   * 定义一个Sub函数，继承于Vue，然后返回
   * Class inheritance
   */
  Vue.extend = function (extendOptions: Object): Function {
    extendOptions = extendOptions || {}

    // Super 指向 Vue
    const Super = this
    
    const SuperId = Super.cid
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {})
    if (cachedCtors[SuperId]) {
      return cachedCtors[SuperId]
    }

    const name = extendOptions.name || Super.options.name
    if (process.env.NODE_ENV !== 'production' && name) {
      validateComponentName(name)
    }

    // 定义一个Sub函数，继承Vue，然后返回
    const Sub = function VueComponent (options) {
      this._init(options)
    }
    Sub.prototype = Object.create(Super.prototype)
    Sub.prototype.constructor = Sub
    Sub.cid = cid++
    Sub.options = mergeOptions(
      Super.options,
      extendOptions
    )
    Sub['super'] = Super
    
    // 对于props与computed属性，我们在扩展时定义代理getter在Vue实例
    // 这样可以避免对创建的每个实例进行Object.DefineProperty调用。

    // 配置有props，初始化props
    if (Sub.options.props) {
      initProps(Sub)
    }

    // 配置有computed，初始化computed
    if (Sub.options.computed) {
      initComputed(Sub)
    }

    // 允许进一步使用 extension/mixin/plugin
    Sub.extend = Super.extend
    Sub.mixin = Super.mixin
    Sub.use = Super.use

    // create asset registers, so extended classes
    // can have their private assets too.
    ASSET_TYPES.forEach(function (type) {
      Sub[type] = Super[type]
    })

    // enable recursive self-lookup
    if (name) {
      Sub.options.components[name] = Sub
    }

    // 在扩展时保留对超类的配置项引用
    // 在之后的实例化时，我们可以检查超类的配置项是否已更新
    Sub.superOptions = Super.options
    Sub.extendOptions = extendOptions
    Sub.sealedOptions = extend({}, Sub.options)

    // 缓存构造函数
    // cache constructor
    cachedCtors[SuperId] = Sub

    // 返回Sub
    return Sub
  }
```

