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
    let that = this;
    this.$dom = null;

    this.option = { // 默认插件配置
      defaultPlugins: ['system', 'network', 'element', 'storage']
    };

    this.activedTab = '';
    this.tabList = [];
    this.pluginList = {};

    this.switchPos = { // 定位
        // code 省略
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
      that._render();
      that._mockTap();
      that._bindEvent();
      that._autoRun();
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
几部分的`插件对应的类 VConsoleDefaultPlugin、VConsoleSystemPlugin...... 等等再看`，接着是 this.addPlugin() 方法：

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







