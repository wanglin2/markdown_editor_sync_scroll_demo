# 简介

随着`Markdown`越来越流行，`Markdown`编辑器也越来越多，除去所见即所得的实时预览编辑器外，通常其他`Markdown`编辑器都会采用源代码和预览双栏显示的方式，就像掘金的编辑器一样：

![图片名称](http://aliyuncdn.lxqnsys.com/markdown/GaN5ceCCyifnJe5A8nrGsmkjC.png)

这种方式一般会有一个同步滚动的功能，比如在编辑区域滚动时，预览区域会随着滚动，反之亦然，方便两边对照查看，如果你用过多个平台的`Markdown`编辑器的话可能会发现有的平台编辑器同步滚动非常精确，比如掘金、`segmentfault`、`CSDN`等，而有的平台编辑器当图片比较多的情况下同步滚动两边会偏差会比较大，比如开源中国（底层使用的是开源的[ editor.md](https://github.com/pandao/editor.md)）、`51CTO`等，另外还有少数平台则连同步滚动的功能都没有（再见）。

不精确的同步滚动实现起来比较简单，遵循一个等式即可：

```js
// 已滚动距离与总的可滚动距离的比值相等
editorArea.scrollTop / (editorArea.scrollHeight - editorArea.clientHeight) = previewArea.scrollTop / (previewArea.scrollHeight - previewArea.clientHeight)
```

那么如何才能让同步滚动精确一点呢，我们可以参考[bytemd](https://github.com/bytedance/bytemd)，实现的核心就是使用[unified](https://github.com/unifiedjs/unified)，预知详细信息，且看下文分解。



# unified简介

`unified`是一个通过使用语法树来进行解析、检查、转换和序列化文本内容的接口，可以处理`Markdown`、`HTML`和自然语言。它是一个库，作为一个独立的执行接口，负责执行器的角色，调用其生态上相关的插件完成具体任务。同时`unified`也代表一个生态，要完成前面说的文本处理任务需要配合其生态下的各种插件，截止到目前，它生态中的插件已经有三百多个！鉴于数量实在太多，很容易迷失在它庞大的生态里，可谓是劝退生态。

`unified`主要有四个生态：[remark](https://unifiedjs.com/explore/project/remarkjs/remark/)、[rehype](https://unifiedjs.com/explore/project/rehypejs/rehype/)、[retext](https://unifiedjs.com/explore/project/retextjs/retext/)、[redot](https://unifiedjs.com/explore/project/redotjs/redot/)，这四个生态下又有各自的生态，此外还包括处理语法树的一些工具、其他构建相关的工具。

`unified`的执行流程说出来我们应该都比较熟悉，分为三个阶段：

1.`Parse`

将输入解析成语法树，[mdast](https://github.com/syntax-tree/mdast)负责定义规范，`remark`和`rehype`等处理器否则创建。

2.`Transform`

上一步生成的语法树会被传递给各种插件，进行修改、检查、转换等工作。

3.`Stringify`

这一步会将处理后的语法树再重新生成文本内容。

`unified`的独特之处在于允许一个处理流程中进行不同格式之间的转换，所以能满足我们本文的需求，也就是将`Markdown`语法转换成`HTML`语法，我们会用到其生态中的`remark`（解析`Markdown`）、`rehype`（解析`HTml`）。

具体来说就是使用`remark`生态下的[remark-parse](https://github.com/remarkjs/remark/tree/main/packages/remark-parse)插件来将输入的`Markdown`文本转换成`Markdown`语法树，然后使用[remark-rehype](https://github.com/remarkjs/remark-rehype)桥接插件来将`Markdown`语法树转换成`HTML`语法树，最后使用[rehype-stringify](https://github.com/rehypejs/rehype/tree/main/packages/rehype-stringify)插件来将`HTML`语法树生成`HTML`字符串。



# 搭建基本结构

> 本文项目使用`Vue3`构建。

编辑器我们使用[CodeMirror](https://codemirror.net/)，`Markdown`转`HTML`我们使用上一节介绍的[unified](https://github.com/unifiedjs/unified)，安装一下相关依赖：

```bash
npm i codemirror unified remark-parse remark-rehype rehype-stringify
```

那么基本结构及逻辑就很简单了，模板部分：

```HTML
<template>
  <div class="container">
    <div class="editorArea" ref="editorArea"></div>
    <div class="previewArea" ref="previewArea" v-html="htmlStr"></div>
  </div>
</template>
```

`js`部分：

```js
import { onMounted, ref } from "vue";
import CodeMirror from "codemirror";
import "codemirror/mode/markdown/markdown.js";
import "codemirror/lib/codemirror.css";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";

// CodeMirror编辑器实例
let editor = null;
// 编辑区域容器节点
const editorArea = ref(null);
// 预览区域容器节点
const previewArea = ref(null);
// markdown转换成的html字符串
const htmlStr = ref("");

// 编辑器文本发生变化后进行转换工作
const onChange = (instance) => {
  unified()
    .use(remarkParse) // 将markdown转换成语法树
    .use(remarkRehype) // 将markdown语法树转换成html语法树，转换之后就可以使用rehype相关的插件
    .use(rehypeStringify) // 将html语法树转换成html字符串
    .process(instance.doc.getValue())// 输入编辑器的文本内容
    .then(
      (file) => {
        // 将转换后得到的html插入到预览区节点内
        htmlStr.value = String(file);
      },
      (error) => {
        throw error;
      }
    );
};

onMounted(() => {
  // 创建编辑器
  editor = CodeMirror(editorArea.value, {
    mode: "markdown",
    lineNumbers: true,
    lineWrapping: true,
  });
  // 监听编辑器文本修改事件
  editor.on("change", onChange);
});
```

监听到编辑器文本变化，就使用`unified`执行转换工作，效果如下：

![图片名称](http://aliyuncdn.lxqnsys.com/markdown/ywwkrt48ka5dfR7jDHzAYh7fd.gif)

# 实现精确的同步滚动

## 基本实现原理

实现精确同步滚动的核心在于我们要能把编辑区域和预览区域两边的“节点”对应上，比如当编辑区域滚动到了一个一级标题处，我们要能知道在预览区域这个一级标题节点所在的位置，反之亦然。

预览区域的节点我们很容易获取到，因为就是普通的`DOM`节点，关键在于编辑区域的节点，编辑区域的节点是`CodeMirror`生成的，显然无法和预览区域的节点对应上，此时，`unified`不同于其他`Markdown`转`HTML`开源库（比如[markdown-it](https://github.com/markdown-it/markdown-it)、[marked](https://github.com/markedjs/marked)、[showdown](https://github.com/showdownjs/showdown)）的优点就显示出来了，一是因为它基于`AST`，二是因为它是管道化，在不同插件之间流转的是`AST`树，所以我们可以写个插件来获取到这个语法树数据，另外预览区域的`HTML`是基于`remark-rehype`插件输出的`HTML`语法树生成的，所以这个`HTML`语法树显然是可以和预览区域的实际节点对应上的，这样，只要我们把自定义的插件插入到`remark-rehype`之后即可获取到`HTML`语法树数据：

```js
let treeData = null
// 自定义插件，获取HTML语法树
const customPlugin = () => (tree, file) => {
  console.log(tree);
  treeData = tree;// 保存到treeData变量上
};
unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(customPlugin)// 我们的插件在remarkRehype插件之后使用
    .use(rehypeStringify)
	// ...
```

看一下输出结果：


![图片名称](http://aliyuncdn.lxqnsys.com/markdown/rFHwaxXp3mDK3TsRQeZCzGB83.png)

接下来我们监听一下编辑区域的滚动事件，并在事件回调函数里打印一下语法树数据以及生成的预览区域的`DOM`节点数据：

```js
editor.on("scroll", onEditorScroll);

// 编辑区域的滚动事件
const onEditorScroll = () => {
  computedPosition();
};

// 计算位置信息
const computedPosition = () => {
  console.log(treeData, treeData.children.length);
  console.log(
    previewArea.value.childNodes,
    previewArea.value.childNodes.length
  );
};
```

打印结果：

![图片名称](http://aliyuncdn.lxqnsys.com/markdown/2AchMcpzYNMdzWwK2txSbyDWb.png)

注意看控制台输出的语法树的节点和实际的`DOM`节点是一一对应的。

当然仅仅对应还不够，`DOM`节点能通过`DOM`相关属性获取到它的高度信息，语法树的某个节点我们也需要能获取到它在编辑器中的高度信息，这个能实现依赖两点，一是语法树提供了某个节点的定位信息：


![图片名称](http://aliyuncdn.lxqnsys.com/markdown/PWw6JryziPp35QwRyKijk2Gph.png)

二是`CodeMirror`提供了获取某一行高度的接口：


![图片名称](http://aliyuncdn.lxqnsys.com/markdown/mxpiNTWdaHzkCYHDEBPe3m3CW.png)

所以我们能通过某个节点的起始行获取该节点在`CodeMirror`文档里的高度信息，测试一下：

```js
const computedPosition = () => {
  console.log('---------------')
  treeData.children.forEach((child, index) => {
    // 如果节点类型不为element则跳过
    if (child.type !== "element") {
      return;
    }
    let offsetTop = editor.heightAtLine(child.position.start.line, 'local');// 设为local返回的坐标是相对于编辑器本身的，其他还有两个可选项：window、page
    console.log(child.children[0].value, offsetTop);
  });
};
```


![图片名称](http://aliyuncdn.lxqnsys.com/markdown/SSCQSwSMQEzb85pZM5FAYGcpc.png)

可以看到第一个节点的`offsetTop`为`80`，为什么不是`0`呢，上面`CodeMirror`的文档截图里其实有说明，返回的高度是这一行的底部到文档顶部的距离，所以要获取某行顶部所在高度相当于获取上一行底部所在高度，所以将行数减`1`即可：

```js
let offsetTop = editor.heightAtLine(child.position.start.line - 1, 'local');
```


![图片名称](http://aliyuncdn.lxqnsys.com/markdown/tFnceCP7KZt2wH5erC8jW3TEc.png)

编辑区和预览区都能获取到节点的所在高度之后，接下来我们就可以这样做，当在编辑区域触发滚动后，先计算出两个区域的所有元素的所在高度信息，然后再获取编辑区域当前的滚动距离，求出当前具体滚动到了哪个节点内，因为两边的节点是一一对应的，所以可以求出预览区域对应节点的所在高度，最后让预览区域滚动到这个高度即可：

```js
// 新增两个变量保存节点的位置信息
let editorElementList = [];
let previewElementList = [];

const computedPosition = () => {
  // 获取预览区域容器节点下的所有子节点
  let previewChildNodes = previewArea.value.childNodes;
  // 清空数组
  editorElementList = [];
  previewElementList = [];
  // 遍历所有子节点
  treeData.children.forEach((child, index) => {
    if (child.type !== "element") {
      return;
    }
    let offsetTop = editor.heightAtLine(child.position.start.line - 1, "local");
    // 保存两边节点的位置信息
    editorElementList.push(offsetTop);
    previewElementList.push(previewChildNodes[index].offsetTop); // 预览区域的容器节点previewArea需要设置定位
  });
};

const onEditorScroll = () => {
  computedPosition();
  // 获取编辑器滚动信息
  let editorScrollInfo = editor.getScrollInfo();
  // 找出当前滚动到的节点的索引
  let scrollElementIndex = null;
  for (let i = 0; i < editorElementList.length; i++) {
    if (editorScrollInfo.top < editorElementList[i]) {
      // 当前节点的offsetTop大于滚动的距离，相当于当前滚动到了前一个节点内
      scrollElementIndex = i - 1;
      break;
    }
  }
  if (scrollElementIndex >= 0) {
    // 设置预览区域的滚动距离为对应节点的offsetTop
    previewArea.value.scrollTop = previewElementList[scrollElementIndex];
  }
};
```

效果如下：

![图片名称](http://aliyuncdn.lxqnsys.com/markdown/DnEjfZmJC4kEn7ayE2Z5mXYy3.gif)

## 修复节点内滚动不同步的问题

可以看到跨节点滚动已经比较精准了，但是如果一个节点高度比较大，那么在节点内滚动右侧是不会同步滚动的：

![图片名称](http://aliyuncdn.lxqnsys.com/markdown/NZ4ybfBfCZKACXJebpz6TBtsp.gif)

原因很简单，我们的同步滚动目前只精确到某个节点，只要滚动没有超出该节点，那么计算出来的`scrollElementIndex`都是不变的，右侧的滚动当然就不会有变化。

解决这个问题的方法也很简单，还记得文章开头介绍非精准滚动的原理吗，这里我们也可以这么计算：编辑区域当前的滚动距离是已知的，当前滚动到的节点的顶部距离文档顶部的距离也是已知的，那么它们的差值就可以计算出来，然后使用下一个节点的`offsetTop`值减去当前节点的`offsetTop`值可以计算出当前节点的高度，那么这个差值和节点高度的比值也就可以计算出来：


![图片名称](http://aliyuncdn.lxqnsys.com/markdown/FArhXf38S2G5pWdd3RckAQFFt.png)

对于预览区域的对应节点来说也是一样，它们的比值应该是相等的，所以等式如下：

```js
(editorScrollInfo.top - editorElementList[scrollElementIndex]) /
      (editorElementList[scrollElementIndex + 1] -
        editorElementList[scrollElementIndex]) 
= 
(previewArea.value.scrollTop - previewElementList[scrollElementIndex]) / (previewElementList[scrollElementIndex + 1] -
          previewElementList[scrollElementIndex])
```

根据这个等式计算出`previewArea.value.scrollTop`的值即可，最终代码：

```js
const onEditorScroll = () => {
  computedPosition();
  let editorScrollInfo = editor.getScrollInfo();
  let scrollElementIndex = null;
  for (let i = 0; i < editorElementList.length; i++) {
    if (editorScrollInfo.top < editorElementList[i]) {
      scrollElementIndex = i - 1;
      break;
    }
  }
  if (scrollElementIndex >= 0) {
    // 编辑区域滚动距离和当前滚动到的节点的offsetTop的差值与当前节点高度的比值
    let ratio =
      (editorScrollInfo.top - editorElementList[scrollElementIndex]) /
      (editorElementList[scrollElementIndex + 1] -
        editorElementList[scrollElementIndex]);
    // 根据比值相等计算出预览区域应该滚动到的位置
    previewArea.value.scrollTop =
      ratio *
        (previewElementList[scrollElementIndex + 1] -
          previewElementList[scrollElementIndex]) +
      previewElementList[scrollElementIndex];
  }
};
```

效果如下：

![图片名称](http://aliyuncdn.lxqnsys.com/markdown/WW83RRMxzbdRkrid2dkCsfTnr.gif)

## 修复两边没有同时滚动到底部的问题

同步滚动已经基本上很精确了，不过还有个小问题，就是当编辑区域已经滚动到底了，而预览区域没有：

![图片名称](http://aliyuncdn.lxqnsys.com/markdown/WfnrwKaF86PZAkArt8pfCbM4h.gif)

这是符合逻辑的，但是不符合情理，所以当一边滚动到底时我们让另一边也到底：

```js
const onEditorScroll = () => {
  computedPosition();
  let editorScrollInfo = editor.getScrollInfo();
  let scrollElementIndex = null;
  // ...
  // 编辑区域已经滚动到底部，那么预览区域也直接滚动到底部
  if (
    editorScrollInfo.top >=
    editorScrollInfo.height - editorScrollInfo.clientHeight
  ) {
    previewArea.value.scrollTop =
      previewArea.value.scrollHeight - previewArea.value.clientHeight;
    return;
  }
  if (scrollElementIndex >= 0) {
      // ...
  }
}
```

效果如下：

![图片名称](http://aliyuncdn.lxqnsys.com/markdown/3PHaRryyYHwzjASNHwY4zf3xR.gif)

## 完善预览区滚动时编辑区同步滚动

最后让我们来完善一下在预览区域触发滚动，编辑区域跟随滚动的逻辑，监听一下预览区域的滚动事件：

```html
<div class="previewArea" ref="previewArea" v-html="htmlStr" @scroll="onPreviewScroll"></div>
```

```js
const onPreviewScroll = () => {
  computedPosition();
  let previewScrollTop = previewArea.value.scrollTop;
  // 找出当前滚动到元素索引
  let scrollElementIndex = null;
  for (let i = 0; i < previewElementList.length; i++) {
    if (previewScrollTop < previewElementList[i]) {
      scrollElementIndex = i - 1;
      break;
    }
  }
  // 已经滚动到底部
  if (
    previewScrollTop >=
    previewArea.value.scrollHeight - previewArea.value.clientHeight
  ) {
    let editorScrollInfo = editor.getScrollInfo();
    editor.scrollTo(0, editorScrollInfo.height - editorScrollInfo.clientHeight);
    return;
  }
  if (scrollElementIndex >= 0) {
    let ratio =
      (previewScrollTop - previewElementList[scrollElementIndex]) /
      (previewElementList[scrollElementIndex + 1] -
        previewElementList[scrollElementIndex]);
    let editorScrollTop =
      ratio *
        (editorElementList[scrollElementIndex + 1] -
          editorElementList[scrollElementIndex]) +
      editorElementList[scrollElementIndex];
    editor.scrollTo(0, editorScrollTop);
  }
};
```

逻辑基本是一样的，效果如下：

![图片名称](http://aliyuncdn.lxqnsys.com/markdown/RMAbz3t6FNp2dkMSmxferYPpW.gif)

问题又来了，我们鼠标已经停止滚动了，但是滚动却还在继续，原因也很简单，因为两边都绑定了滚动事件，所以互相触发跟随滚动，导致死循环，解决方式也很简单，我们设置一个变量来记录当前我们是在哪边触发滚动，另一边就不执行回调逻辑：

```html
<div
     class="editorArea"
     ref="editorArea"
     @mouseenter="currentScrollArea = 'editor'"
     ></div>
<div
     class="previewArea"
     ref="previewArea"
     v-html="htmlStr"
     @scroll="onPreviewScroll"
     @mouseenter="currentScrollArea = 'preview'"
     ></div>
```

```js
let currentScrollArea = ref("");

const onEditorScroll = () => {
  if (currentScrollArea.value !== "editor") {
    return;
  }
  // ...
}

// 预览区域的滚动事件
const onPreviewScroll = () => {
  if (currentScrollArea.value !== "preview") {
    return;
  }
  // ...
}
```

最后我们再对表格和代码块增加一下支持，以及增加上主题样式，当当当当，一个简单的`Markdown`编辑器就诞生了：

![图片名称](http://aliyuncdn.lxqnsys.com/markdown/PXsSXwrXPmR2ktRRWb53XMiPF.gif)

# 总结

本文通过使用`CodeMirror`和`unified`实现了一个能精确同步滚动的`Markdown`编辑器，思路来自于`bytemd`，具体实现上有点差异，可能还有其他实现方式，欢迎留言探讨。

在线`demo`：[https://wanglin2.github.io/markdown_editor_sync_scroll_demo/](https://wanglin2.github.io/markdown_editor_sync_scroll_demo/)

源码仓库：[https://github.com/wanglin2/markdown_editor_sync_scroll_demo](https://github.com/wanglin2/markdown_editor_sync_scroll_demo)