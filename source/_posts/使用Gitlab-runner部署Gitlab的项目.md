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

#### 注意：
`我们在搭建 gitlab-runner 时创建了一个叫 ‘gitlab-runner’ 的用户，gitlab-runner 所有的操作都是在 ‘gitlab-runner’ 帐号下进行的`
可以在脚本中加入 whoami 命令：
```
whoami
# 可以看到确实是 gitlab-runner 用户
gitlab-runner
```
`所以免密登录也应该在 ‘gitlab-runner’ 帐号下配置，如果是用了 ‘root’ 帐号配的免密登录，gitlab-runner 跑到免密登录时则会看到报错：`
```
Host key verification failed.
ERROR: Job failed: exit status 1
```
`因为 ‘gitlab-runner’ 用户根本没有免密登录权限`

#### 登录gitlab-runner用户
在安装gitlab-runner时，有这样一行命令
```
sudo useradd --comment 'GitLab Runner' --create-home gitlab-runner --shell /bin/bash
```
创建了gitlab-runner帐号
如果没有，需重新创建，然后修改密码
```
passwd gitlab-runner
```
接着使用`gitlab-runner`帐号登录，然后继续

---

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
![gitlab-vue](https://raw.githubusercontent.com/hbxywdk/hexo-blog/master/assets/2019-04/gitlab-vue.jpg)

在 Gitlab 上也创建一个项目，将本地项目推送到 Gitlab 的项目中
```
cd existing_folder
git init
git remote add origin git@xx.xx.xxx.xx:root/gitlab-vue.git
git add .
git commit -m "Initial commit"
git push -u origin master
```
![gitlab-vue](https://raw.githubusercontent.com/hbxywdk/hexo-blog/master/assets/2019-04/gitlab-project.jpg)

### Step3 编写 .gitlab-ci.yml 文件
在项目根目录创建 .gitlab-ci.yml 文件
主要流程如下
1. 安装构建依赖。
2. 移除旧版本项目文件，并打包新文件。
3. 登录项目部署服务器，将打包好的文件拷贝过去。

注意这里前两步都是在Gitlab-runner上完成的

根据流程我们先定义以下基本步骤，并提交，之后可以看到Pipelines一切正常
```
stages:
  - install_deps
  - build_prod
  - deploy_prod

cache:
  key: ${CI_BUILD_REF_NAME}
  paths:
    - node_modules/
    - dist

# 安装构建依赖
install_deps_job:
  stage: install_deps
  only:
    - master
  script:
    - echo '安装构建依赖阶段'
  tags:
    - my-tag

# 移除旧版本项目文件，并打包新文件
build_prod_job:
  stage: build_prod
  only:
    - master
  script:
    - echo '移除旧版本项目文件，并打包新文件阶段'
  tags:
    - my-tag

# 登录项目部署服务器，将打包好的文件拷贝过去
deploy_prod_job:
  stage: deploy_prod
  only:
    - master
  script:
    - echo '登录项目部署服务器，将打包好的文件拷贝过去'
  tags:
    - my-tag
```
接下来分步解决

#### 1.安装构建依赖
这一步比较简单，直接安装依赖即可
`注意：要先在服务器上安装 nodeJs，否则会报错 npm: command not found` 安装方法看这里：[linux下node的安装以及环境配置](https://blog.csdn.net/ziyetian666/article/details/79737541)
```
# 安装构建依赖
install_deps_job:
  stage: install_deps
  # 这一步在多个分支上都会执行，一般会将所有环境的分支名都写上去
  only:
    - dev
    - master
  script:
    - echo '安装构建依赖阶段'
    - pwd # 我们查看一下现在的目录位置: /home/gitlab-runner/builds/6_sebBuN/0/root/gitlab-vue
    - npm i # 安装依赖
  tags:
    - my-tag
```
我们提交一下
在 Gitlab-runner 服务器中我们输入以下命令查看一下
```
cd /home/gitlab-runner/builds/6_sebBuN/0/root/gitlab-vue
ls -a

# 这里看到 node_modules 文件夹，说明已成功安装依赖
.                .editorconfig  .gitlab-ci.yml     public
..               .eslintrc.js   node_modules       README.md
babel.config.js  .git           package.json       src
.browserslistrc  .gitignore     postcss.config.js  yarn.lock

```

#### 2.移除旧版本项目文件，并打包新文件
Vue-cli3 的打包命令会将项目打包在 dist 文件夹中
这一步我们先移除旧版本的 dist 文件夹，然后重新打包
```
# 移除旧版本项目文件，并打包新文件
build_prod_job:
  stage: build_prod
  only:
    - master
  script:
    - echo '移除旧版本项目文件，并打包新文件阶段'
    - pwd # 查看当前目录
    - ls -a # 查看所有文件
    - rm -rf ./dist # 删除当前文件夹下的 dist 文件夹
    - npm run build # 打包
    - ls -a # 打包完成，再次查看所有文件
  tags:
    - my-tag
```
提交代码，在Pipeline中可以看到目录中多出了 dist 文件夹
```
$ ls -a
.
..
babel.config.js
.browserslistrc
dist # 这里多出了 dist 文件夹
.editorconfig
.eslintrc.js
.git
.gitignore
.gitlab-ci.yml
node_modules
package.json
postcss.config.js
public
README.md
src
yarn.lock
```

#### 3.登录项目部署服务器，将打包好的文件拷贝过去
我们在项目服务器的 root 新建 www 文件夹，用来放我们的项目打包文件

```
# 登录项目部署服务器，将打包好的文件拷贝过去
deploy_prod_job:
  stage: deploy_prod
  only:
    - master
  script:
    - echo '登录项目部署服务器，将打包好的文件拷贝过去'
    - cd dist # 进入dist
    - pwd
    - whoami # gitlab-runner
     # 登录目标服务器
    - ssh root@39.98.177.19
    # 列出所有文件
    - ssh root@39.98.177.19 "ls -a"
    # 删 www 文件夹下所有内容
    - ssh root@39.98.177.19 "rm -rf ./www/*"
    # 使用 scp 命令远程拷贝文件
    - scp -r -P 22 ./* root@39.98.177.19:/root/www
  tags:
    - my-tag
```
这里 ssh root@39.98.177.19 可能会报错 `Pseudo-terminal will not be allocated because stdin is not a terminal. `
字面意思是伪终端将无法分配，因为标准输入不是终端。增加-t -t参数来强制伪终端分配，即使标准输入不是终端， `这里不用理会！`。
```
ssh -t -t root@xx.xx.xxx.xx
```


### 参考：
> [如何在 CentOS 安装 node.js](https://blog.csdn.net/lu_embedded/article/details/79138650)
