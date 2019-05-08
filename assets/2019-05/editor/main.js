var editor = document.querySelector('.editor') // 编辑器
var bold = document.querySelector('.bold') // 加粗按钮

editor.innerHTML = '请输入内容' // 给编辑器一个初始内容

// 执行命令
function execCommand(commandName, value) {
  value = value ? value : null
  document.execCommand(commandName, false, value)
}

bold.onclick = function (e) {
  execCommand('bold')
}
