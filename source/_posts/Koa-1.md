---
title: Koa源码1
date: 2019-05-15 16:50:34
summary: 
desc: 
tag: 
category: Node
---
### 前言
再开一坑，学习一下Koa的源码，好在Koa的源码不长且易读，这个坑应该很快能填上。
`Koa的版本为 2.7.0`

### Koa的使用
1. 安装 Node 环境（Koa 依赖 node v7.6.0 或 ES2015及更高版本和 async 方法支持）
2. 安装 Koa： npm i koa
3. 创建如下 app.js 文件并运行：node app.js
```
// app.js
const Koa = require('koa');
const app = new Koa();

app.use(async ctx => {
  ctx.body = 'Hello World';
});

app.listen(3000)
```
打开浏览器访问 localhost:3000，将会看到 'Hello World'.

### 入口文件application.js
了解了最简单的使用，现在开始分析。
从 koa 的 package.json 文件中可以看到其主入口是 "main": "lib/application.js"
application.js 暴露出一个 class Application，这个 Application 就是 koa，它继承了 [events](https://nodejs.org/dist/latest-v10.x/docs/api/events.html)，让 koa 可以监听与触发事件。

我们以上面的 app.js 为例，开始分析：
#### new Koa()
```
module.exports = class Application extends Emitter {
  constructor() {
    super();
    // 属性定义
    this.proxy = false;
    this.middleware = []; // 存放所有 use 的中间件
    this.subdomainOffset = 2;
    this.env = process.env.NODE_ENV || 'development';
    // 其他三个文件，导出的都是 Object
    this.context = Object.create(context);
    this.request = Object.create(request);
    this.response = Object.create(response);
    if (util.inspect.custom) {
      this[util.inspect.custom] = this.inspect;
    }
  }
}
```
这一步比较简单，定义了一些属性，将 context、request、response 分别挂在 this.context、this.request、this.response上。

#### app.use()
```
  use(fn) {
    if (typeof fn !== 'function') throw new TypeError('middleware must be a function!'); // 中间件必须为函数
    // 检查是否是 generator 函数，如果是则会给出提示：将会在 3.x 版本移除对 generator 函数的支持
    if (isGeneratorFunction(fn)) {
      deprecate('Support for generators will be removed in v3. ' +
                'See the documentation for examples of how to convert old middleware ' +
                'https://github.com/koajs/koa/blob/master/docs/migration.md');
      fn = convert(fn);
    }
    debug('use %s', fn._name || fn.name || '-');
    // 将中间件函数 push 到 this.middleware中
    this.middleware.push(fn);
    return this;
  }
```
use 也比较简单，它对入参 fn 做了限制，如果 fn 是 generator 函数的话，会经过 convert() 的转换，最后 push 到 this.middleware 中。

#### app.listen(3000);
```
  listen(...args) {
    debug('listen');
    const server = http.createServer(this.callback());
    return server.listen(...args);
  }
```
使用 http.createServer 创建 Node 服务，其参数为 this.callback()，下面看下 this.callback 都写了什么：

#### this.callback
```
  callback() {
    // compose 会使用 Promise.resolve 处理各个中间件，最后返回一个函数，这个函数再依次执行中间件时会用到。
    const fn = compose(this.middleware);
    if (!this.listenerCount('error')) this.on('error', this.onerror);
    // 定义handleRequest 👇
    const handleRequest = (req, res) => {
      // ctx
      const ctx = this.createContext(req, res);
      return this.handleRequest(ctx, fn);
    };
    // 👆
    return handleRequest;
  }
```
定义 handleRequest 并返回，在 handleRequest 中 定义 `ctx`，又执行并返回 this.handleRequest(ctx, fn)，
所以 const handleRequest = (req, res) => { // code... } 才是 http.createServer 的参数。

之后 server.listen(...args) 启动了服务，当我们收到服务之后 👇

#### this.createContext - 创建ctx

```
  createContext(req, res) { // 参数 req、res 是 http.createServer 中得到的 req、res
    // context 是一个Object，request与response会挂载在它上面
    const context = Object.create(this.context);
    const request = context.request = Object.create(this.request);
    const response = context.response = Object.create(this.response);

    context.app = request.app = response.app = this; // 将它们的 app 属性全部指向 this
    context.req = request.req = response.req = req; // 挂载原始的 req 在各自 req 属性上
    context.res = request.res = response.res = res; // 挂载原始的 res 在各自 res 属性上
    request.ctx = response.ctx = context; // 挂载 response 到 request、response 的 ctx 属性上
    request.response = response;
    response.request = request;
    context.originalUrl = request.originalUrl = req.url; // 挂载请求的 url
    context.state = {}; // state
    return context; // 返回
  }
```
createContext 创建了 context，并在 context、request、response 上挂载了各种属性，同时又将 request、response 挂载在 context 上，最后返回。

#### this.handleRequest(ctx, fn)
```
  handleRequest(ctx, fnMiddleware) {
    const res = ctx.res;
    res.statusCode = 404;
    // 错误处理
    const onerror = err => ctx.onerror(err);
    // 处理 response
    const handleResponse = () => respond(ctx);
    // 当HTTP请求关闭、完成或发生错误时执行 onerror 回调
    onFinished(res, onerror);
    // 使用 Promise.resolve() 依次执行中间件，所有中间件执行完成，则会调用 respond(ctx) 自动帮我们 res.end()
    return fnMiddleware(ctx).then(handleResponse).catch(onerror);
  }
```
主要看这句 `fnMiddleware(ctx).then(handleResponse).catch(onerror)`，这里使用 Promise.resolve() 依次执行各中间件，最后执行.then()，结束请求。


