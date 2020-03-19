---
title: vConsole分析1
date: 2019-10-30 18:05:33
summary: 
desc: 
tag: 
category: Js
---

#### 简介
vConsole 是一个轻量化的移动网页前端控制台面板，它在真机上实现 PC 网页控制台的主要功能，大大简化了 H5 页面的调试过程，它的使用也非常简单，以 CDN 引入为例：
```
  <script src="https://cdn.bootcss.com/vConsole/3.3.4/vconsole.min.js"></script>
  <script>
    var vConsole = new VConsole();
  </script>
```
只需在 html 中引入 vConsole 脚本，并实例化一个 vConsole 即可使用，它的基本功能已足够满足一般的开发调试。

#### 入口文件
从入口文件开始看起
```
vconsole.js

// global
import './lib/symbol.js';

// classes
import VConsole from './core/core.js';
import VConsolePlugin from './lib/plugin.js';

// export
VConsole.VConsolePlugin = VConsolePlugin;
export default VConsole;
```
引入 VConsole、VConsolePlugin，并将 VConsole.VConsolePlugin 赋值为 VConsolePlugin，最后导出 VConsole。

#### VConsole 构造函数
接下来看 core/core.js，它定义了 VConsole 类并将其导出。
从构造函数看起（去除了一些不重要的代码）
```
class VConsole {

  constructor(opt) {
    // ...

    let that = this;
    this.$dom = null; // vConsole 的 HTML element

    this.option = { // 配置项
      defaultPlugins: ['system', 'network', 'element', 'storage']
    };

    this.activedTab = ''; // 当前激活的 tab 的 plugin id
    this.tabList = []; // 已安装的 tab 的 plugin id 列表。
    this.pluginList = {}; // 插件列表

    this.switchPos = { // 定位
        // ...
    };

    this.tool = tool; // 辅助函数
    this.$ = $; // DOM 选择器

    // code 省略（合并参数，常规使用一般都不会传参）

    // 添加内置插件
    this._addBuiltInPlugins();

    // 初始化
    let _onload = function() {
      if (that.isInited) {
        return;
      }
      that._render(); // 渲染面板 DOM
      that._mockTap(); // 通过 touchstart & touchend 来模拟点击事件
      that._bindEvent(); // 绑定 DOM 事件
      that._autoRun(); // 初始化完成后自动运行
    };
    // 对 document 状态的处理，当 document 加载完成时再去调用 _onload
    if (document !== undefined) {
      if (document.readyState == 'complete') {
        _onload();
      } else {
        $.bind(window, 'load', _onload);
      }
    } else {
      // if document does not exist, wait for it
      let _timer;
      let _pollingDocument = function() {
          if (!!document && document.readyState == 'complete') {
            _timer && clearTimeout(_timer);
            _onload();
          } else {
            _timer = setTimeout(_pollingDocument, 1);
          }
        };
      _timer = setTimeout(_pollingDocument, 1);
    }
  }
```
主要看后半部分：调用 this._addBuiltInPlugins(); 添加内部插件，接下来定义了一个 _onload 函数，当 document 加载完成后会去调用该函数。

##### _addBuiltInPlugins
```
  _addBuiltInPlugins() {
    // 添加默认的 log 插件
    this.addPlugin(new VConsoleDefaultPlugin('default', 'Log'));

    // add other built-in plugins according to user's config
    const list = this.option.defaultPlugins;
    const plugins = {
      'system': {proto: VConsoleSystemPlugin, name: 'System'},
      'network': {proto: VConsoleNetworkPlugin, name: 'Network'},
      'element': {proto: VConsoleElementPlugin, name: 'Element'},
      'storage': {proto: VConsoleStoragePlugin, name: 'Storage'}
    };
    if (!!list && tool.isArray(list)) {
      for (let i=0; i<list.length; i++) {
        let tab = plugins[list[i]];
        if (!!tab) {
          this.addPlugin(new tab.proto(list[i], tab.name));
        } else {
          console.debug('Unrecognized default plugin ID:', list[i]);
        }
      }
    }
  }
```
_addBuiltInPlugins 方法中调用了 this.addPlugin 先添加了必须的 log 插件，之后根据配置一次添加了 System、Network、Element、Storage 插件。
几部分的`插件对应的 VConsoleDefaultPlugin、VConsoleSystemPlugin...... 等等`，接着是 this.addPlugin() 方法：

```
  addPlugin(plugin) {
    // 重复安装插件则将其忽略
    if (this.pluginList[plugin.id] !== undefined) {
      console.debug('Plugin ' + plugin.id + ' has already been added.');
      return false;
    }
    this.pluginList[plugin.id] = plugin; // 将插件添加到 this.pluginList 中
    
    // 仅在 vConsole 准备就绪时初始化插件 
    if (this.isInited) {
      this._initPlugin(plugin);
      // 如果是第一个插件则会默认显示
      if (this.tabList.length == 1) {
        this.showTab(this.tabList[0]);
      }
    }
    return true;
  }
```
接下来是 this._initPlugin() 初始化插件，_initPlugin中分别触发插件的`init、renderTab、addTopBar、addTool、ready事件`，init会调用插件的onInit方法（如果有）；renderTab用于渲染tab栏目（最顶部的tab栏） 的内容；addTopBar用于给顶部的按钮区添加内容；addTool用于给最底部的按钮区添加内容；

`renderTab、addTopBar、addTool`三个有回调函数，用于给对应的区域添加按钮。
```
  _initPlugin(plugin) {
    let that = this;
    plugin.vConsole = this; // 把vConsole挂到插件上
    // 触发插件的 init 事件
    plugin.trigger('init');
    
    // 渲染tab（如果是一个tab插件，则应有标签相关的事件）
    plugin.trigger('renderTab', function(tabboxHTML) {
      // code...
    });

    // 渲染 top bar（顶部的按钮）
    plugin.trigger('addTopBar', function(btnList) {
      // code...
    });

    // 渲染 tool bar（底部的按钮）
    plugin.trigger('addTool', function(btnList) {
      // code...
    });

    // 结束初始化，标记插件的isReady为true
    plugin.isReady = true;
    // 触发插件的ready事件
    plugin.trigger('ready');
  }
```










