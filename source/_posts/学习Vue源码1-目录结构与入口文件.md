---
title: 学习Vue源码1-目录结构与入口文件
date: 2019-03-12 17:12:10
summary: 
desc: 
tag: 
category: Vue
---
学习Vue源码，我拷贝的一份源码在[这里](https://github.com/hbxywdk/FE-Record/tree/master/2019-03/Vue)，版本为2.6.8，里面有我做的各种注释。（注：暂不考虑SSR部分的代码）


### 文件结构
```
|--- core
  |--- components 组件
  |--- global-api 需要全局挂载的js都在这个文件夹，在src/core/global-api/index.js中会全部引用
  |--- instance 实例
  |--- observer 观察者
  |--- util 工具
  |--- vdom
  |--- config.js Vue自身的配置
  |--- index.js 入口文件

```
### 入口文件 src/core/index.js 
引入Vue函数，初始化全局API，挂载$isServer、$ssrContext属性与FunctionalRenderContext方法

```
// 这个就是Vue
import Vue from './instance/index'
// 初始化全局API
import { initGlobalAPI } from './global-api/index'
// 环境判断，用于判断是否是服务端
import { isServerRendering } from 'core/util/env'
// 功能渲染上下文
import { FunctionalRenderContext } from 'core/vdom/create-functional-component'

// 执行初始化全局API
initGlobalAPI(Vue)

/**
 * vm.$isServer
 * 在Vue.prototype上定义$isServer，用于判断当前 Vue 实例是否运行于服务器
 */
Object.defineProperty(Vue.prototype, '$isServer', {
  get: isServerRendering
})

/**
 * vm.$ssrContext
 * 在Vue.prototype设置$ssrContext属性
 * 可以通过 this.$ssrContext 来直接访问组件中的服务器端渲染上下文(SSR context)。
 */
Object.defineProperty(Vue.prototype, '$ssrContext', {
  get () {
    /* istanbul ignore next */
    return this.$vnode && this.$vnode.ssrContext
  }
})

// FunctionalRenderContext方法，用于SSR运行时helper安装，
// expose FunctionalRenderContext for ssr runtime helper installation
Object.defineProperty(Vue, 'FunctionalRenderContext', {
  value: FunctionalRenderContext
})

// Vue版本
Vue.version = '__VERSION__'

export default Vue

/**
 * hasOwn: 检查对象是否有某个属性
 * 
 */

```





