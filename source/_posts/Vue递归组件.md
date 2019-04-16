---
title: Vue递归组件
date: 2018-12-25 16:59:13
summary: 
desc: 
tag: 
category: Vue
---
使用Vue开发树状组件的时候需要使用到递归组件，即在模板中调用自己。 

要使用递归组件，该组件必须有name属性。 

示例：
```
<template>
  <div>

    <div class="list-item" v-for="(item, index) in treeData" :key="index">
      <p @click="itemClick(item)">{{ item.name }}</p>
      <div class="child" v-if="item.childs.length">
        <product-tree :treeData="item.childs"></product-tree>
      </div>
    </div>

  </div>
</template>
<script>

export default {
  name: 'product-tree',
  data () {
    return {
      treeData: [
        {
          id: '1',
          pid: null,
          name: '一级类目1',
          childs: [
            {
              id: '1-1',
              pid: 1,
              name: '二级类目1',
              childs: [
                {
                  id: '1-1-1',
                  pid: 1-1,
                  name: '三级类目1',
                  childs: [

                  ]
                }
              ]
            },
            {
              id: '1-2',
              pid: 1,
              name: '二级类目2',
              childs: [
              ]
            }
          ]
        },
        {
          id: '2',
          pid: null,
          name: '一级类目2',
          childs: [

          ]
        },
      ]
    }
  },
  created() {
  },
  methods: {
    // 菜单点击
    itemClick(item) {
      console.log(item)
    }
  }
}
</script>

```
