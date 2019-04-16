---
title: 开发Vue SPA 单页应用时，使用prerender-spa-plugin与vue-i18n遇到的问题 
date: 2018-11-15 12:08:10
summary: 
desc: 
tag: 
category: Vue
---

开发公司官网，需要做多语言，又要有SEO，且使用Vue开发。首先想到的是自己搭建Vue SSR，但做官网没有必要搞这么麻烦，遂想到了使用prerender-spa-plugin来做预渲染，vue-i18n来做多语言，于是有了以下大致代码：

### prerender-spa-plugin部分
```
// main.js
new Vue({
    el: '#app',
    router,
    store,
    mounted () {
        document.dispatchEvent(new Event('render-event'))
    },
    render: h => h(App)
}
```

```
// webpack.config.js
const path = require('path')
const PrerenderSPAPlugin = require('prerender-spa-plugin')
const Renderer = PrerenderSPAPlugin.PuppeteerRenderer

module.exports = {
    plugins: [
        ...
        new PrerenderSPAPlugin({
            // webpack 打包输出路径，用于插件预渲染 
            staticDir: path.join(__dirname, 'dist'),
            // 需要渲染的路由
            routes: [ '/', '/about', '/其他路由...' ],

            renderer: new Renderer({
                headless: true,
                // main.js 中 document.dispatchEvent(new('render-event'))，
                // 两者的事件名称要一致。
                renderAfterDocumentEvent: 'render-event'
            })
        })
    ]
}
```
### vue-i18n部分
```
// main.js
// 引入并use
import VueI18n from 'vue-i18n'
Vue.use(VueI18n)

// 引入语言包
import zh from './lang/zh'
import en from './lang/en'
const messages = {
    zh
    en 
}

// 实例化 
const i18n = new VueI18n({
    locale: localStorage.getItem('lang') || 'zh', // 语言
    messages
})

// 挂载到Vue上
new Vue({
    i18n,
    router,
    store,
    render: h => h(App)
}).$mount('#app')

```
运行之后却发现，切换到英文版本，再刷新，页面总会先显示中文，再快速闪回英文。 

排查原因之后发现，prerender-spa-plugin在使用Headless浏览器生成页面结构时，页面语言为中文，用户访问英文版网站时，返回的html内容为中文，js执行后会将中文再替换为英文。 
试了一些方法也没有很好的解决这个问题。 

虽然去除prerender-spa-plugin插件可以解决这个问题，但是也就失去了SEO。

##### 最终我们决定使用Nuxt.js来开发，在[这个官方demo](https://zh.nuxtjs.org/examples/i18n)的基础上进行修改，暂以generate模式打包完成官网开发。




