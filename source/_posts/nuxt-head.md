---
title: 使用nuxt时遇到的head问题
date: 2018-11-20 18:21:13
summary: 
desc: 
tag: 
category: Vue
---
使用Nuxt开发Vue-SSR项目，在nuxt.config.js中统一配置了head： 

```
  head: {
    title: '这是title',
    meta: [
      { charset: 'utf-8' },
      { name: 'renderer', content: 'webkit' },
      { name: 'force-rendering', content: 'webkit' },
      { 'http-equiv': 'X-UA-Compatible', content: 'IE=Edge,chrome=1' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      // code ...
    ]
  },
```

开发中发现在首页中，以上meta添加不上，切换其他页面后才会添加。 
原因： 在index.vue中，设置了head函数，却未返回任何内容，其他页面都返回了正确的内容，故切换页面才正常添加： 

```
export default {
  head() {
  }
}
```

page文件的head方法，要么不写，写了就至少需要返回一个对象 

```
export default {
  head() {
    return {
    }
  }
}
```

