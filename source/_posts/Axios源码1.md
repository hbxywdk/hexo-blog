---
title: Axios源码1-入口文件
date: 2019-07-12 20:30:41
summary: 
desc: 
tag: 
category: Js
---
Axios 版本 0.19.0

#### 目录结构
```
-- lib
  -- adapters // 请求方法，分为浏览器与 Node.js 两个环境
  -- cancel // Axios 取消请求相关
  -- core // Axios 核心
  -- helpers // 存放辅助函数
  -- axios.js // 入口文件
  -- defaults.js // Axios 默认配置
  -- utils.js // 工具方法

```

#### 入口文件
axios 的 入口文件为 lib/axios.js:
```
// 创建一个 Axios 实例
function createInstance(defaultConfig) {
  var context = new Axios(defaultConfig);
  // 使用 bind 包装一下，以提供直接调用 axios({url: 'xxx', ...}) 的能力
  var instance = bind(Axios.prototype.request, context);

  // 拷贝 axios.prototype 到 instance 上
  utils.extend(instance, Axios.prototype, context);

  // 拷贝 context 到 instance 上
  utils.extend(instance, context);

  return instance;
}

// 创建要导出的默认实例
var axios = createInstance(defaults);

// 暴露 Axios 类以允许类继承
axios.Axios = Axios;

// 用于创建新实例的工厂函数
axios.create = function create(instanceConfig) {
  return createInstance(mergeConfig(axios.defaults, instanceConfig));
};

// 暴露 Cancel & CancelToken
axios.Cancel = require('./cancel/Cancel');
axios.CancelToken = require('./cancel/CancelToken');
axios.isCancel = require('./cancel/isCancel');

// 暴露 all/spread 方法
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = require('./helpers/spread');

module.exports = axios;

// 允许在 TypeScript 中使用默认导入语法
module.exports.default = axios;

```

##### 首先定一个函数 createInstance 用于创建 axios 实例：
```
function createInstance(defaultConfig) {
  var context = new Axios(defaultConfig);
  // 使用 bind 包装一下，以提供直接调用 axios({url: 'xxx', ...}) 的能力
  var instance = bind(Axios.prototype.request, context);
  utils.extend(instance, Axios.prototype, context);
  utils.extend(instance, context);
  return instance;
}
```
其中使用 bind 对 axios 包装了一下，以提供 axios({url: 'xxx', ...}) 这种方式调用的能力
bind函数：
```
module.exports = function bind(fn, thisArg) {
  return function wrap() {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    return fn.apply(thisArg, args);
  };
};

```
调用 bind 函数进行包装，对于直接传参调用 axios 的形式会就会主动去执行 `Axios.prototype.request` 来发起请求。
```
var instance = bind(Axios.prototype.request, context);
```

##### 调用 createInstance 创建实例，并在之后将其导出
```
// 创建要导出的默认实例
var axios = createInstance(defaults);

// 暴露 Axios 类以允许类继承
axios.Axios = Axios;

// 用于创建新实例的工厂函数
axios.create = function create(instanceConfig) {
  return createInstance(mergeConfig(axios.defaults, instanceConfig));
};
```
这里有两点要看，一是直接调用 createInstance 并传入 defaults 配置来创建一个 axios 实例：
```
var axios = createInstance(defaults);
```

二是定义了 `axios.create` 来提供自定义创建 axios 实例的能力：
```
axios.create = function create(instanceConfig) {
  return createInstance(mergeConfig(axios.defaults, instanceConfig));
};
```
axios.create 与 axios 的区别在于 axios.create 会合并用户调用 axios.create 传入的参数与 axios 默认的参数，且不会主动执行 createInstance 方法，需用户主动执行 axios.create 才会创建实例并返回。

##### 其他方法的暴露
```
// 暴露 Cancel & CancelToken
axios.Cancel = require('./cancel/Cancel');
axios.CancelToken = require('./cancel/CancelToken');
axios.isCancel = require('./cancel/isCancel');

// 暴露 all/spread 方法
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = require('./helpers/spread');

module.exports = axios;

// 允许在 TypeScript 中使用默认导入语法
module.exports.default = axios;
```

##### 其他
上面有提到 axios 的默认配置，这里就先简单看一下:
```
lib/defaults.js
// code...
var defaults = {
  adapter: getDefaultAdapter(),

  transformRequest: [function transformRequest(data, headers) {
      // code...
  }],

  transformResponse: [function transformResponse(data) {
      // code...
  }],

  timeout: 0,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  maxContentLength: -1,
  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  }
};
// code...
```
defaults.adapter 会执行 getDefaultAdapter 函数：
```
function getDefaultAdapter() {
  var adapter;
  // Node.js 有 process，可以依此来判断 Node.js 环境
  if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
    // node 使用 http
    adapter = require('./adapters/http');
  } else if (typeof XMLHttpRequest !== 'undefined') {
    // 浏览器使用 XHR
    adapter = require('./adapters/xhr');
  }
  return adapter;
}
```
getDefaultAdapter 函数会对环境进行判断，require 不同的请求方法，再赋值给 defaults.adapter。
axios 在浏览器与 node.js 中都可以使用的原因就是在此。