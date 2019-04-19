---
title: 阿里云安装Gitlab笔记
date: 2019-04-16 16:35:35
summary: 
desc: 
tag: 
category: Linux
---
### 前置工作
1. 一台阿里云服务器（2核4G以上）
2. 配置服务器入方向安全组规则，我这里配置了8888端口（阿里云安全组出方向默认允许所有访问，所以不用配置）

![配置入方向安全组](https://raw.githubusercontent.com/hbxywdk/hexo-blog/master/assets/2019-04/safe-group.jpg)


### Step1：安装和配置必要依赖项
访问 [Gitlab安装地址](https://about.gitlab.com/install/)，选择对应系统的安装方式，我的是 CentOS 7.6 故选择 CentOS 7.X 的安装方式。 

#### 如何查看自己是什么系统：
```
lsb_release -a
```
#### 在CentOS 7(以及RedHat/Oracle/Science Linux 7)上，使用下面的命令打开系统防火墙中的HTTP和SSH访问。
```
sudo yum install -y curl policycoreutils-python openssh-server
sudo systemctl enable sshd
sudo systemctl start sshd
sudo firewall-cmd --permanent --add-service=http
sudo systemctl reload firewalld
```
在执行 `sudo firewall-cmd --permanent --add-service=http` 时可能会遇到 `FirewallD is not running` 错误提示，意思是`未运行防火墙`。 
使用以下命令开启防火墙即可：
```
systemctl start firewalld.service
```
#### 接下来，安装 Postfix 邮件通知服务。如果要使用其他解决方案，可跳过此步，并在安装GitLab之后配置外部SMTP服务器。
```
sudo yum install postfix
sudo systemctl enable postfix
sudo systemctl start postfix
```
这一步可能会遇到一个报错 `Job for postfix.service failed because the control process exited with error code. See "systemctl status postfix.service" and "journalctl -xe" for details.` 
解决方法是修改 `/etc/postfix/main.cf` 的配置，使用：
```
vi /etc/postfix/main.cf
```
进入编辑 'main.cf'，按 `I` 进入修改：
```
inet_interfaces = all
inet_protocols = ipv4 // 或 all
```
修改完成后 依次按 `Esc`、`:`、`w`、`q`，回车保存修改，之后重启服务。
```
sudo systemctl restart postfix
```

### Step2：添加GitLab包存储库并安装该包

#### 设置防火墙：
```
# 开启 8888 端口
firewall-cmd --zone=public --add-port=8888/tcp --permanent
# 重启防火墙
systemctl restart firewalld
```

#### 添加GitLab包的仓库
```
curl https://packages.gitlab.com/install/repositories/gitlab/gitlab-ee/script.rpm.sh | sudo bash
```

#### 接下来，安装Gitlab包：
```
sudo EXTERNAL_URL="https://gitlab.example.com" yum install -y gitlab-ee
```
将https://gitlab.example.com更改为您要访问GitLab实例的URL。 安装将自动配置并启动该URL的GitLab。 

我这里没有域名就直接使用 IP + 端口号的形式：
```
sudo EXTERNAL_URL="xx.xx.xxx.xx:8888" yum install -y gitlab-ee
```
然后等待安装 

如果安装完之后要修改访问的域名或者 IP，则需修改 `/etc/gitlab/gitlab.rb` 文件中的 `external_url` 一项，修改方法与上面修改 `/etc/postfix/main.cf` 的一样。

之后重新配置服务
```
gitlab-ctl reconfigure
```

### Step3：登录
经过上面，的安装与设置，就可以访问域名或者IP了。
打开xx.xx.xxx.xx:8888，需要设置`root帐号`的密码，之后即可使用root帐号登录。
这里忘记截图了，就附上用户设置的一张截图吧
![设置](https://raw.githubusercontent.com/hbxywdk/hexo-blog/master/assets/2019-04/gitlab-user-setting.jpg)
### 附:
Gitlab常用命令：
```
//启动
sudo gitlab-ctl start

//停止
sudo gitlab-ctl stop

//重启
sudo gitlab-ctl restart

//查看状态
sudo gitlab-ctl status

//使更改配置生效
sudo gitlab-ctl reconfigure

```

### 参考:
> [GitLab Installation](https://about.gitlab.com/install)
> [阿里云 GitLab 折腾笔记](https://blog.hhking.cn/2018/11/24/aliyun-gitlab-install/)
> [CentOS下yum命令出现Loaded plugins: fastestmirror](https://blog.csdn.net/tiweeny/article/details/73333806)
> [Failed to set locale, defaulting to C解决](https://zocodev.com/aliyun-ecs-errors-resolve.html)