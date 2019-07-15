---
title: Axios源码4-请求的取消
date: 2019-07-15 21:30:34
summary: 
desc: 
tag: 
category: Js
---
#### Axios 请求取消的相关用法
文档上有给出两种用法。
一种是使用 CancelToken.source 工厂方法创建 cancel token：
```
var CancelToken = axios.CancelToken;
var source = CancelToken.source();

axios.get('/user/12345', {
  cancelToken: source.token
}).catch(function(thrown) {
  if (axios.isCancel(thrown)) {
    console.log('Request canceled', thrown.message);
  } else {
    // 处理错误
  }
});

// 取消请求（message 参数是可选的）
source.cancel('Operation canceled by the user.');
```
另一种是通过传递一个 executor 函数到 CancelToken 的构造函数来创建 cancel token：
```
var CancelToken = axios.CancelToken;
var cancel;

axios.get('/user/12345', {
  cancelToken: new CancelToken(function executor(c) {
    // executor 函数接收一个 cancel 函数作为参数
    cancel = c;
  })
});

// 取消请求
cancel();
```
这两种用法的不同点是第一种不需要我们手动去 `new CancelToken()`，共同点是`都需要传入一个 cancelToken 参数`。

#### xhr.js 与 http.js 对 cancelToken 的处理
对于取消的处理都在代码的末尾处：
xhr.js
```
  if (config.cancelToken) {
    // 请求取消相关
    config.cancelToken.promise.then(function onCanceled(cancel) {
      if (!request) {
        return;
      }

      request.abort();
      reject(cancel);
      // Clean up request
      request = null;
    });
  }

  if (requestData === undefined) {
    requestData = null;
  }

  // 4. ========== 发起请求 ==========
  request.send(requestData);
```

http.js
```
  if (config.cancelToken) {
    // 处理取消
    config.cancelToken.promise.then(function onCanceled(cancel) {
      if (req.aborted) return;

      req.abort();
      reject(cancel);
    });
  }

  // 发送请求
  if (utils.isStream(data)) {
    data.on('error', function handleStreamError(err) {
      reject(enhanceError(err, config, null, req));
    }).pipe(req);
  } else {
    req.end(data);
  }
```
xhr.js 与 http.js 中都有这么一段：
```
  config.cancelToken.promise.then(function onCanceled(cancel) {
    // code... 取消代码省略
  });
```
cancelToken.promise 是一个 Promise，一旦它的状态变为成功，则会执行对应的 request 的取消操作。
接下来看 CancelToken

#### CancelToken
lib/cancel/CancelToken.js
```
function CancelToken(executor) {
  // executor 不是函数则抛错
  if (typeof executor !== 'function') {
    throw new TypeError('executor must be a function.');
  }

  var resolvePromise;
  this.promise = new Promise(function promiseExecutor(resolve) {
    resolvePromise = resolve;
  });

  var token = this;
  executor(function cancel(message) {
    if (token.reason) {
      // 请求已经取消过了，不允许再次取消
      return;
    }

    token.reason = new Cancel(message);
    resolvePromise(token.reason);
  });
}

CancelToken.prototype.throwIfRequested = function throwIfRequested() {
  if (this.reason) {
    throw this.reason;
  }
};

CancelToken.source = function source() {
  var cancel;
  var token = new CancelToken(function executor(c) {
    cancel = c;
  });
  return {
    token: token,
    cancel: cancel
  };
};
```
第二种用法中，我们调用了 cancel()，来取消请求，而 cancel 是 CancelToken 的参数的参数 `c`。

而在 CancelToken.js 的 CancelToken.source 中，也就是第一种用法调用的，Axios 其实帮我们 new 了 CancelToken，我们调用 source.cancel() 取消时，这个 source.cancel 还是 CancelToken 的参数的参数 `c`，也就是下面代码中的 `cancel` 函数:
```
  var resolvePromise;
  this.promise = new Promise(function promiseExecutor(resolve) {
    resolvePromise = resolve;
  });

  var token = this;
  executor(function cancel(message) {
    if (token.reason) {
      // 请求已经取消过了，不允许再次取消
      return;
    }

    token.reason = new Cancel(message);
    resolvePromise(token.reason);
  });
```
其中 this.promise 就等于 xhr.js 与 http.js 中的 `config.cancelToken.promise`，当用户手动调用 cancel 方法，就会使 `config.cancelToken.promise` 的状态变为成功，进而执行对应的请求取消操作（前提是这个请求还没有完成）。

#### 其他

还剩一点东西就在这里一同写了吧：

##### axios.all 与 axios.spread
它俩搭配，可用于等待多个请求通知返回。用法类似 Promise.all
```
function getUserAccount() {
  return axios.get('/user/12345');
}

function getUserPermissions() {
  return axios.get('/user/12345/permissions');
}

axios.all([getUserAccount(), getUserPermissions()])
  .then(axios.spread(function (acct, perms) {
    // 两个请求现在都执行完成
  }));
```

实际上 axios.all 方法返回的就是 Promise.all，因为 axios 的返回本就是 Promise：
```
axios.all = function all(promises) {
  return Promise.all(promises);
};
```
axios.spread 作为 axios.all 的参数实际上就是对其包了一层，使之可以在 axios 上下文中执行。
```
module.exports = function spread(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
};
```



