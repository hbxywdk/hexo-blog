---
title: Nuxt的plugins中的异步操作
date: 2019-03-27 17:06:13
summary: 
desc: 
tag: 
category: Vue
---

关于Nuxt的plugins官方文档提到的内容并不多：
```
// nuxt.config.js
module.exports = {
  plugins: ['~plugins/vue-notifications']
}
```

```
// plugins/vue-notifications.js
import Vue from 'vue'
import VueNotifications from 'vue-notifications'

Vue.use(VueNotifications)
```
plugins 属性配置的所有插件会在 Nuxt.js 应用初始化之前被加载导入。

每次你需要使用 Vue.use() 时，你需要在 plugins/ 目录下创建相应的插件文件，并在 nuxt.config.js 中的 plugins 配置项中配置插件的路径。

如果我们需要一些异步操作，比如，一个多语言网站，想要调用接口获取多语言配置文件，再挂载到Vue-i18n上，则可使用如下方法：

`导出一个默认函数，返回一个Promise（可为axios请求），异步操作完成后再进行挂载。`
```
import Vue from 'vue'
import VueI18n from 'vue-i18n'
import En from '~/locales/en.js'
import De from '~/locales/de.js'

Vue.use(VueI18n)

export default ({ app, store }) => {

  let p = new Promise(function (resolve, reject) {
    //做一些异步操作
    setTimeout(function () {

      // Set i18n instance on app
      // This way we can use it in middleware and pages asyncData/fetch
      app.i18n = new VueI18n({
        locale: store.state.locale,
        fallbackLocale: 'en',
        messages: {
          // en: require('~/locales/en.json'),
          // cn: require('~/locales/cn.json')
          en: En, // 英
          de: De, // 德
        }
      })

      app.i18n.path = link => {
        if (app.i18n.locale === app.i18n.fallbackLocale) {
          return `/${link}`
        }
        return `/${app.i18n.locale}/${link}`
      }
      resolve()

    }, 3000)
  })
  return p
}

```