---
title: vConsole分析2-VConsoleDefaultPlugin
date: 2020-03-19 14:44:44
summary: 
desc: 
tag: 
category: Js
---

#### 插件
VConsole 的 _addBuiltInPlugins 方法中有这五个内置插件：VConsoleDefaultPlugin、VConsoleSystemPlugin、VConsoleNetworkPlugin、VConsoleElementPlugin、VConsoleStoragePlugin，分别对应 vConsole 五大功能区：Log、System、NetWork、Element 和 Storage。

VConsoleDefaultPlugin 和 VConsoleSystemTab 都继承了 VConsoleLogTab，VConsoleLogTab 则继承了 VConsolePlugin；
VConsoleNetworkPlugin、VConsoleElementPlugin、VConsoleStoragePlugin 继承了 VConsolePlugin。

#### VConsolePlugin
五个内置插件最终都继承了 VConsolePlugin 所以先从它看起。
VConsolePlugin 主要用于获取\设置 _id、_name、_vConsole，与注册事件与触发事件
```
class VConsolePlugin {
  
  constructor(id, name = 'newPlugin') {
    this.id = id;
    this.name = name;
    this.isReady = false;
    this.eventList = {};
  }

  // 省略code...

  /**
   * 注册事件
   * @public
   * @param string
   * @param function
   */
  on(eventName, callback) {
    this.eventList[eventName] = callback;
    return this;
  }

  /**
   * 触发事件
   * @public
   * @param string
   * @param mixed
   */
  trigger(eventName, data) {
    if (typeof this.eventList[eventName] === 'function') {
      // registered by `.on()` method
      this.eventList[eventName].call(this, data);
    } else {
      // registered by `.onXxx()` method
      let method = 'on' + eventName.charAt(0).toUpperCase() + eventName.slice(1);
      if (typeof this[method] === 'function') {
        this[method].call(this, data);
      }
    }
    return this;
  }

}
```

#### VConsoleLogTab
VConsoleLogTab 是基础 log tab 类，VConsoleDefaultPlugin 和 VConsoleSystemTab 都会继承它。

```
class VConsoleLogTab extends VConsolePlugin {
  static AddedLogID = [];

  constructor(...args) {
    super(...args);
    ADDED_LOG_TAB_ID.push(this.id);

    this.tplTabbox = ''; // tplTabbox 在子类中必须被重写
    this.allowUnformattedLog = true; // `[xxx]` format log

    this.isReady = false;
    this.isShow = false;
    this.$tabbox = null;
    this.console = {};
    this.logList = []; // vConsole 如果还未准备好，先把log保存在 logList 中
    this.isInBottom = true; // 面板是否在底部
    this.maxLogNumber = DEFAULT_MAX_LOG_NUMBER; // 最大Log展示数量
    this.logNumber = 0;

    this.mockConsole();
  }

  // code...

}
```

##### this.mockConsole()
```
  mockConsole() {
    const that = this;
    const methodList = ['log', 'info', 'warn', 'debug', 'error'];

    // 将 window.console 的主要方法赋值给 this.console
    if (!window.console) {
      window.console = {};
    } else {
      methodList.map(function (method) {
        that.console[method] = window.console[method];
      });
      that.console.time = window.console.time;
      that.console.timeEnd = window.console.timeEnd;
      that.console.clear = window.console.clear;
    }

    // 重写 console 的 'log', 'info', 'warn', 'debug', 'error' 五个方法，改为调用 this.printLog
    methodList.map(method => {
      window.console[method] = (...args) => {
        this.printLog({
          logType: method,
          logs: args,
        });
      };
    });

    // 重写 console.time 与 console.timeEnd 方法
    const timeLog = {}
    window.console.time = function (label) {
      timeLog[label] = Date.now();
    };
    window.console.timeEnd = function (label) {
      var pre = timeLog[label];
      if (pre) {
        console.log(label + ':', (Date.now() - pre) + 'ms');
        delete timeLog[label];
      } else {
        console.log(label + ': 0ms');
      }
    };

    // 重写 console.clear 方法，调用 this.clearLog 方法，再调用存在 this.console 中的 [native code]
    window.console.clear = (...args) => {
      that.clearLog();
      that.console.clear.apply(window.console, args);
    };
  }
```

##### this.printLog()
向 Log Box 输出 Log

```

```














