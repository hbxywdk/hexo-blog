---
title: 记一次使用element-ui开发时，使用el-menu组件遇到的问题
date: 2018-11-29 18:25:00
summary: 
desc: 
tag: 
category: Vue
---
element-ui版本: 2.4.11

场景：vue路由分为两种，一种显示，由el-menu组件负责展示，以当前path作为菜单is-active 样式显示的条件；一种隐藏，在页面中以vue-router的方法来跳转。 

问题：点击el-menu-item组件可以正确的通知el-menu组件，对当前激活菜单样式做出调整。但使用vue-router进行跳转，无法触发emit方法来修改el-menu组件内部状态，倒置页面跳转了，菜单还高亮在原来的菜单；

解决方法：在不修改element-ui源码的前提下，只需要加上以下代码，来监听路由变化，使用ref获取menu组件，直接修改其中的activeIndex的值。

简化代码如下：

```
<template>
  <div>
    <!-- menu添加ref -->
    <el-menu
      :default-active="currentPath"
      background-color="#282a3c"
      text-color="#d2d9e0"
      active-text-color="#fff"
      ref="menu"
    >
    </el-menu>
</template>

<script>
export default {
  data() {
    return {
      currentPath: this.$route.path
    }
  },
  watch: {
    // 添加监听，手动改变activeIndex值，解决vue-router跳转，菜单仍然高亮的bug
    '$route' (to, from) {
      this.$refs.menu.activeIndex = to.path
    }
  }
}
</script>
```
