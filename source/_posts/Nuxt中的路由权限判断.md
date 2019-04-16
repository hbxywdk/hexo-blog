---
title: Nuxt中的路由权限判断
date: 2018-12-13 10:52:13
summary: 
desc: 
tag: 
category: Vue
---
上个项目小试了下使用Nuxt做多语言官网，这次要做一个多语言商城项目，功能不算复杂，算是一个简化版的商城，涉及到了路由权鉴，这里记录一下。

#### Nuxt权限拦截分为两种情况，一个是直接请求页面的服务端层面拦截，另一个是在浏览器路由跳转的客户端拦截，这里需要对着两种情况做处理。 

由于服务端没有window对象，拿不到localStorage内的token，在服务端需要使用'js-cookie'，在cookie中也设置token，服务端在request中拿到cookie中的token来判断权限。在客户端则使用localStorage来判断权限。
```
import Cookies from 'js-cookie'
```

utils.js
```
// 设置localStorage
export function setStorage(name, val) {
  window.localStorage.setItem(name, JSON.stringify(val))
}
// 获取localStorage
export function getStorage(name) {
  return JSON.parse(window.localStorage.getItem(name)) || null
}

// 设置token，cookie与localStorage上都需要设置
export function setToken(token) {
  Cookies.set('token', token)
  setStorage('token', token)
}
// 获取token
export function getToken() {
  return getStorage('token')
}

// 获取request的cookie
export function getCookieFromReq(req, name) {
  if (!req.headers.cookie) return
  const valCookie = req.headers.cookie.split(';').find(c => c.trim().startsWith(`${name}=`))
  if (!valCookie) return
  const val = valCookie.split('=')[1]
  return val
}

```
登录页
```
// 处理登录
login() {
  // 校验表单
  if (!this.validate()) return
  // 登录请求省略，这里仅展示token设置
  const token = 'dsdjhfwegfiwegdvwed'
  setToken(token)
  this.$store.commit('SET_TOKEN', token)
  window.location.href = '/'
}
```

middleware文件夹下新建权鉴判断js：accountVerification.js 

（这里去除多语言判断，仅展示权鉴部分）
```
import { getCookieFromReq, getToken } from '~/utils/utils'

/**
 * 权限的验证，重定向未登录状态下的一些路由访问到登录页去
 */
export default function ({ isHMR, app, store, req, route, params, error, redirect }) {
  if (isHMR) return

  /* 登录权鉴判断部分 */
  const isClient = process.client // 是否是客户端
  const isServer = process.server // 是否是服务端
  // 服务端从cookie拿token，客户端从local中拿token
  const token = isServer ? getCookieFromReq(req, 'token') : isClient ? getToken() : null 

  /* 无权限访问，跳转到登录页 */
  if (!token) {
    redirect('/login')
  }

}

```
最后，在要使用该中间件的page中添加
```
middleware: 'accountVerification'
```
该中间件就应用到对应的页面上了。

附：[官方给出的权限判断demo](https://github.com/nuxt/example-auth0)
