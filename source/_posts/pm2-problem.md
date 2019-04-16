---
title: 使用pm2时遇到的问题
date: 2018-11-04 17:44:13
summary: 
desc: 
tag: 
category: Pm2
---

一个使用Nuxt开发的多语言官网项目，代码提交后使用gitlab自动部署项目，服务器上使用PM2来管理。 

由于一些原因前端项目和后端项目在同一台服务器，后端重启服务器，会导致前端服务挂掉，后来增加了服务器重启自动执行脚本，重启后将Nuxt项目跑起来。 

但之后通过gitlab-CI自动部署的代码 pm2 都跑不起来

之前gitlab-CI配置为 pm2 delete all && pm2 start npm --name "nuxt-official-website" -- run start"

后添加了pm2 stop all，解决了这个问题

pm2 stop all && pm2 delete all && pm2 start npm --name "nuxt-official-website" -- run start"
