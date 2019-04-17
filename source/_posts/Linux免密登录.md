---
title: Linux免密登录
date: 2019-04-17 17:45:24
summary: 
desc: 
tag: 
category: Linux
---

### 准备工作：
一台Linux系统服务器 
一台电脑（我的是windows 10系统）

### Step1 windows上生成 ssh key

#### 生成ssh key（这里替换为你的邮箱）
```
ssh-keygen -t rsa -C "youremail@example.com"
```
#### 进入ssh目录
```
cd ~/.ssh
```
#### 查看所有文件
```
ls -a 
# 可以看到 id_rsa  id_rsa.pub
```
#### 查看公钥内容（注意是.pub结尾的公钥文件）
```
cat id_rsa.pub
```
#### 复制公钥内容
```
ssh-rsa XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX youremail@example.com
```

### Step2 Linux中写入上一步复制的公钥

#### 登录 Linux 服务器，执行命令
```
 ssh-keygen -t rsa
```
然后一路回车
#### 然后进入 .ssh
```
 cd ~/.ssh
```
#### 编辑 authorized_keys 文件
```
 vi authorized_keys
```
进入编辑后，按 `I` 进入修改，将我们电脑上的公钥复制进去。 
修改完成后 依次按 `Esc`、`:`、`w`、`q`，回车保存修改。
#### 然后查看一下
```
cat authorized_keys
ssh-rsa XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX youremail@example.com
```
看到已成功修改

### 登录一下
```
ssh root@xx.xxx.xxx.xxx # 填你的服务器IP
```
#### 如果你的服务器是阿里云且重装过系统，可能会遇到以下报错
```
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@    WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!     @
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
IT IS POSSIBLE THAT SOMEONE IS DOING SOMETHING NASTY!
Someone could be eavesdropping on you right now (man-in-the-middle attack)!
It is also possible that a host key has just been changed.
The fingerprint for the ECDSA key sent by the remote host is
SHA256:xi/sxkP1juN+73HCAhkSXRMCuN48zfMjDTUylonzAPo.
Please contact your system administrator.
Add correct host key in /c/Users/Wen Minghui/.ssh/known_hosts to get rid of this message.
Offending ECDSA key in /c/Users/Wen Minghui/.ssh/known_hosts:8
ECDSA host key for xx.xxx.xxx.xxx has changed and you have requested strict checking.
Host key verification failed.
```
#### 解决：使用命令清除所连接的服务器IP
```
 ssh-keygen -R XX.XX.XX.XX 
```
#### 再次尝试连接
```
ssh root@xx.xxx.xxx.xxx
```
可以看到登录成功
```
Last login: Wed Apr 17 18:03:44 2019 from 14.154.30.158

Welcome to Alibaba Cloud Elastic Compute Service !
```

#### 如果是 Linux 对 Linux 的免密登录也是差不多的，下一篇就使用 Gitlab-runner 结合免密登录自动部署 Gitlab 上的项目。

### 参考
> [WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED! 的解决](https://blog.csdn.net/ky1in93/article/details/80104448)


