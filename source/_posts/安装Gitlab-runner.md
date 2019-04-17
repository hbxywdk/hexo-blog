---
title: 安装Gitlab-runner
date: 2019-04-17 09:34:02
summary: 
desc: 
tag: 
category: Linux
---
### Step1：安装Gitlab-runner（版本为11.9.2）
#### 下载系统对应的Gitlab-runner版本：
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
#### 如果想使用 Docker 可以安装 Docker（不使用Docker直接跳过）
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
 # 如果出现未定义命令可去掉sudo
 sudo gitlab-runner register
```
#### 填入Gitlab URL：
```
 Please enter the gitlab-ci coordinator URL (e.g. https://gitlab.com )
 # 这里我填的是IP
 http://xx.xx.xxx.xx:8888
```
#### 输入注册Runner所需要的token：
这里的token分为两种
`一种是 Shared Runner ，该 Runner 所有项目都可以使用`
位置：顶部设置图标🔧 -> 左侧栏Overview -> Runner
![share-runners]()
`另一种是 Specific Runner ，该 Runner 指定具体某个项目才可使用`
位置：进入某个项目 -> 左侧栏Setting -> CI/CD -> 在内容区域找到Runners一项，点击展开
![specific-runners]()
```
 Please enter the gitlab-ci token for this runner
 # token
 xxxxxxx
```
#### 输入一个Runner的description ，可以在稍后的GitLab的UI中更改这个描述：
```
 Please enter the gitlab-ci description for this runner
 gitlab-runner-description
```
#### 输入Runner的tags
```
 Please enter the gitlab-ci tags for this runner (comma separated)
 my-tag
```
#### 选择Runner的执行者
这里我使用 shell，如果要使用 Docker 则输入 docker。
```
 Please enter the executor: ssh, docker+machine, docker-ssh+machine, kubernetes, docker, parallels, virtualbox, docker-ssh, shell:
 shell
```
如果一切正常的话我们将会看到
```
Runner registered successfully. Feel free to start it, but if it's running already the config should be automatically reloaded!
```
#### 如果选择了Docker则需要额外一步：
```
 Please enter the Docker image (eg. ruby:2.1):
 alpine:latest
```

我们回到Share Runners 就可以看到我们添加的 runner 了
![specific-runners]()



GitLab Runner 最好不要与 GitLab 安装在同一台机器上。
