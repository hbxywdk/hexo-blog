---
title: Axios源码3-请求方法
date: 2019-07-15 21:30:34
summary: 
desc: 
tag: 
category: Js
---

#### dispatchRequest
上篇文章中说到，在`lib/core/Axios.js`中有用到 dispatchRequest 方法，这个方法就用于发起请求，并返回一个 Promise：
```
lib/core/dispatchRequest.js
module.exports = function dispatchRequest(config) {
  // 请求取消相关
  throwIfCancellationRequested(config);

  // 如果配置了 baseURL，这里会做处理
  if (config.baseURL && !isAbsoluteURL(config.url)) {
    config.url = combineURLs(config.baseURL, config.url);
  }

  // 保证请求头的存在
  config.headers = config.headers || {};

  // 转换请求数据
  config.data = transformData(
    config.data,
    config.headers,
    config.transformRequest
  );

  // Flatten headers
  config.headers = utils.merge(
    config.headers.common || {},
    config.headers[config.method] || {},
    config.headers || {}
  );

  utils.forEach(
    ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
    function cleanHeaderConfig(method) {
      delete config.headers[method];
    }
  );
  // 使用用户配置的 adapter 或默认的 adapter
  var adapter = config.adapter || defaults.adapter;

  // 发起请求
  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);

    // Transform response data
    response.data = transformData(
      response.data,
      response.headers,
      config.transformResponse
    );

    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);

      // Transform response data
      if (reason && reason.response) {
        reason.response.data = transformData(
          reason.response.data,
          reason.response.headers,
          config.transformResponse
        );
      }
    }

    return Promise.reject(reason);
  });
};
```
dispatchRequest 方法比较简单，主要是处理请求数据，并调用 adapter 方法发起请求。

#### adapter 方法
```
var adapter = config.adapter || defaults.adapter;
```
用户可以自定义 adapter，如果没有的话则是用默认的 adapter 方法，这个我在第一篇文章的末尾有提到：
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

axios 会根据环境的不同引入不同的代码，浏览器下为 xhr.js，Node.js 下为 http.js，先看 xhr.js:
##### lib/adapters/xhr.js
```
module.exports = function xhrAdapter(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    var requestData = config.data;
    var requestHeaders = config.headers;

    if (utils.isFormData(requestData)) {
      delete requestHeaders['Content-Type']; // Let the browser set it
    }

    // 1. ========== 实例化 xhr ==========
    var request = new XMLHttpRequest();

    // HTTP Authorization 请求头
    if (config.auth) {
      var username = config.auth.username || '';
      var password = config.auth.password || '';
      requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
    }

    // 2. ========== 调用 open 方法 ==========
    request.open(config.method.toUpperCase(), buildURL(config.url, config.params, config.paramsSerializer), true);

    request.timeout = config.timeout; // 设置超时时间

    // 3. ========== 监听 readystatechange 事件 ==========
    request.onreadystatechange = function handleLoad() {
      if (!request || request.readyState !== 4) { return; }
      if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
        return;
      }
      // Prepare the response
      var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
      var responseData = !config.responseType || config.responseType === 'text' ? request.responseText : request.response;
      var response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config: config,
        request: request
      };
      settle(resolve, reject, response);
      // Clean up request
      request = null;
    };

    // Handle browser request cancellation (as opposed to a manual cancellation)
    // 处理浏览器请求取消（非手动取消）
    request.onabort = function handleAbort() {
      if (!request) {
        return;
      }
      reject(createError('Request aborted', config, 'ECONNABORTED', request));
      request = null;
    };

    // 处理低级别网络错误
    request.onerror = function handleError() {
      reject(createError('Network Error', config, null, request));
      request = null;
    };

    // 超时处理
    request.ontimeout = function handleTimeout() {
      reject(createError('timeout of ' + config.timeout + 'ms exceeded', config, 'ECONNABORTED',
        request));
      request = null;
    };

    // 添加 xsrf 头，仅标准浏览器中
    if (utils.isStandardBrowserEnv()) {
      var cookies = require('./../helpers/cookies');

      // Add xsrf header
      var xsrfValue = (config.withCredentials || isURLSameOrigin(config.url)) && config.xsrfCookieName ?
        cookies.read(config.xsrfCookieName) :
        undefined;

      if (xsrfValue) {
        requestHeaders[config.xsrfHeaderName] = xsrfValue;
      }
    }

    // 给请求添加头信息
    if ('setRequestHeader' in request) {
      utils.forEach(requestHeaders, function setRequestHeader(val, key) {
        if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
          // Remove Content-Type if data is undefined
          delete requestHeaders[key];
        } else {
          // Otherwise add header to the request
          request.setRequestHeader(key, val);
        }
      });
    }

    // 如果需要添加 withCredentials 到请求中
    if (config.withCredentials) {
      request.withCredentials = true;
    }

    // 如果需要添加 responseType 到请求中
    if (config.responseType) {
      try {
        request.responseType = config.responseType;
      } catch (e) {
        // Expected DOMException thrown by browsers not compatible XMLHttpRequest Level 2.
        // But, this can be suppressed for 'json' type as it can be parsed by default 'transformResponse' function.
        if (config.responseType !== 'json') {
          throw e;
        }
      }
    }

    // 处理请求的进度
    if (typeof config.onDownloadProgress === 'function') {
      request.addEventListener('progress', config.onDownloadProgress);
    }

    // 对 onUploadProgress 事件的处理
    if (typeof config.onUploadProgress === 'function' && request.upload) {
      request.upload.addEventListener('progress', config.onUploadProgress);
    }

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
  });
};
```
xhr.js 返回了一个 Promise，在 Promise 中 实例化 xhr `new XMLHttpRequest()`，监听 `onreadystatechange` 事件，再处理各种配置参数，最后调用 `send` 方法，发起请求。

##### lib/adapters/http.js
```
var isHttps = /https:?/;

/*eslint consistent-return:0*/
module.exports = function httpAdapter(config) {
  return new Promise(function dispatchHttpRequest(resolvePromise, rejectPromise) {
    var timer;
    var resolve = function resolve(value) {
      clearTimeout(timer);
      resolvePromise(value);
    };
    var reject = function reject(value) {
      clearTimeout(timer);
      rejectPromise(value);
    };
    var data = config.data;
    var headers = config.headers;

    /* code... 省略 */

    // 参数
    var options = {
      path: buildURL(parsed.path, config.params, config.paramsSerializer).replace(/^\?/, ''),
      method: config.method.toUpperCase(),
      headers: headers,
      agent: agent,
      auth: auth
    };

    /* code... 省略 */

    // 请求方法的选择
    var transport;
    var isHttpsProxy = isHttpsRequest && (proxy ? isHttps.test(proxy.protocol) : true);
    if (config.transport) {
      transport = config.transport;
    } else if (config.maxRedirects === 0) {
      transport = isHttpsProxy ? https : http;
    } else {
      if (config.maxRedirects) {
        options.maxRedirects = config.maxRedirects;
      }
      transport = isHttpsProxy ? httpsFollow : httpFollow;
    }

    /* code... 省略 */

    // 创建请求 
    var req = transport.request(options, function handleResponse(res) {
      if (req.aborted) return;

      var stream = res;
      switch (res.headers['content-encoding']) {
      case 'gzip':
      case 'compress':
      case 'deflate':
        stream = (res.statusCode === 204) ? stream : stream.pipe(zlib.createUnzip());
        delete res.headers['content-encoding'];
        break;
      }
      
      var lastRequest = res.req || req;

      var response = {
        status: res.statusCode,
        statusText: res.statusMessage,
        headers: res.headers,
        config: config,
        request: lastRequest
      };

      if (config.responseType === 'stream') {
        response.data = stream;
        settle(resolve, reject, response);
      } else {
        var responseBuffer = [];
        stream.on('data', function handleStreamData(chunk) {
          responseBuffer.push(chunk);

          // make sure the content length is not over the maxContentLength if specified
          if (config.maxContentLength > -1 && Buffer.concat(responseBuffer).length > config.maxContentLength) {
            stream.destroy();
            reject(createError('maxContentLength size of ' + config.maxContentLength + ' exceeded',
              config, null, lastRequest));
          }
        });

        stream.on('error', function handleStreamError(err) {
          if (req.aborted) return;
          reject(enhanceError(err, config, null, lastRequest));
        });

        stream.on('end', function handleStreamEnd() {
          var responseData = Buffer.concat(responseBuffer);
          if (config.responseType !== 'arraybuffer') {
            responseData = responseData.toString(config.responseEncoding);
          }

          response.data = responseData;
          settle(resolve, reject, response);
        });
      }
    });

    // 处理错误
    req.on('error', function handleRequestError(err) {
      if (req.aborted) return;
      reject(enhanceError(err, config, null, req));
    });

    // 处理超时
    if (config.timeout) {
      timer = setTimeout(function handleRequestTimeout() {
        req.abort();
        reject(createError('timeout of ' + config.timeout + 'ms exceeded', config, 'ECONNABORTED', req));
      }, config.timeout);
    }

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
  });
};

```
http.js 整体返回也是一个 Promise，不过内部使用了 Node.js 的 http 与 https 模块，对参数进行处理后发起请求。


