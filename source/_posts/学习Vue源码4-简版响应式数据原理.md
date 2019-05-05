---
title: 学习Vue源码4-简版响应式数据原理
date: 2019-03-15 17:12:10
summary: 
desc: 
tag: 
category: Vue
---
上一篇中提到了initData中会调用observe方法，然后会利用Object.defineProperty对data进行劫持，这里来简单实现以下响应式数据原理；
#### 具体步骤如下：
1. Observer对Obj的每一个属性调用defineReactive方法，defineReactive会使用Object.defineProperty来监听数据的get、set；
2. Dep用来记录有哪些订阅者（Watcher）订阅了这个数据，并提供add方法添加订阅者（Watcher）、notify方法通知所有订阅者（Watcher）更新视图；
3. 在defineReactive中会 new 一个 Dep()，Dep的subs中储存所有引用了该 data 的订阅者（Watcher）；
4. 如何向Dep的subs添加订阅者（Watcher）呢？Vue在定义数据劫持的getter时，如果存在静态属性Dep.target，则会调用当前Dep的addSub来添加一个订阅者（Watcher）到List；
5. 什么时候创建（Watcher）呢？ Vue在分析html模版时，一旦发现依赖了某个data，就会new 一个 Watcher()；
6. 若数据发生变化会调用Dep的notify()方法，遍历所有的订阅者（Watcher）并执行它们的update方法；
```
  // 定义数据，这里仅考虑Object形式
  var data = { name: 'wdk', age: 25 }

  function observe(obj) {
    if (!obj || typeof obj !== 'object') return
    var ob = new Observer(obj)
    return ob
  }

  // 观察者
  function Observer(obj) {
    this.value = obj
    this.walk(obj)
  }
  Observer.prototype.walk = function(obj) {
    const keys = Object.keys(obj)
    // 遍历数据&调用defineReactive
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

```
```
  function Dep() {
    this.subs = [] // 订阅者List
  }
  // 添加订阅者
  Dep.prototype.addSub = function (sub) {
    // sub是Watcher的实例
    this.subs.push(sub)
  }
  // 通知所有订阅者并调用它们的update方法
  Dep.prototype.notify = function () {
    this.subs.forEach(sub => {
      sub.update()
    })
  }

  function defineReactive(obj, key) {
    var value = obj[key] // 值
    var dep = new Dep()
    // 递归子属性
    observe(value)
    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: true,
      get: function reactiveGetter() {
        console.log('获取数据')
        // 将 Watcher 添加到订阅List
        if (Dep.target) {
          dep.addSub(Dep.target)
        }
        return value
      },
      set: function reactiveSetter(newVal) {
        console.log('修改数据')
        value = newVal
        // 执行 watcher 的 update 方法
        dep.notify()
      }
    })
  }
```
```
  function update(value) {
    document.querySelector('div').innerText = value
  }

  function Watcher(obj, key, cb) {
    // 将 Dep.target 指向自己，
    // 之后会调用data的值，使之触发Object.defineProperty的getter会操作
    // 由于静态属性Dep.target存在，则会将该订阅者Watcher（Dep.target = this = 当前Watcher实例）加入到subs中（订阅者List）
    Dep.target = this
    this.cb = cb
    this.obj = obj
    this.key = key
    // 然后触发属性的 getter 添加监听
    this.value = obj[key] 
    // 将 Dep.target 置空
    Dep.target = null
  }
  Watcher.prototype.update = function () {
    this.value = this.obj[this.key]
    // 调用 callback 方法更新 Dom
    this.cb(this.value)
  }

  // 开始劫持
  observe(data)
  
  // 模拟解析到模版 <div>{{name}}</div> 触发new Watcher()
  new Watcher(data, 'name', update)
  
  // 模拟解析到模版 <div>{{age}}</div> 触发new Watcher()
  new Watcher(data, 'age', update)

  // get数据
  console.log(data.name)

  // set数据
  data.name = '修改后数据'

```
