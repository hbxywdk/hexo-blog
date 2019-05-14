---
title: '学习Vue源码11-Vue中的props与data'
date: 2019-05-14 14:48:02
summary: 
desc: 
tag: 
category: Vue
---
Vue 的 _init() 方法调用了 initState 方法：
```
core\instance\state.js
export function initState (vm: Component) {
  vm._watchers = []
  const opts = vm.$options
  // 处理props
  if (opts.props) initProps(vm, opts.props)

  // code... 省略代码

  if (opts.data) {
    // 存在data处理data
    initData(vm)
  } else {
    // 不存在data默认data为{}
    observe(vm._data = {}, true /* asRootData */)
  }

  // code... 省略代码
}

```

### Props
看initProps方法：
```
function initProps (vm: Component, propsOptions: Object) {
  const propsData = vm.$options.propsData || {}
  const props = vm._props = {}
  // cache prop keys so that future props updates can iterate using Array instead of dynamic object key enumeration.
  // 缓存一下prop，以后会用到
  const keys = vm.$options._propKeys = []
  const isRoot = !vm.$parent
  // root instance props should be converted
  // 当前实例是根实例应该转换一下
  if (!isRoot) {
    toggleObserving(false)
  }

  for (const key in propsOptions) {
    keys.push(key)
    const value = validateProp(key, propsOptions, propsData, vm)
    /* 下面这一大段最终都会调用 defineReactive 方法 */
    // 👇
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      const hyphenatedKey = hyphenate(key)
      if (isReservedAttribute(hyphenatedKey) ||
          config.isReservedAttr(hyphenatedKey)) {
        warn(
          `"${hyphenatedKey}" is a reserved attribute and cannot be used as component prop.`,
          vm
        )
      }
      defineReactive(props, key, value, () => {
        if (!isRoot && !isUpdatingChildComponent) {
          warn(
            `Avoid mutating a prop directly since the value will be ` +
            `overwritten whenever the parent component re-renders. ` +
            `Instead, use a data or computed property based on the prop's ` +
            `value. Prop being mutated: "${key}"`,
            vm
          )
        }
      })
    } else {
      defineReactive(props, key, value)
    }

    // static props are already proxied on the component's prototype
    // during Vue.extend(). We only need to proxy props defined at
    // instantiation here.
    // 静态props在 Vue.extend() 时已经代理到组件的 prototype上了。我们只需要在实例化时，在这里代理 props 定义
    if (!(key in vm)) {
      proxy(vm, `_props`, key)
    }
  }
  toggleObserving(true)
}
```
initProps 处理 props 参数，再循环调用 defineReactive(props, key, value)添加监听。

defineReactive:
```
core\observer\index.js
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  const dep = new Dep()

  // 获取 obj.key 的属性描述 
  const property = Object.getOwnPropertyDescriptor(obj, key)
  // 没有属性描述直接返回
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  // 属性描述的 getter/setter（定义了则可以获取到）
  const getter = property && property.get
  const setter = property && property.set
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }

  let childOb = !shallow && observe(val)

  // 使用 Object.defineProperty 对数据进行监听
  Object.defineProperty(obj, key, {
    enumerable: true, // 可枚举
    configurable: true, // 可配置
    get: function reactiveGetter () {
      const value = getter ? getter.call(obj) : val
      // 这个Dep.target是用于添加 Watcher 的，正常情况下它的值为 null
      if (Dep.target) {
        // 添加 Watcher 相关
        dep.depend()
        if (childOb) {
          childOb.dep.depend()
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      // 返回对应值
      return value
    },
    set: function reactiveSetter (newVal) {
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      // 设置的新旧值一样，return
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // #7981: for accessor properties without setter
      // 访问器属性没有 setter 也 return
      if (getter && !setter) return
      // 有 setter 则调用它
      if (setter) {
        setter.call(obj, newVal)
      } 
      // 没有 setter 直接赋值
      else { val = newVal }
      childOb = !shallow && observe(newVal)
      // 值修改后通知所有 Watcher
      dep.notify()
    }
  })
}
```
### Data
接下来看 initData：
```
core\instance\state.js
function initData (vm: Component) {
  let data = vm.$options.data
  // 这里判断 data 是不是函数，如果是函数则需要通过 getData() 方法来获得 对象data（至于为什么存在 data 为函数的情况，Vue官方教程有提）
  data = vm._data = typeof data === 'function'
    ? getData(data, vm)
    : data || {}

  // 使用 Object.prototype.toString 来判断 data 不是一个 obj，不是则打出警告，data = {}
  if (!isPlainObject(data)) {
    data = {}
    process.env.NODE_ENV !== 'production' && warn(
      'data functions should return an object:\n' +
      'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
      vm
    )
  }
  // proxy data on instance 
  const keys = Object.keys(data) // 拿到键名
  const props = vm.$options.props // props
  const methods = vm.$options.methods // 方法
  let i = keys.length
  while (i--) {
    const key = keys[i]
    // 方法与 data 重名提示
    if (process.env.NODE_ENV !== 'production') {
      if (methods && hasOwn(methods, key)) {
        warn(
          `Method "${key}" has already been defined as a data property.`,
          vm
        )
      }
    }
    // props 与 data 重名提示
    if (props && hasOwn(props, key)) {
      process.env.NODE_ENV !== 'production' && warn(
        `The data property "${key}" is already declared as a prop. ` +
        `Use prop default value instead.`,
        vm
      )
    } else if (!isReserved(key)) {
      proxy(vm, `_data`, key)
    }
  }
  // 开始观察数据
  observe(data, true /* asRootData */) 👈
}
```

observe 函数中 实例化了 new Observer()
```
core\observer\index.js
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data

  constructor (value: any) {
    this.value = value
    this.dep = new Dep()
    this.vmCount = 0

    // 给value定义'__ob__'属性，值为this
    def(value, '__ob__', this)

    if (Array.isArray(value)) {
      if (hasProto) {
        protoAugment(value, arrayMethods)
      } else {
        copyAugment(value, arrayMethods, arrayKeys)
      }
      this.observeArray(value)
    } else {
      this.walk(value)
    }
    
  }

  // 遍历 value 所有的属性，每一个都调用 defineReactive 函数（这个方法仅在 value 是 Object 时调用）
  walk (obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  // 观察数组元素
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}
```
defineReactive 函数在 Props 中已经分析过了，这里不再提了。

#### 可以回过头看下第四篇：[学习Vue源码4](http://localhost:4000/2019/03/15/%E5%AD%A6%E4%B9%A0Vue%E6%BA%90%E7%A0%814-%E7%AE%80%E7%89%88%E5%93%8D%E5%BA%94%E5%BC%8F%E6%95%B0%E6%8D%AE%E5%8E%9F%E7%90%86/)
#### 第四篇内容和本篇的很多是类似的，只不过第四篇是一个超简化版Vue基本原理，看那一篇会比较清晰。