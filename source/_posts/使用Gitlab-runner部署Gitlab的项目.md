---
title: 使用Gitlab-runner部署Gitlab的项目
date: 2019-04-18 09:29:44
summary: 
desc: 
tag: 
category: Linux
---

### Step1 Linux 对 Linux 免密登录
在[这篇](https://hbxywdk.github.io/2019/04/17/Linux%E5%85%8D%E5%AF%86%E7%99%BB%E5%BD%95/)文章中已经实现了 Windows 对 Linux 的免密登录，Linux 对 Linux 也是类似的。
假设我们要用`机器A`登录`机器B` 
#### 首先在机器A中生成公、私钥
```
ssh-keygen -t rsa
```
#### 接着一路回车，然后可以键入以下命令查看生成的内容
```
cd ~/.ssh
ls -a
.  ..  authorized_keys  id_rsa  id_rsa.pub  known_hosts
```
#### 在机器A上输入以下命令，将机器A的公钥发送给机器B
```
ssh-copy-id xx.xx.xxx.xx # 机器B的公网IP
```
#### 接着按提示输入yes或回车，最后需要输入机器B的密码，成功的话将会看到
```
Number of key(s) added: 1
```
#### 尝试登录机器B
```
ssh root@xx.xx.xxx.xx
Welcome to Alibaba Cloud Elastic Compute Service !
```

### Step2 在本地创建一个项目
这里直接使用 Vue-cli 生成项目
```
vue create gitlab-vue
```
本地运行一下
![gitlab-vue]()

### 参考：
