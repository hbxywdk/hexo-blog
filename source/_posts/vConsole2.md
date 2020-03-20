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

#### VConsolePlugin类
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

#### VConsoleLogTab类
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

#### this.mockConsole()
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

#### this.printLog()
向 Log Box 输出 Log

```
  /**
   * 向log box 输出一条 log
   * @protected
   * @param  string  _id        随机唯一ID
   * @param  string  tabName    default|system
   * @param  string  logType    log|info|debug|error|warn
   * @param  array   logs       `logs` or `content` 不能为空
   * @param  object  content    `logs` or `content` 不能为空
   * @param  boolean noOrigin
   * @param  int     date
   * @param  string  style
   */
  printLog(item) {
    let logs = item.logs || [];
    if (!logs.length && !item.content) {
      return;
    }

    // 复制 log 为一个新数组如：[111, 222, 333]
    logs = [].slice.call(logs || []);

    // check `[default]` format 检查默认格式
    let shouldBeHere = true;
    let pattern = /^\[(\w+)\]$/i;
    let targetTabID = '';
    let isInAddedTab = false;
    if (tool.isString(logs[0])) {
      let match = logs[0].match(pattern);
      if (match !== null && match.length > 0) {
        targetTabID = match[1].toLowerCase();
        isInAddedTab = ADDED_LOG_TAB_ID.indexOf(targetTabID) > -1;
      }
    }

    if (targetTabID === this.id) {
      // 目标 tab 是否是当前展示的 tab
      shouldBeHere = true;
    } else if (isInAddedTab === true) {
      // target tab is not current tab, but in added tab list
      // so throw this log to other tab
      shouldBeHere = false;
    } else {
      // 目标 tab 不在已添加的 tab list 中
      if (this.id === 'default') {
        // 在默认 tab 中展示此条 log
        shouldBeHere = true;
      } else {
        shouldBeHere = false;
      }
    }

    if (!shouldBeHere) {
      // 忽略此条 log 并将其扔到原始控制台中
      if (!item.noOrigin) {
        this.printOriginLog(item);
      }
      return;
    }

    // 添加 id
    if (!item._id) {
      item._id = '__vc_' + Math.random().toString(36).substring(2, 8);
    }

    // 存储 log 的日期
    if (!item.date) {
      item.date = (+new Date());
    }

    // vConsole 如果还未准备好，先把log保存在 this.logList 中，等 vConsole 准备好了再统一输出
    if (!this.isReady) {
      this.logList.push(item);
      return;
    }

    // remove `[xxx]` format
    if (tool.isString(logs[0]) && isInAddedTab) {
      logs[0] = logs[0].replace(pattern, '');
      if (logs[0] === '') {
        logs.shift();
      }
    }

    // make for previous log
    const curLog = { // 当前这条日志
      _id: item._id,
      logType: item.logType,
      logText: [],
      hasContent: !!item.content,
      count: 1,
    };
    for (let i = 0; i < logs.length; i++) {
      if (tool.isFunction(logs[i])) {
        curLog.logText.push(logs[i].toString());
      } else if (tool.isObject(logs[i]) || tool.isArray(logs[i])) {
        curLog.logText.push(tool.JSONStringify(logs[i]));
      } else {
        curLog.logText.push(logs[i]);
      }
    }
    curLog.logText = curLog.logText.join(' ');

    // check repeat 重复检测
    if (!curLog.hasContent && preLog.logType === curLog.logType && preLog.logText === curLog.logText) {
      // 处理多次连续的输出同一条log，则只展示一条log，并在该条log前展示输出次数的计数
      // 效果和在原始log窗口执行这段代码一样：for(let i = 0; i < 100; i++){console.log(1)}
      this.printRepeatLog();
    } else {
      // 向DOM中插入新log
      this.printNewLog(item, logs);
      // save previous log 保存上一条 log
      preLog = curLog; // 把当前 Log 
    }


    // 滚动到底部（如果之前已经在底部）
    if (this.isInBottom && this.isShow) {
      this.autoScrollToBottom();
    }

    // 把 log 输出到原始控制台
    if (!item.noOrigin) {
      this.printOriginLog(item);
    }
  }

```


#### this.printNewLog() 向DOM中插入新log
this.printLog，会调用 this.printNewLog 方法向DOM中插入新log

```
  /**
   * 向DOM中插入新log
   * @protected
   */
  printNewLog(item, logs) {

    // create line
    let $line = $.render(tplItem, {
      _id: item._id,
      logType: item.logType,
      style: item.style || ''
    });

    let $content = $.one('.vc-item-content', $line);
    // 从item.logs生成内容
    for (let i = 0; i < logs.length; i++) {
      let log;
      try {
        if (logs[i] === '') {
          // 如果log是空字符串则忽略掉
          continue;
        } else if (tool.isFunction(logs[i])) {
          // 把函数转换为字符串
          log = '<span> ' + logs[i].toString() + '</span>';
        } else if (tool.isObject(logs[i]) || tool.isArray(logs[i])) {
          // object or array
          log = this.getFoldedLine(logs[i]);
        } else {
          // default
          log = '<span> ' + tool.htmlEncode(logs[i]).replace(/\n/g, '<br/>') + '</span>';
        }
      } catch (e) {
        log = '<span> [' + (typeof logs[i]) + ']</span>';
      }
      if (log) {
        if (typeof log === 'string')
          $content.insertAdjacentHTML('beforeend', log);
        else
          $content.insertAdjacentElement('beforeend', log);
      }
    }

    // 从item.content生成内容
    if (tool.isObject(item.content)) {
      $content.insertAdjacentElement('beforeend', item.content);
    }

    // 将Log渲染到面板，.vc-log就是log的输出面板
    $.one('.vc-log', this.$tabbox).insertAdjacentElement('beforeend', $line);

    // 删除超出最大上限的日志
    this.logNumber++; // 累加 logNumber
    this.limitMaxLogs(); // 如果超出了最大Log展示数量则把多余的Log删除
  }

```

#### VConsoleDefaultTab类
然后是 VConsoleDefaultTab 类只有3个方法：onReady、mockConsole 和 evalCommand。
```
class VConsoleDefaultTab extends VConsoleLogTab {

  constructor(...args) {
    super(...args);
    this.tplTabbox = tplTabbox;
  }

  onReady() {
    
    // code...

    // 给 command 输入框绑定 keyup 事件
    $.bind($.one('.vc-cmd-input'), 'keyup', function (e) {
      // code...
    });

    // 提交命令事件
    $.bind($.one('.vc-cmd', this.$tabbox), 'submit', function (e) {
      // code...
    });

    // code...

  }

  // 使用 vConsole 的方法替换了 window.console & window.onerror。
  mockConsole() {
    
    // code...

  }

  // 执行command输入框中的命令
  evalCommand(cmd) {
    // code...
  }
}
```
- mockConsole 方法使用 vConsole 的方法替换了 window.console & window.onerror。
- evalCommand 方法会使用 `eval` 来执行字符串命令。
- onReady 方法会给 `command输入框`绑定 `keyup` 事件并处理命令补全相关事项。还会处理命令提交事件，调用 evalCommand 来执行命令。















