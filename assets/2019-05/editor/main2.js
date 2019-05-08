var editor = document.querySelector('.editor') // 编辑器
var bold = document.querySelector('.bold') // 加粗按钮
var h1 = document.querySelector('.h1') // H1
var insterImg = document.querySelector('.inster-img') // 插入图片
// 文字颜色
var color = document.querySelector('.color')
var colorList = document.querySelector('.color>ul')
var red = document.querySelector('.red')
var blue = document.querySelector('.blue')

editor.innerHTML = '请输入内容' // 给编辑器一个初始内容

// 执行命令
function execCommand(commandName, value) {
  value = value ? value : null
  document.execCommand(commandName, false, value)
}

// 定义一个变量
var selectedRange

// 保存选择区域
function saveSelection() {
  var sel = window.getSelection()
  if (sel.getRangeAt && sel.rangeCount) {
    selectedRange = sel.getRangeAt(0)
  }
}

// 恢复选择区域
function restoreSelection() {
  var selection = window.getSelection()
  if (selectedRange) {
    try {
      selection.removeAllRanges()
    } catch (ex) {
      document.body.createTextRange().select()
      document.selection.empty()
    }
    selection.addRange(selectedRange)
  }
}

// 将图片读为base64格式
function imgToBase64(file) {
  return new Promise((resolve, reject) => {
    var reader = new FileReader()
    reader.readAsDataURL(file);
    reader.onload = function () {
      resolve(this.result)
    }
  })
}

// 在editor内做了鼠标键盘操作就保存一下选择区域
editor.onmouseup = editor.onkeyup = editor.onmouseout = function () {
  saveSelection();
}

bold.onclick = function (e) {
  restoreSelection() // 恢复选择区域
  editor.focus() // focus一下
  execCommand('bold')
  saveSelection() // 再保存一下选择区域
}

h1.onclick = function () {
  execCommand('formatBlock', '<h1>')
}

insterImg.onchange = function (e) {
  restoreSelection() // 恢复选择区域
  editor.focus() // focus一下

  var file = e.target.files[0]
  imgToBase64(file).then((val) => {
    var base64Url = val
    execCommand('insertImage', base64Url)
    saveSelection() // 再保存一下选择区域
  }) 
}

color.onclick = function () {
  colorList.style.display = 'block'
  // execCommand('formatBlock', '<h1>')
}
color.onmouseleave = function () {
  colorList.style.display = 'none'
}
red.onclick = function () {
  restoreSelection()
  editor.focus()
  execCommand('foreColor', 'red')
  saveSelection()
}
blue.onclick = function () {
  restoreSelection()
  editor.focus()
  execCommand('foreColor', 'blue')
  saveSelection()
}

