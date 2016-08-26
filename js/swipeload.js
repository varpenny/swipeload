/**
 * @author penny
 * @description 最多用3个结点完成滑动切换，支持数据动态请求
 */
var SwipeLoad = (function(window, document) {
    var dummyStyle = document.createElement('div').style,
        vendor = (function() {
            var vendors = 't,webkitT,MozT,msT,OT'.split(','),
                t,
                i = 0,
                l = vendors.length;

            for (; i < l; i++) {
                t = vendors[i] + 'ransform';
                if (t in dummyStyle) {
                    return vendors[i].substr(0, vendors[i].length - 1);
                }
            }

            return false;
        })(),

        cssVendor = vendor ? '-' + vendor.toLowerCase() + '-' : '',
        prefixStyle = function(style) {
            if (vendor === '') return style;

            style = style.charAt(0).toUpperCase() + style.substr(1);
            return vendor + style;
        },

        // Style properties
        transform = prefixStyle('transform'),
        transitionDuration = prefixStyle('transitionDuration'),
        transitionProperty = prefixStyle('transitionProperty'),

        // Browser capabilities
        has3d = prefixStyle('perspective') in dummyStyle,
        hasTouch = 'ontouchstart' in window,
        hasTransform = !!vendor,
        hasTransitionEnd = prefixStyle('transition') in dummyStyle,

        // Helpers
        translateZ = has3d ? ' translateZ(0)' : '',

        // Events
        resizeEvent = 'resize',
        startEvent = hasTouch ? 'touchstart' : 'mousedown',
        moveEvent = hasTouch ? 'touchmove' : 'mousemove',
        endEvent = hasTouch ? 'touchend' : 'mouseup',
        cancelEvent = hasTouch ? 'touchcancel' : 'mouseup',

        // 快速滑动时，容易出现 transitionEnd 事件不执行，已用 setTimeout 模拟
        // transitionEndEvent = (function() {
        //     if (vendor === false) return false;

        //     var transitionEnd = {
        //         '': 'transitionend',
        //         'webkit': 'webkitTransitionEnd',
        //         'Moz': 'transitionend',
        //         'O': 'oTransitionEnd',
        //         'ms': 'MSTransitionEnd'
        //     };

        //     return transitionEnd[vendor];
        // })(),

        options = {
            startIndex: 0, // 起始数据索引
            speed: 200, // 滑动动画过渡时间
            dataArr: [], // 支持静态数据
            dataUrl: '', // 支持动态数据
            chartset: '', // 数据接口编码
            pageSize: 20, // 数据接口分页大小
            preloadEdge: 3, // 数据预加载时距离已加载数据边缘个数
            verticle: false, // 是否纵向滑动
            disableScroll: false, // 是否禁用默认滚动
            setNode: function(data) {},
            setData: function(data) {},
            callback: function() {},
            slideOn: function() {},
            slideEnd: function() {}
        },

        usrTouch = {
            isInitiate: false, // 手势起始标志
            isMove: false, // 手势滑动标志
            startX: null, // 起始触点 x 坐标
            startY: null, // 起始触点 y 坐标
            minSteps: 5, // 触发判断的最小值滑动距离
            stepsX: null, // x 轴滑动距离
            stepsY: null, // y 轴滑动距离
            isLockDirect: false, // 不锁定方向判断
            isFinished: true // 手势触发的动画的结束标志
        },

        state = {
            isInit: true, // 初始化数据标志
            curIndex: 0, // 针对数据数组的当前索引
            preloadArr: [] // 预加载标识数组（队列）
        },
        
        SwipeLoad = function(elm, config) {
            this.wrap = typeof elm == 'string' ? document.getElementById(elm) : elm; // wrap 层结点对象
            if (!this.wrap) return;

            for (i in config) options[i] = config[i];

            var baseCss = 'position:relative;overflow:visible;',
                transitionPropertyCss = cssVendor + 'transition-property:transform',
                transitionTimingFnCss = cssVendor + 'transition-timing-function:ease-out';
            this.wrap.style.cssText = baseCss + transitionPropertyCss + transitionTimingFnCss;
            this.wrap.parentElement.style.overflow = 'hidden';
            this.curIndex = 0; // 针对全部数据的当前索引
            this.curSlider = null; // 当前滑块对象
            this.dataArr = options.dataArr || []; // 数据数组
            this.dataTotal = this.dataArr.length; // 数据总数
            this.dataNewArr = []; // 新增数据数组
            this.direction = null; // 滑动方向
            this.unit = null; // 单个滑动距离
            this.resize(); // 重置 unit 值
            this.__init();
        };

    SwipeLoad.prototype = {
        // 初始化
        __init: function() {
            this.__initData(parseInt(options.startIndex) || 0);

            // 绑定事件
            window.addEventListener(resizeEvent, this, false);
            this.wrap.addEventListener(startEvent, this, false);
            this.wrap.addEventListener(moveEvent, this, false);
            this.wrap.addEventListener(endEvent, this, false);
            // this.wrap.addEventListener(transitionEndEvent, this, false);
        },

        // 初始化数据
        __initData: function(startIndex) {
            state.isInit = true;
            this.curIndex = startIndex;
            this.direction = null;
            if (!options.dataUrl) {
                // 静态数据
                state.curIndex = this.curIndex;
                this.__selectData();
            } else {
                // 动态数据
                state.curIndex = this.curIndex % options.pageSize;
                this.__loadData(this.curIndex);
            }
        },

        /**
         * 根据 URL 参数名获取参数值
         * @param  {string} url   指定的 URL
         * @param  {string} name URL参数名
         * @return {string}      返回获取到的参数值
         */
        __getParam: function(url, name) {
            if (!name) return;

            var key = name.replace(/[\[]/, '\\\[').replace(/[\]]/, '\\\]');
            var regExp = new RegExp('[\\?&#]' + key + '=([^&#]*)');
            var results = regExp.exec(url);
            return null == results ? undefined : results[1];
        },

        /**
         * 执行加载（若在 url 中指定 callback，则请求响应后不删除对应的回调函数）
         * @param  {string}   url          资源url
         * @param  {function} fn           回调函数
         * @param  {string}   fnName 回调函数名
         * @param  {string}   charset      资源编码
         */
        __doLoad: function(url, fn, fnName, charset) {
            // 判断 url 本身是否已经带有 callback 参数
            // 优先考虑 url 中带有的 callback 参数值为 fnName
            var cbName = lib.getParam(url, 'callback');
            var fnName = cbName || fnName;
            var cb = cbName || !fnName ? '' : 'callback=' + fnName;

            // 确保添加的 callback 参数不受其他参数影响（避免 url 本身包含 '#' 锚点时接口无法正确识别 callback 参数）
            var pos = url.indexOf('?') + 1;
            if (cb) url = 0 == pos ? (url + '?' + cb) : (url.substring(pos, -1) + cb + '&' + url.substring(pos));

            if ('function' == typeof fn && fnName) window[fnName] = fn;

            var headElm = document.head;
            var scriptElm = document.createElement('script');
            if(charset) scriptElm.charset = charset;
            scriptElm.src = url;
            headElm.appendChild(scriptElm);

            scriptElm.onload = scriptElm.onreadystatechange = function() {
                var f = scriptElm.readyState;
                if (f && f != 'loaded' && f != 'complete') return;

                scriptElm.onload = scriptElm.onreadystatechange = null;
                headElm.removeChild(scriptElm);

                // 如果没有在 url 中指定 callback，则删除对应的回调函数，否则不删除
                if (!cbName && window[fnName]) delete window[fnName];
            };
        },

        /**
         * 加载数据
         * @param  {number} curIndex 数据索引
         * @param {boolean} goFlag 跳到第几张位置标志
         */
        __loadData: function(curIndex, goFlag) {
            if (!options.dataUrl) return;

            var pageSize = options.pageSize;
            var pageNo = Math.ceil((curIndex + 1) / pageSize); // 数据分页页码
            var curPageNo = Math.ceil((this.curIndex + 1) / pageSize); // 当前数据分页页码

            if (true === goFlag) {
                this.curIndex = curIndex;
                state.curIndex = this.curIndex % options.pageSize;

                if (pageNo === curPageNo) {
                    // 当前分页
                    if (this.__preloadData(true)) return;

                    this.__selectData();
                }
            }

            var url = options.dataUrl.replace('{pageSize}', pageSize).replace('{pageNo}', pageNo);
            var callbackName = 'showSwipeData' + pageNo;
            var charset = options.chartset;
            var _this = this;

            this.__doLoad(url, function(data) {
                // set dataNewArr, dataTotal etc.
                options.setData.call(_this, data);

                var preloadItem = state.preloadArr.pop();
                if (preloadItem && 0 < preloadItem.direction) {
                    // 预加载下一页数据
                    _this.dataArr = _this.dataArr.concat(_this.dataNewArr);
                    if (preloadItem.showFlag) _this.__selectData();
                } else if (preloadItem && 0 > preloadItem.direction) {
                    // 预加载上一页数据
                    _this.dataArr = _this.dataNewArr.concat(_this.dataArr);
                    state.curIndex += _this.dataNewArr.length;
                    if (preloadItem.showFlag) _this.__selectData();
                } else {
                    // 初始加载数据
                    _this.dataArr = _this.dataNewArr;
                    if (_this.__preloadData(true)) return;

                    _this.__selectData();
                }
            }, callbackName, charset);
        },

        /**
         * 预加载数据
         * @param  {boolean} showFlag 加载后是否直接显示数据
         * @return {boolean} 是否满足预加载条件
         */
        __preloadData: function(showFlag) {
            if (!options.dataUrl) return;

            // 预加载时当前滑块距离边缘的个数
            this.preloadEdge = options.preloadEdge;

            // 向后预加载数据
            var arrIndex = state.curIndex + this.preloadEdge;
            var dataIndex = this.curIndex + this.preloadEdge;
            if (this.dataArr.length <= arrIndex && this.dataTotal > dataIndex) {
                state.preloadArr.unshift({
                    direction: 1,
                    showFlag: showFlag
                });
                this.__loadData(dataIndex);
                return true;
            }

            // 向前预加载数据
            var arrIndex = state.curIndex - this.preloadEdge;
            var dataIndex = this.curIndex - this.preloadEdge;
            if (0 > arrIndex && 0 <= dataIndex) {
                state.preloadArr.unshift({
                    direction: -1,
                    showFlag: showFlag
                });
                this.__loadData(dataIndex);
                return true;
            }
            return false;
        },

        // 选择显示数据
        __selectData: function() {
            if (0 === this.direction) return;

            var curArrIndex = state.curIndex,
                nextIndex = curArrIndex + 1,
                prevIndex = curArrIndex - 1,
                dataArr = this.dataArr,
                showArr = [dataArr[prevIndex], dataArr[curArrIndex], dataArr[nextIndex]];
            this.__handleDom(showArr);

            if (true === state.isInit) {
                state.isInit = false;
                this.callback();
                this.slideEnd();
            }

            this.__pos(0);
            this.__preloadData();
        },

        // 处理 Dom
        __handleDom: function(showArr) {
            if (!showArr || !showArr.length) return;

            var singleData, newElm, rmElm;
            var wrapElm = this.wrap;
            var html = '';

            if (0 > this.direction || 0 < this.direction) {
                // 新增上一条／下一条数据结点
                singleData = showArr[1 + this.direction];
                singleData && (html = options.setNode(singleData, this.curIndex + this.direction));
                newElm = document.createElement('div');
                newElm.innerHTML = html;
                newElm = newElm.firstElementChild || null;
                if (0 > this.direction) {
                    newElm && wrapElm.insertBefore(newElm, wrapElm.firstElementChild);
                    rmElm = wrapElm.lastElementChild;
                } else {
                    newElm && wrapElm.appendChild(newElm);
                    rmElm = wrapElm.firstElementChild;
                }
                if (3 < wrapElm.children.length || !newElm && rmElm && 2 < wrapElm.children.length) {
                    wrapElm.removeChild(rmElm);
                }
            } else {
                // 生成全部结点
                for (var i = 0, len = 3; i < len; i++) {
                    var item = showArr[i];
                    if (!item) continue;

                    var tmpHtml = options.setNode(item, this.curIndex + i - 1);
                    html += tmpHtml;
                }
                this.wrap.innerHTML = html;
            }

            // 重新设定样式
            var curSliderIndex = 1;
            var children = this.wrap.children;
            if (!showArr[0]) curSliderIndex = 0;
            this.curSlider = children.length > curSliderIndex ? children[curSliderIndex] : null;

            for (var i = 0; i < children.length; i++) {
                var childElm = children[i];
                var str = !options.verticle ? 'top:0;left:' : 'left:0;top:';
                var set = (i - curSliderIndex) * 100 + '%';
                var dataIndex = this.curIndex + (i - curSliderIndex);
                childElm.setAttribute('data-index', dataIndex);
                childElm.style.cssText = 'width:100%;height:100%;position:absolute;' + str + set;
            }
        },

        // 滑动到指定位置
        __pos: function(position, durationFlag) {
            var str = !options.verticle ? position + 'px,0' : '0,' + position + 'px';
            this.wrap.style[transform] = 'translate(' + str + ')' + translateZ;
            this.wrap.style[transitionDuration] = durationFlag ? (options.speed + 'ms') : '0ms';
            var _this = this;
            if (durationFlag) {
                this.callback();
                usrTouch.isFinished = false; // 手势触发的动画开始
                setTimeout(function() {
                    _this.__transitionEnd();
                    usrTouch.isFinished = true; // 手势触发的动画结束
                }, options.speed);
            }
        },

        // 动画结束
        __transitionEnd: function() {
            this.__selectData();
            this.slideEnd();
        },

        // 手势开始
        __start: function(e) {
            // 手势已发起，或非单指操作，或手势触发的动画未结束，均不处理
            if (usrTouch.isInitiate || hasTouch && 1 != e.touches.length || false === usrTouch.isFinished) return;

            usrTouch.isInitiate = true; // 手势起始标志
            usrTouch.isMove = false; // 手势滑动标志
            var point = hasTouch ? e.touches[0] : e;
            usrTouch.startX = point.pageX; // 起始触点 x 坐标
            usrTouch.startY = point.pageY; // 起始触点 y 坐标
            usrTouch.minSteps = 5; // 触发判断的最小值滑动距离
            usrTouch.stepsX = 0; // x 轴滑动距离
            usrTouch.stepsY = 0; // y 轴滑动距离
            usrTouch.isLockDirect = false; // 不锁定判断
        },

        // 手势滑动
        __move: function(e) {
            if (false === usrTouch.isFinished) {
                e.preventDefault(); // 手势触发的动画未结束，禁止默认时间
                return;
            }

            // 手势未发起，不做处理
            if (!usrTouch.isInitiate) return;

            // 手势开始移动
            usrTouch.isMove = true;
            var point = hasTouch ? e.touches[0] : e,
                deltaX = point.pageX - usrTouch.startX,
                deltaY = point.pageY - usrTouch.startY;

            usrTouch.stepsX += Math.abs(deltaX);
            usrTouch.stepsY += Math.abs(deltaY);

            var isLtMin = usrTouch.stepsX < usrTouch.minSteps && usrTouch.stepsY < usrTouch.minSteps;
            var isVerticle = usrTouch.stepsY > usrTouch.stepsX;
            var isOtherDirect = isVerticle && !options.verticle;

            if (!usrTouch.isLockDirect && (isLtMin || !options.disableScroll && isOtherDirect)) {
                // 滑动距离小于触发判断的最小值，或非指定方向滑动，控制交给浏览器
                usrTouch.isInitiate = false;
                return;
            }

            e.preventDefault();
            usrTouch.isLockDirect = true; // 锁定判断
            this.__pos(!options.verticle ? deltaX : deltaY);
            this.slideOn();
        },

        // 手势结束
        __end: function(e) {
            // 手势未发起，或手势未移动，不做处理
            if (!usrTouch.isInitiate || !usrTouch.isMove) return;

            usrTouch.isInitiate = false;
            usrTouch.isMove = false;
            var point = hasTouch ? e.changedTouches[0] : e;
            var deltaMain = !options.verticle ? point.pageX - usrTouch.startX : point.pageY - usrTouch.startY;
            if (0 > deltaMain && Math.abs(deltaMain) > usrTouch.minSteps) {
                this.next();
            } else if (0 < deltaMain && Math.abs(deltaMain) > usrTouch.minSteps) {
                this.prev();
            } else {
                this.__restore();
            }
        },

        // 不滑动，恢复原位
        __restore: function() {
            this.direction = 0;
            this.__pos(0, true);
        },

        // 滑动到上一张
        prev: function() {
            this.direction = -1;
            if (0 == state.curIndex) {
                // 已到达当前数据数组的第一张
                this.__pos(0, true);
                if (0 == this.curIndex) {
                    // 已到达全部数据的第一张
                    this.pastStart();
                }
            } else {
                this.curIndex -= 1;
                state.curIndex -= 1;
                this.__pos(this.unit, true);
            }
        },

        // 滑动到下一张
        next: function() {
            this.direction = 1;
            if (this.dataArr.length - 1 == state.curIndex) {
                // 已到达当前数据数组的最后一张
                this.__pos(0, true);
                if (this.dataTotal - 1 == this.curIndex) {
                    // 已到达全部数据的最后一张
                    this.pastEnd();
                }
            } else {
                this.curIndex += 1;
                state.curIndex += 1;
                this.__pos(-this.unit, true);
            }

        },

        // 获取当前数据信息
        getCurData: function() {
            var curArrIndex = state.curIndex;
            return 0 <= curArrIndex && this.dataArr.length > curArrIndex ? this.dataArr[curArrIndex] : null;
        },

        // 跳到指定数据索引处
        goTo: function(curIndex) {
            if (0 > curIndex || this.dataTotal <= curIndex) return;

            this.__initData(curIndex);
        },

        // 滑动超过第一张时执行
        pastStart: function() {
            'function' == typeof options.pastStart && options.pastStart.call(this);
        },

        // 滑动超过第最后一张时执行
        pastEnd: function() {
            'function' == typeof options.pastEnd && options.pastEnd.call(this);
        },

        // 数据初始化后或滑动触发后执行
        callback: function() {
            'function' == typeof options.callback && options.callback.call(this);
        },

        // 滑动进行中执行
        slideOn: function() {
            'function' == typeof options.slideOn && options.slideOn.call(this);
        },

        // 滑动结束时执行
        slideEnd: function() {
            'function' == typeof options.slideEnd && options.slideEnd.call(this);
        },

        // 容器尺寸变化时执行
        resize: function() {
            var parent = this.wrap.parentElement;
            this.unit = !options.verticle ? parent.clientWidth : parent.clientHeight;
        },

        /**
         * 处理事件
         * @param  {object} e 事件对象
         */
        handleEvent: function(e) {
            switch (e.type) {
                case startEvent:
                    this.__start(e);
                    break;
                case moveEvent:
                    this.__move(e);
                    break;
                case cancelEvent:
                case endEvent:
                    this.__end(e);
                    break;
                case resizeEvent:
                    this.resize();
                    break;
                // case transitionEndEvent:
                // case 'otransitionend':
                //     this.__transitionEnd();
                //     break;
            }
        },

        // 销毁
        destroy: function() {
            // 解除绑定事件
            window.removeEventListener(resizeEvent, this, false);
            this.wrap.removeEventListener(startEvent, this, false);
            this.wrap.removeEventListener(moveEvent, this, false);
            this.wrap.removeEventListener(endEvent, this, false);
            // this.wrap.removeEventListener(transitionEndEvent, this, false);
        }
    };

    return SwipeLoad;
})(window, document);