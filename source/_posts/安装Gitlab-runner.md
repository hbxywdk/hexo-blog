---
title: 安装Gitlab-runner
date: 2019-04-17 09:34:02
summary: 
desc: 
tag: 
category: Linux
---
### 前置工作
两台服务器，我的都是Linux CentOS 7.6 64位
一台用需要安装 Gitlab，关于如何安装 Gitlab ，可查看这篇文章 [阿里云安装GITLAB笔记](https://hbxywdk.github.io/2019/04/16/%E9%98%BF%E9%87%8C%E4%BA%91%E5%AE%89%E8%A3%85Gitlab%E7%AC%94%E8%AE%B0/)。
另一台用于安装 Gitlab-runner。

### Step1：安装Gitlab-runner
#### 下载系统对应的Gitlab-runner（当前安装版本为11.9.2）：

```
 # Linux x86-64
 sudo wget -O /usr/local/bin/gitlab-runner https://gitlab-runner-downloads.s3.amazonaws.com/latest/binaries/gitlab-runner-linux-amd64

 # Linux x86
 sudo wget -O /usr/local/bin/gitlab-runner https://gitlab-runner-downloads.s3.amazonaws.com/latest/binaries/gitlab-runner-linux-386

 # Linux arm
 sudo wget -O /usr/local/bin/gitlab-runner https://gitlab-runner-downloads.s3.amazonaws.com/latest/binaries/gitlab-runner-linux-arm
```
#### 给Gitlab-runner添加执行权限：
```
 sudo chmod +x /usr/local/bin/gitlab-runner
```
#### 如果想使用 Docker 可以安装 Docker（不使用可直接跳过）
```
 curl -sSL https://get.docker.com/ | sh
```
#### 创建一个 GitLab CI 用户
```
 sudo useradd --comment 'GitLab Runner' --create-home gitlab-runner --shell /bin/bash
```
#### 安装并启动服务
```
 sudo gitlab-runner install --user=gitlab-runner --working-directory=/home/gitlab-runner
 sudo gitlab-runner start
```

### Step2：注册Runner
#### 运行以下命令开始注册：
```
 sudo gitlab-runner register
```
#### 填入Gitlab URL：
```
 Please enter the gitlab-ci coordinator URL (e.g. https://gitlab.com )
 # 没有域名所以填的是IP
 http://xx.xx.xxx.xx:8888
```
#### 输入注册Runner所需要的token：
这里的token分为两种
`一种是 Shared Runner ，该 Runner 所有项目都可以使用`
位置：顶部设置图标🔧 -> 左侧栏Overview -> Runner
![share-runners](https://raw.githubusercontent.com/hbxywdk/hexo-blog/master/assets/2019-04/share-runner.jpg)
`另一种是 Specific Runner ，该 Runner 指定具体某个项目才可使用`
位置：进入某个项目 -> 左侧栏Setting -> CI/CD -> 在内容区域找到Runners一项，点击展开
![specific-runners](https://raw.githubusercontent.com/hbxywdk/hexo-blog/master/assets/2019-04/specific-runner.jpg)
```
 Please enter the gitlab-ci token for this runner
 # 这里我们使用 Shared Runner Token
 xxxxxxx
```
#### 输入一个Runner的description ，可以在稍后的GitLab的UI中更改这个描述：
```
 Please enter the gitlab-ci description for this runner
 test-gitlab-runner-description
```
#### 输入Runner的tags（这个tags后面会用到）
```
 Please enter the gitlab-ci tags for this runner (comma separated)
 my-tag
```
#### 选择Runner的执行者
这里我使用 shell。
```
 Please enter the executor: ssh, docker+machine, docker-ssh+machine, kubernetes, docker, parallels, virtualbox, docker-ssh, shell:
 shell
```
如果一切正常的话我们会看到
```
Runner registered successfully. Feel free to start it, but if it's running already the config should be automatically reloaded!
```
#### 如果选择了Docker则需要额外一步：
```
 Please enter the Docker image (eg. ruby:2.1):
 alpine:latest
```

我们回到Share Runners 就可以看到我们添加的 runner 了
![runner-success](https://raw.githubusercontent.com/hbxywdk/hexo-blog/master/assets/2019-04/runner-success.jpg)

### Step3 创建项目与 .gitlab-ci.yml 文件
#### 在项目根目录下创建 .gitlab-ci.yml 文件，然后用 git 提交。
```
# 定义 stages（阶段，会依次执行）
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
  # 在哪个分支才会执行脚本
  only:
    # - dev
    # - release
    - master
  script:
    - echo '模拟安装构建依赖阶段'
  tags:
    - my-tag

# 构建预prod环境src目录下应用
build_prod_job:
  stage: build_prod
  only:
    - master
  script:
    - echo '构建预prod环境src目录下应用阶段'
  tags:
    - my-tag

# 部署生产环境
deploy_prod_job:
  stage: deploy_prod
  only:
    - master
  script:
    - echo '部署生产环境阶段'
  tags:
    - my-tag

```
`然后你可能会看到报错`
```
Running with gitlab-runner 11.9.2 (fa86510e)
  on desc Z1UPKJjn
Using Shell executor...
Running on iZwz98jvb8bcz40ko474qsZ...
bash: line 68: git: command not found
bash: line 66: cd: /home/gitlab-runner/builds/Z1UPKJjn/0/main-group/main-project: No such file or directory
ERROR: Job failed: exit status 1
```
![尴尬](https://raw.githubusercontent.com/hbxywdk/hexo-blog/master/assets/2019-04/ganga.jpg)
`报错的原因是我的服务器是一台只安装了 Gitlab-runner 的服务器，根据报错提示，需要 git 来拉取 Gitlab 服务器上的代码，所以我们安装 git：`
```
yum -y install git
```
然后使用
```
git --version 查看 git 是否安装成功
```
之后重新执行pipline或提交代码，可以看到一切运行正常：
![deploy-success](https://raw.githubusercontent.com/hbxywdk/hexo-blog/master/assets/2019-04/deploy-success.jpg)

### 注意点：
1. Gitlab-runner 服务器上需要安装 Git。
2. 全部配置好了，提交后却一直处于 pending 状态并且提示：`This build is stuck, because the project doesn't have any runners online assigned to it. Go to Runners page `,这是因为未找到对应的 runner，原因一：可能是gitlab-runner注册失败，原因二：可能是.gitlab-ci.yml配置文件里面 tags 没有匹配到已注册可用的 runner，在 stage 中加入对应 runner 注册时输入的 tags 即可。
3. GitLab 最好不要与 GitLab Runner 装在同一台机器上。

### 参考:
> [Install GitLab Runner manually on GNU/Linux](https://docs.gitlab.com/runner/install/linux-manually.html)
> [Registering Runners](https://docs.gitlab.com/runner/register/index.html)
> [GitLab Runner commands](https://docs.gitlab.com/runner/commands/README.html)
> [GitLab CI/CD Pipeline Configuration Reference](https://docs.gitlab.com/ee/ci/yaml/README.html)
> [Docker搭建自己的Gitlab CI Runner](https://cloud.tencent.com/developer/article/1010595)


