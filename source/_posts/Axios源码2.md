---
title: Axios源码2-Axios构造函数
date: 2019-07-14 18:30:41
summary: 
desc: 
tag: 
category: Js
---

#### Axios 实例
lib/core/Axios.js
首先是 Axios 的构造函数：
```
function Axios(instanceConfig) {
  this.defaults = instanceConfig;
  // request & response 拦截器
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}
```
this.defaults 存放默认配置。
this.interceptors 存放 request 与 response 的拦截器，我们看下拦截器的实现：

##### 拦截器
```
lib/core/InterceptorManager.js

function InterceptorManager() {
  // 用于储存所有 use 方法传入的拦截器
  this.handlers = [];
}

// 添加一个新拦截器
InterceptorManager.prototype.use = function use(fulfilled, rejected) {
  this.handlers.push({
    fulfilled: fulfilled,
    rejected: rejected
  });
  return this.handlers.length - 1;
};

// 移除一个拦截器
InterceptorManager.prototype.eject = function eject(id) {
  if (this.handlers[id]) {
    this.handlers[id] = null;
  }
};

// 迭代所有注册的拦截器，fn函数会调用每一个拦截器
InterceptorManager.prototype.forEach = function forEach(fn) {
  utils.forEach(this.handlers, function forEachHandler(h) {
    if (h !== null) {
      fn(h);
    }
  });
};
```
拦截器比较简单，this.handlers 用于存放拦截器，use 用于添加拦截器，eject 用于删除拦截器，forEach 用于迭代所有拦截器。

#### Axios.prototype.request 方法
```
Axios.prototype.request = function request(config) {
  // 处理这种方式调用： axios('example/url'[, config])
  if (typeof config === 'string') {
    config = arguments[1] || {};
    config.url = arguments[0];
  } else {
    config = config || {};
  }
  config = mergeConfig(this.defaults, config); // 合并参数
  config.method = config.method ? config.method.toLowerCase() : 'get'; // 判断请求方法，默认为 get

  // Hook up interceptors middleware
  var chain = [dispatchRequest, undefined];
  var promise = Promise.resolve(config);

  // 遍历每一个 request 拦截器，unshift fulfilled 与 rejected 进 chain
  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    chain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  // 遍历每一个 response 拦截器，push fulfilled 与 rejected 进 chain
  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    chain.push(interceptor.fulfilled, interceptor.rejected);
  });

  while (chain.length) {
    promise = promise.then(chain.shift(), chain.shift());
  }

  return promise;
};
```
我们从定义 chain 这个变量开始看起：
```
  var chain = [dispatchRequest, undefined];
```
chain 是一个数组，数组中有两个元素 dispatchRequest 和 undefined，dispatchRequest 我们姑且可以简单的认为是一个返回 Promise 的请求方法。
接下来定义了变量 promise。传入 config 参数：
```
var promise = Promise.resolve(config);
```
之后分别遍历 request 拦截器、response 拦截器，将每一个 request 拦截器的 fulfilled 与 rejected 方法添加到 chain 这个数组的前面，将每一个 response 拦截器的 fulfilled 与 rejected 方法添加到 chain 的后面。

之后 while 循环，当 chain 还有 length 时候，就会一直取出 chain 的前两个元素，再将它们作为参数执行 promise.then(元素0，元素1)，并将其赋值给 promise，最后返回 promise。
初看 request 方法时，懵逼就懵逼再这里。

##### 我们将其简化一下，不考虑所有拦截器的情况：
```
var config = { url: 'test' } // 配置
function testRequest (config) { // 模拟请求
  console.log('testRequest', config)
  return new Promise((resolve) => {
    setTimeout(() => { resolve() },3000)
  })
}
var promise = Promise.resolve(config)
promise = promise.then(testRequest, undefined)
// axios.get().then() ⬇
promise.then(() => {
  alert('用户定义 then 方法')
})
```
axios 充分利用了 Promise 的特性，Promise 也会返回一个 Promise、Promise.resolve 的参数会传递给 then 的 fulfilled 方法，使得我们在 testRequest 中也可以得到 config，当 testRequest 成功后，再执行用户自定义的 then 方法。

##### 接下来我们看有拦截器的情况
这里我们假设 request、response拦截器各定义了两个，那么遍历每一个拦截器之后的 chain 就是这个样子的:
`[request成功拦截, request失败拦截, request成功拦截，request失败拦截, testRequest, undefined, response成功拦截, response失败拦截, response成功拦截, response失败拦截]`
之后执行 while 循环，当 chain 还有 length 时候，就会一直移除 chain 的前两个元素，并将它们作为参数执行 promise.then(元素0，元素1)
chain 就会变成下面的样子：
`[request成功拦截，request失败拦截, testRequest, undefined, response成功拦截, response失败拦截, response成功拦截, response失败拦截]`
`[testRequest, undefined, response成功拦截, response失败拦截, response成功拦截, response失败拦截]`
当 while 遍历到 testRequest 则会发起请求，resolve 向下传递数据就由 config 修改为了 response。
`[response成功拦截, response失败拦截, response成功拦截, response失败拦截]`
`[response成功拦截, response失败拦截]`
`[]`
当 chain 长度为0后，就会去执行用户定义的 then 方法。

整个过程大致可以用以下代码来描述：
```
var config = { url: 'test' } // 配置参数
function testRequest (config) { // 模拟请求
  console.log('testRequest', config)
  return new Promise((resolve) => {
    // 请求返回数据
    var res = { status: 200, data:'I am' }
    setTimeout(() => { resolve(res) },3000)
  })
}
// request 拦截器的成功函数
var requestInterceptorsFulfilled = function (config) {
  console.log('原始config：', config, '我会修改 config 后返回')
  config.url = config.url + '~!~'
  return config
}
// response 拦截器的成功函数
var responseInterceptorsFulfilled = function (response) {
  console.log('原始response：', response, '我会修改 response 后返回')
  response.data = response.data + ' OK'
  return response
}
// request、response错误处理
var requestInterceptorsRejected = responseInterceptorsRejected = function (error) {
  return Promise.reject(error);
}
// 执行链
var chain = [
  requestInterceptorsFulfilled, requestInterceptorsRejected, 
  requestInterceptorsFulfilled, requestInterceptorsRejected, 
  testRequest, undefined,
  responseInterceptorsFulfilled, responseInterceptorsRejected,
  responseInterceptorsFulfilled, responseInterceptorsRejected
]
var promise = Promise.resolve(config)
// 循环执行
while (chain.length) {
  promise = promise.then(chain.shift(), chain.shift());
}
// 用户自定义then方法：axios.get().then() ⬇
promise.then((res) => {
  console.log('用户最终拿到的数据', res)
})
```

我们执行这段代码，可以在 console 面板中看到输出：
```
原始config： {url: "test"} 我会修改 config 后返回 // 此处第一个 request 拦截器对 config 进行修改
原始config： {url: "test~!~"} 我会修改 config 后返回 // 此处第二个 request 拦截器对 config 进行修改

testRequest {url: "test~!~~!~"} // 执行 testRequest 函数，此处会等待三秒，可以看到 config 已经被修改了两次，变为 {url: "test~!~~!~"}
Promise {<pending>} // pending 状态的 Promise

原始response： {status: 200, data: "I am"} 我会修改 response 后返回 // 请求返回了数据，response 拦截器对 response 进行修改
原始response： {status: 200, data: "I am OK"} 我会修改 response 后返回 // 请求返回了数据，response 拦截器对 response 进行修改

用户最终拿到的数据 {status: 200, data: "I am OK OK"} // 这里是用户自定义的 then 中拿到的结果
```
`request 方法是 axios 的核心之一，初看有些懵逼，但真正看明白了，会让人直呼妙啊！妙啊！`

#### 其他
##### 定义 getUri 方法
```
Axios.prototype.getUri = function getUri(config) {
  config = mergeConfig(this.defaults, config);
  return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, '');
};
```
##### 添加 axios 支持的方法的别名
这一步使得用户可以以 axios.get()、axios.post() 的方式调用。
别名的定义分为两种，区别在于传参的方式不同。
```
// 添加支持的方法的别名
utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, config) {
    return this.request(utils.merge(config || {}, {
      method: method,
      url: url
    }));
  };
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, data, config) {
    return this.request(utils.merge(config || {}, {
      method: method,
      url: url,
      data: data
    }));
  };
});
```
