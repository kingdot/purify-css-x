(function () {
    var option = {
        tooltip: {
            trigger: 'item',
            formatter: "{a} <br/>{b} : {c} ({d}%)"
        },
        series: [
            {
                name: '样式使用率',
                type: 'pie',
                radius: '70%',
                center: ['50%', '60%'],
                data: [
                    {value: 335, name: '直接访问'},
                    {value: 310, name: '邮件营销'},
                ],
                itemStyle: {
                    emphasis: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }
        ],
        color: ['#41bd1a', '#616166']
    };

    var colorMap = {
        "class": '#1416FF',
        "ID": '#3753FF',
        "tag": '#6792FB',
        "fonts": '#8FBD9C',
        "other": '#CB3B39',
        "keyframs": '#A6C4FB',
        "attributes": '#F4CE91',
        "unused": '#76767B'
    };
    window.onload = function () {
        // 从 bg 拉取最终数据
        chrome.runtime.sendMessage({from: 'show'}, function (response) {
            console.log(response);
            process(response);
        });

        // 饼图
        var id = document.getElementById('pie');
        var pie = echarts.init(id);

        // 选项卡的切换
        var tabs = document.querySelector('.tab-switcher'),
            contents = document.querySelectorAll('.tab-content');

        tabs.addEventListener('click', function (e) {
            var children = this.children,
                len = children.length,
                target = e && e.target;
            for (var i = 0; i < len; i++) {
                if (children[i] === target) {
                    target.classList.add('active');
                    contents[i].classList.add('active');
                } else {
                    children[i].classList.remove('active');
                    contents[i].classList.remove('active');
                }
            }
        });

        // 下拉框的处理
        var msgBars = document.querySelectorAll('.summary-msg');
        for (var i = 0; i < msgBars.length; i++) {
            msgBars[i].addEventListener('click', function (e) {
                this.classList.toggle('active');
                this.nextElementSibling.classList.toggle('active');
            })
        }

        var inUseRules = document.getElementById('in-use-rules'),
            unUseRules = document.getElementById('un-use-rules'),
            htmlRules = document.getElementById('html-rules'),
            jsRules = document.getElementById('js-rules'),
            htmlClassCount = document.getElementById('html-class-count'),
            htmlIdCount = document.getElementById('html-id-count'),
            jsClassCount = document.getElementById('js-class-count'),
            jsIdCount = document.getElementById('js-id-count');

        // 处理数据
        function process(data) {
            var used = data.record.used, unused = data.record.unused, usedLen = Object.keys(used).length,
                unusedLen = Object.keys(unused).length;
            // 处理 rate-pie
            processPie(usedLen, unusedLen);
            // 处理 used
            processUsed(used);
            // 处理 unused
            processUnused(unused);
            // 处理 html
            processHtml(data.htmlData);
            // 处理 js
            processJs(data.jsData);
        }

        function processPie(usedLen, unusedLen) {
            option.series[0].data = [{name: '使用的样式', value: usedLen}, {name: '未使用的样式', value: unusedLen}];
            pie.setOption(option);
        }

        function processUsed(used) {
            var eles = processUsedOrUnused(used);
            inUseRules.appendChild(eles);
        }

        function processUnused(unused) {
            var eles = processUsedOrUnused(unused);
            unUseRules.appendChild(eles);
        }

        function processUsedOrUnused(data) {
            var keys = Object.keys(data), kLen = keys.length, docFrag = document.createDocumentFragment();
            for (var i = 0; i < kLen; i++) {
                var li = document.createElement("li"), key = keys[i], val = data[key];
                li.style.backgroundColor = colorMap[val];
                li.innerText = key;
                docFrag.appendChild(li);
            }
            return docFrag;
        }

        function processHtml(data) {
            // 处理列表
            var IDs = data.IDs, classes = data.classes, eles = processCommon(IDs, classes);
            htmlRules.appendChild(eles);
            // 处理数字
            htmlClassCount.innerText = String(classes.length);
            htmlIdCount.innerText = String(IDs.length);
        }

        function processJs(data) {
            // 处理列表
            var IDs = data.IDs, classes = data.classes, eles = processCommon(IDs, classes);
            jsRules.appendChild(eles);
            // 处理数字
            jsClassCount.innerText = String(classes.length);
            jsIdCount.innerText = String(IDs.length);
        }

        function processCommon(IDs, classes) {
            var docFrag = document.createDocumentFragment();

            for (var i = 0; i < IDs.length; i++) {
                var li = document.createElement("li");
                li.innerText = IDs[i];
                docFrag.appendChild(li);
            }
            for (i = 0; i < classes.length; i++) {
                li = document.createElement("li");
                li.innerText = classes[i];
                docFrag.appendChild(li);
            }

            return docFrag;
        }
    };
})();