// main
;(function(lib) {
    /**
     * Cookie 相关操作封装
     */
    lib.cookie = {
        get: function(check_name) {
            check_name = encodeURIComponent(check_name);
            var a_all_cookies = document.cookie.split(';');
            var a_temp_cookie = '';
            var cookie_name = '';
            var cookie_value = '';
            var b_cookie_found = false;
            var i = '';
            var len = a_all_cookies.length;
            for (i = 0; i < len; i++) {
                a_temp_cookie = a_all_cookies[i].split('=');
                cookie_name = a_temp_cookie[0].replace(/^\s+|\s+$/g, '');
                if (cookie_name == check_name) {
                    b_cookie_found = true;
                    if (a_temp_cookie.length > 1) {
                        cookie_value = unescape(a_temp_cookie[1].replace(/^\s+|\s+$/g, ''));
                    }
                    return cookie_value;
                    break;
                }
                a_temp_cookie = null;
                cookie_name = '';
            }
            if (!b_cookie_found) return null;
        },
        set: function(name, value, expires, path, domain, secure) {
            var today = new Date();
            today.setTime(today.getTime());
            if (expires) {
                expires = expires * 1000 * 60 * 60 * 24;
            }
            var expires_date = new Date(today.getTime() + (expires));
            document.cookie = encodeURIComponent(name) + '=' + encodeURIComponent(value) +
                ((expires) ? ';expires=' + expires_date.toGMTString() : '') +
                ((path) ? ';path=' + path : '') +
                ((domain) ? ';domain=' + domain : '') +
                ((secure) ? ';secure' : '');
        }
    };

    /**
     * 获取元素
     * @param  {string} id 元素 id
     * @return {object}    获取到的元素对象
     */
    lib.el = function(id) {
        return 'object' == typeof id ? id : document.getElementById(id);
    };

    /**
     * 是否存在 class
     * @param  {object}  elm 元素
     * @param  {string}  cls 要判断的 class
     * @return {boolean}     是否存在
     */
    lib.hasCls = function(elm, cls) {
        return elm.classList && elm.classList.contains(cls) || !!elm.className.match(new RegExp('(\\s|^)' + cls + '(\\s|$)'));
    };

    /**
     * 添加 class
     * @param {object} elm 元素
     * @param {string} cls 要添加的 class
     */
    lib.addCls = function(elm, cls) {
        elm.classList ? elm.classList.add(cls) : !this.hasCls(elm, cls) && (elm.className += (!elm.className ? '' : ' ') + cls);
    };

    /**
     * 删除 class
     * @param  {object} elm 元素
     * @param  {string} cls 要删除的 class
     */
    lib.rmCls = function(elm, cls) {
        elm.classList ? elm.classList.remove(cls) : this.hasCls(elm, cls) && (elm.className = elm.className.replace(new RegExp('(\\s|^)' + cls + '(\\s|$)'), ''));
    };

    /**
     * 根据URL参数名获取参数值
     * @param  {string} url   指定的 URL
     * @param  {string} name URL参数名
     * @return {string || null}      返回获取到的参数值或者 null
     */
    lib.getParam = function(url, name) {
        if (!name) return null;

        name = name.replace(/[\[]/, '\\\[').replace(/[\]]/, '\\\]');
        var regExp = new RegExp('[\\?&#]' + name + '=([^&#]*)');
        var resultArr = regExp.exec(url);
        return (null == resultArr ? null : resultArr[1]);
    };

    /**
     * 给 URL  添加参数
     * @param  {string} url   指定的 URL
     * @param  {string} param 参数名和值
     * @return {string}       添加参数后的 URL
     */
    lib.addParam = function(url, param) {
        if (!param) return url;

        var qStr = (-1 == url.indexOf('?') ? '?' : '&') + param;
        if (-1 != url.indexOf('#')) {
            var i = url.indexOf('#');
            return url.substring(i, -1) + qStr + url.substring(i);
        }
        return url + qStr;
    };
})(window.lib = window.lib || {});

;(function() {
    // 单图模式
    function PicMode(options) {
        this.isPicMode = lib.getParam(window.location.href, 'picMode') ? true : false;
        this.isLandscape = false;
        this.onPicMode = options && options.onPicMode;
        this.onNmMode = options && options.onNmMode;
        this.toast = options.toast;
        this.init();
    }

    // 单图模式原型
    PicMode.prototype = {
        // 初始化
        init: function() {
            if (undefined !== this.toast) this.showToast(this.toast.cookie, this.toast.elmId);

            var self = this;
            var resizeChgMode = function(initFlag) {
                var bodyElm = document.body;
                if (window.orientation === 90 || window.orientation === -90){
                    // 横屏
                    self.isLandscape = true;
                    lib.addCls(bodyElm, 'm-lsc-mode');
                } else {
                    if (window.orientation === 180 || window.orientation === 0) { 
                        // 竖屏
                        self.isLandscape = false;
                        lib.rmCls(bodyElm, 'm-lsc-mode');
                    }
                }
                self.setPicMode(initFlag || self.isLandscape);
            };

            resizeChgMode(self.isPicMode);

            if (false == 'onorientationchange' in window) return;

            var addEvtFlag = false; // 是否成功绑定 orientationchange 事件
            var resizeSto = null;
            var resizeFn = function() {
                // 确保部分浏览器 resize 时获取到正确的最新的 window.orientation 值
                resizeSto && clearTimeout(resizeSto);
                resizeSto = setTimeout(function() {
                    resizeChgMode();
                }, 0);
            };

            // 绑定横竖屏切换模式（部分浏览器不支持 orientationchange 事件但却可以正确获取 window.orientation 值）
            window.addEventListener('resize', resizeFn);
            window.addEventListener('orientationchange', function() {
                if (false === addEvtFlag) {
                    resizeSto && clearTimeout(resizeSto);
                    addEvtFlag = true;
                    window.removeEventListener('resize', resizeFn);
                }
                resizeChgMode();
            });
        },

        // 模式 toast 提示
        showToast: function(cookieName, elmId) {
            var COOKIE_NAME = cookieName;
            var toastElm = lib.el(elmId);
            if (lib.cookie.get(COOKIE_NAME)) return;

            lib.cookie.set(COOKIE_NAME, 1, 30);
            if (!toastElm) return;

            toastElm.style.display = 'block';
            setTimeout(function() {
                toastElm.style.opacity = '0';
                setTimeout(function() {
                    toastElm.style.display = 'none';
                }, 1000);
            }, 3000);
        },

        /**
         * 设置单图模式
         * @param {boolean} flag true: 单图模式；false: 常规模式
         */
        setPicMode: function(flag) {
            var bodyElm = document.body;
            var htmlElm = document.documentElement;
            if (flag) {
                lib.rmCls(bodyElm, 'm-nm-mode');
                lib.addCls(bodyElm, 'm-pic-mode');
                htmlElm.clientHeight < htmlElm.clientWidth && lib.addCls(bodyElm, 'm-lsc-mode');
                this.isPicMode = true;
                if ('function' == typeof this.onPicMode) this.onPicMode();
            } else {
                lib.rmCls(bodyElm, 'm-lsc-mode');
                lib.rmCls(bodyElm, 'm-pic-mode');
                lib.addCls(bodyElm, 'm-nm-mode');
                this.isPicMode = false;
                if ('function' == typeof this.onNmMode) this.onNmMode();
            }
        },

        /**
         * 单击切换模式
         */
        tapChgMode: function() {
            if (this.isPicMode == false) {
                // 切换至单图模式
                this.setPicMode(true);
            } else {
                // 非横屏模式点击切换至常规模式
                if (this.isLandscape) return;

                this.setPicMode(false);
            }
        }
    };

    /**
     * 创建滑块
     * @param {number} startIndex 起始滑块下标
     * @return {object}     Swipe 对象
     */
    function createSwipe(startIndex) {
        var prevUrl, nextUrl, intfUrl, dataArr;
        if (PAGE_CONFIG) {
            prevUrl = PAGE_CONFIG.prevUrl;
            nextUrl = PAGE_CONFIG.nextUrl;
            intfUrl = PAGE_CONFIG.intfUrl;
            dataArr = PAGE_CONFIG.dataArr || [];
        }
        var tipsFirstElm = !prevUrl && lib.el('JtipsFirst');
        var tipsLastElm = !nextUrl && lib.el('JtipsLast');
        var curNumElm = lib.el('JcurNum'); // 显示当前图片页码
        var totalNumElm = lib.el('JtotalNum'); // 显示图片总页数
        var totalNum = null; // 数据总数
        var sto = null; // 跳转延时，为了让跳转之前图片被滑动之后恢复原位，以免浏览器恢复缓存页面时图片处于滑动过的状态
        var tmplObj = lib.el('Jtemplate');
        var PIC_TMPL = tmplObj && tmplObj.innerHTML || ''; // HTML 模板

        var swipeLoadObj = new SwipeLoad('JsliderList', {
            startIndex: 0 > startIndex ? dataArr.length - 1 : startIndex, // 起始数据索引
            speed: 200, // 滑动动画过渡时间（单位毫秒），默认为200
            dataArr: dataArr, // 支持静态数据，但优先后面的动态数据接口
            dataUrl: intfUrl, // 动态数据接口
            chartset: 'utf-8', // 数据接口编码
            pageSize: 50, // 数据接口分页大小，默认为20
            preloadEdge: 3, // 数据预加载时距离已加载数据边缘个数，默认为3
            verticle: false, // 是否纵向滑动，默认为false
            disableScroll: false, // 是否禁用默认滚动，默认为false
            // 设置数据结点
            setNode: function(data, index) {
                return PIC_TMPL.replace('{{picUrl}}', data.pic).replace('{{picDes}}', data.des);
            },
            // 设置数据变量
            setData: function(data) {
                this.dataNewArr = data.picArr; // 显示的数据数组
                this.dataTotal = data.total; // 数据总数
                this.dataPageNo = data.pageNo; // 数据分页页码
            },
            // 数据初始化后或滑动触发后执行
            callback: function() {
                // 初始记录并显示数据总数
                if (null === totalNum) {
                    totalNumElm && (totalNumElm.innerHTML = this.dataTotal);
                    this.dataTotal && (this.wrap.onclick = function() {
                        picModeObj.tapChgMode();
                    });
                }

                // 显示当前第几张
                var curNum = this.curIndex + 1;
                curNumElm && (curNumElm.innerHTML = curNum);

                // 第一张／最后一张图片提示
                tipsFirstElm && (tipsFirstElm.style.display = 1 == curNum ? 'block' : 'none');
                tipsLastElm && (tipsLastElm.style.display = this.dataTotal == curNum ? 'block' : 'none');
            },
            // 滑动进行中执行
            slideOn: function() {},
            // 滑动结束时执行
            slideEnd: function() {},
            // 滑动超过第一张时执行
            pastStart: function() {
                sto && clearTimeout(sto);
                sto = setTimeout(function() {
                    prevUrl && (location.href = picModeObj.isPicMode ? lib.addParam(prevUrl, 'picMode=1') : prevUrl);
                }, 10);
            },
            // 滑动超过第最后一张时执行
            pastEnd: function() {
                sto && clearTimeout(sto);
                sto = setTimeout(function() {
                    nextUrl && (location.href = picModeObj.isPicMode ? lib.addParam(nextUrl, 'picMode=1') : nextUrl);
                }, 10);
            }
        });

        return swipeLoadObj;
    }

    // 初始化
    function init() {
        picModeObj = new PicMode({
            onPicMode: function() {
                sliderObj && sliderObj.resize();
            },
            onNmMode: function() {
                sliderObj && sliderObj.resize();
            },
            toast: {cookie: 'toast', elmId: 'JtoastTips'} // 模式 Toast 提示
        });
        var paramStart = parseInt(lib.getParam(window.location.href, 'start')) || 1;
        sliderObj = createSwipe(paramStart - 1);
    }

    var sliderObj = null;
    var picModeObj = null;
    init();
})();