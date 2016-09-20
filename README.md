## 前言
目前，比较常见的一种滑动切换的实现方案是，为所有数据滑块创建对应的 DOM 节点，当手势滑动时通过设定样式改变节点的位移（CSS3 transform 的 translate）。这种方案的实现和使用都比较简单，但是数据量和性能却成反比关系，而且在 Android 机上尤为明显。因此，这个插件就是为了解决这个问题而来的，同时还封装了接口请求的操作（需要接口作 callback 参数支持）。
　　
## 使用
(1) HTML
``` html
<div class="m-swipe">
    <div class="m-swipe-wrap" id="JsliderWrap"></div>
</div>
<script type="text/template" id="Jtmpl">
<div>
    <img src="{{picUrl}}" alt="" />
</div>
</script>
```
(2) CSS

任何能给 wrap 层设定高度的样式皆可
``` css
.m-swipe-wrap {
  padding-top: 75%;
  height: 0;
}
```
(3) JavaScript
``` javascript
var swipeLoadObj = new SwipeLoad('JsliderList', {
    dataArr: [], // 支持静态数据，但优先动态数据接口
    dataUrl: 'xxx?pageNo={{pageNo}}&pageSize={{pageSize}}', // 动态数据接口，{{xxx}} 形式用于插件请求接口时替换实际分页数据
    // 设置数据结点
    setNode: function(data, index) {
        var tmplElm = document.getElementById('Jtmpl');
        var PIC_TMPL = tmplElm && tmplElm.innerHTML || ''; // 滑块节点的 HTML 模板
        return PIC_TMPL.replace('{{picUrl}}', data.pic);
    },
    // 设置数据变量
    setData: function(data) {
        this.dataNewArr = data.picArr; // 显示的数据数组
        this.dataTotal = data.total; // 数据总数
        this.dataPageNo = data.pageNo; // 数据分页页码
    }
});
```
其中，第二个参数为配置项，所有配置项描述如下：
- **startIndex**　Integer*（默认：0）*　起始数据索引

- **speed**　Integer*（默认：200）*　滑动动画过渡时间，单位毫秒

- **dataArr**　Array　静态数据数组

- **dataUrl**　String　动态数据接口

- **chartset**　String　数据接口编码

- **pageSize**　Integer*（默认：20）*　数据接口分页大小

- **preloadEdge**　Integer*（默认：3）*　数据预加载时距离已加载数据边缘个数

- **verticle**　Boolean*（默认：false）*　是否纵向滑动

- **disableScroll**　Boolean*（默认：false）*　是否禁用默认滚动

- **setNode**　Function　设置数据节点，每次创建数据节点时执行

- **setData**　Function　设置数据变量，每次请求接口数据返回时执行

- **callback**　Function　数据初始化后或滑动触发后执行

- **slideOn**　Function　滑动进行中执行

- **slideEnd**　Function　滑动结束时执行

- **pastStart**　Function　滑动超过第一张时执行

- **pastEnd**　Function　滑动超过第最后一张时执行

## 主要属性及方法
`wrap`　wrap 层对象

`curSlider`　当前滑块对象

`curIndex`　当前数据索引

`dataArr`　已存在的数据数组

`dataTotal`　数据总数

`dataNewArr`　新增数据数组（动态请求的数据）

`dataPageNo`　数据分页页码（动态请求的数据）

`prev()`　滑动到上一张

`next()`　滑动到下一张

`goTo(goIndex)`　跳到指定数据索引处

`getCurData()`　获取当前数据信息

`resize()`　容器尺寸变化时执行

`destroy()`　销毁