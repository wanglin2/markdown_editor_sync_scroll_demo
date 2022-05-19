<template>
  <div class="container">
    <div class="editorArea" ref="editorArea"></div>
    <div class="previewArea" ref="previewArea" v-html="htmlStr"></div>
  </div>
</template>

<script setup>
import CodeMirror from "codemirror";
import "codemirror/mode/markdown/markdown.js";
import "codemirror/lib/codemirror.css";
import { nextTick, onMounted, ref } from "vue";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";

let editor = null;
const editorArea = ref(null);
const previewArea = ref(null);
const htmlStr = ref("");
let treeData = null;
// 获取语法树
const customPlugin = () => (tree) => {
  // console.log(tree);
  treeData = tree;
};
// 计算位置信息
let editorElementList = [];
let previewElementList = [];
const computedPosition = () => {
  // console.log(treeData, treeData.children.length);
  // console.log(
  //   previewArea.value.childNodes,
  //   previewArea.value.childNodes.length
  // );
  console.log("---------------");
  let previewChildNodes = previewArea.value.childNodes;
  // 清空数组
  editorElementList = [];
  previewElementList = [];
  treeData.children.forEach((child, index) => {
    // 如果节点类型不为element则跳过
    if (child.type !== "element") {
      return;
    }
    let offsetTop = editor.heightAtLine(child.position.start.line - 1, "local"); // 设为local返回的坐标是相对于编辑器本身的，其他还有两个可选项：window、page
    // console.log(
    //   child.children[0].value,
    //   offsetTop,
    //   previewChildNodes[index].offsetTop
    // );
    // 保存元素的位置信息
    editorElementList.push(offsetTop);
    previewElementList.push(previewChildNodes[index].offsetTop); // 预览区域的容器元素previewArea需要设置定位
  });
};
// 编辑区域的滚动事件
const onEditorScroll = () => {
  computedPosition();
  // 获取编辑器滚动信息
  let editorScrollInfo = editor.getScrollInfo();
  // 找出当前滚动到元素索引
  let scrollElementIndex = null;
  for (let i = 0; i < editorElementList.length; i++) {
    if (editorScrollInfo.top < editorElementList[i]) {
      // 当前元素的offsetTop大于滚动的距离，相当于当前滚动到了前一个元素上
      scrollElementIndex = i - 1;
      break;
    }
  }
  // 已经滚动到底部
  if (
    editorScrollInfo.top >=
    editorScrollInfo.height - editorScrollInfo.clientHeight
  ) {
    previewArea.value.scrollTop =
      previewArea.value.scrollHeight - previewArea.value.clientHeight;
    return;
  }
  if (scrollElementIndex >= 0) {
    // 设置预览区域的滚动距离为对应元素的offsetTop
    let ratio =
      (editorScrollInfo.top - editorElementList[scrollElementIndex]) /
      (editorElementList[scrollElementIndex + 1] -
        editorElementList[scrollElementIndex]);
    previewArea.value.scrollTop =
      ratio *
        (previewElementList[scrollElementIndex + 1] -
          previewElementList[scrollElementIndex]) +
      previewElementList[scrollElementIndex];
  }
};
const onChange = (instance) => {
  unified()
    .use(remarkParse) // 将markdown转换成语法树
    .use(remarkRehype) // 将markdown语法树转换成html语法树，转换之后就可以使用rehype相关的插件
    .use(customPlugin)
    .use(rehypeStringify) // 将html语法树转换成html字符串
    .process(instance.doc.getValue())
    .then(
      (file) => {
        htmlStr.value = String(file);
      },
      (error) => {
        throw error;
      }
    );
};
onMounted(() => {
  editor = CodeMirror(editorArea.value, {
    mode: "markdown",
    lineNumbers: true,
    lineWrapping: true,
  });
  editor.on("change", onChange);
  editor.on("scroll", onEditorScroll);
});
</script>

<style lang="less" scoped>
.container {
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: flex;

  .editorArea {
    width: 50%;
    height: 100%;
    border-right: 1px solid #e1e4e8;

    /deep/ .CodeMirror {
      height: 100%;
      font-size: 16px;
      font-family: SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;
      box-sizing: border-box;
      background-color: #f8f9fa;
    }
  }

  .previewArea {
    position: relative;
    width: 50%;
    height: 100%;
    padding: 20px;
    overflow: auto;
  }
}
</style>
