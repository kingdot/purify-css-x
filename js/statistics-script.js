(function () {
    var styleObj = {
        IDs: [],
        classes: [],
        title: '',
        host: '',
        allElements: null,
        rules: [],
        unUsedSelectors: [],
        usedSelectors: [],
        combinedCSS: '',
        lbrk: '\r\n',
        record: {used: [], unused: []},
        selectorCount: 0,

        findElements: function () {
            try {
                var items = this.allElements || [];
                var len = items.length;

                for (var i = 0; i < len; i++) {
                    if ((items[i].id !== undefined) && (items[i].id !== '')) { // 存在id
                        var s = '#' + items[i].id;
                        this.IDs.push(s);
                    }
                    var classNameTemp = items[i].className || '';
                    if (classNameTemp && typeof classNameTemp === 'string') {
                        //can be more than one class on an element
                        var clss = items[i].className.split(' ');
                        var k = clss.length;
                        for (var j = 0; j < k; j++) {
                            if (clss[j] !== "") {
                                var s = '.' + clss[j];
                                this.classes.push(s);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("findElements: " + err)
            }
        },
        checkImport: function (rule) { // 递归处理
            var childSheet = rule.styleSheet;
            this.extractRulesFromSheet(childSheet);
        },
        checkFontFace: function (rule) { // 直接拷贝
            this.selectorCount++;

            this.record.used.push('font-face');
            this.combinedCSS += (rule.cssText + this.lbrk);
        },
        checkKeyframes: function (rule) { // 直接拷贝
            this.selectorCount++;

            var fname = rule.name;
            this.record.used.push(fname + ': keyframes');
            this.combinedCSS += (rule.cssText + this.lbrk);
        },
        checkMedia: function (rule) {
            // 递归处理
            var prefix = '@media ' + rule.conditionText + ' {' + this.lbrk,
                cssRules = rule.cssRules;

            this.combinedCSS += prefix;

            this.processRuleList(cssRules);
            this.combinedCSS += ('}' + this.lbrk);
        },
        checkSelector: function (rule) {
            //this.reset();
            var num = this.IDs.length,
                selector = rule.selectorText,
                i = 0,
                lbrk = this.lbrk,
                found = false;

            this.selectorCount++;

            //we will always go into this
            if (found === false) {
                //if the selector does not contain an id or class selector then it must be
                //a plain selector by tag (eg HTML or Body or Div). We want to include
                //all of these selectors in our combined sheet
                if ((selector.indexOf('#') === -1) && (selector.indexOf('.') === -1)) { // 标签选择器，全部留下
                    found = true;
                    this.record.used.push(selector + ": tag selector");
                }
            }

            if (found === false) {
                //iterate through the list of IDs and
                //compare to see if the selector contains the ID
                for (i = 0; i < num; i++) {
                    if (selector.indexOf(this.IDs[i]) > -1) {
                        this.rules.push(selector);  //this.rules 干啥用的？？？ => 存储id
                        found = true;
                        this.record.used.push(selector + ": ID selector");
                        break;
                    }
                }
            }

            if (found === false) {
                num = this.classes.length;
                for (i = 0; i < num; i++) {
                    var yes = false;
                    var cls = this.classes[i];
                    if (selector.length >= cls.length) {
                        var endNum = (selector.length - cls.length);
                        var endOf = selector.substr(endNum);
                        if (endOf === cls) {
                            yes = true;
                        }
                    }
                    //check to see if the class is in the selector string
                    if (!yes) {

                        if ((selector.indexOf(cls + " ") > -1) ||
                            (selector.indexOf(cls + ",") > -1) ||
                            (selector.indexOf(cls + ":") > -1) ||
                            (selector === cls)) {
                            yes = true;
                        }
                    }

                    if (yes === true) {
                        this.rules.push(selector);
                        found = true;
                        this.record.used.push(selector + ": class selector");
                        break;
                    }
                }

            }

            //not a used selector
            if (found === false) {
                this.unUsedSelectors.push(selector); // 未使用的选择器
                this.record.unused.push(selector);
            } else {
                this.usedSelectors.push(selector);  // 使用到的选择器
                this.combinedCSS = this.combinedCSS + rule.cssText + lbrk;
                // this.record.used.push(selector + ": unused selector by default");
            }

        },
        processEveryRule: function (rule) {
            if (rule instanceof CSSStyleRule) {
                this.checkSelector(rule);
            } else if (rule instanceof CSSMediaRule) { // 处理 @media
                this.checkMedia(rule);
            } else if (rule instanceof CSSImportRule) {
                this.checkImport(rule);
            } else if (rule instanceof CSSFontFaceRule) {
                this.checkFontFace(rule);
            } else if (rule instanceof CSSKeyframesRule) {
                this.checkKeyframes(rule)
            } else {
                console.warn("this cssRule can't match", rule);
            }
        },
        processRuleList: function (cssRules) {
            var numberRules = cssRules.length;
            for (var n = 0; n < numberRules; n++) { // 循环 cssRules
                var rule = cssRules[n];

                // 从这里，分种类处理： 包括 cssStyleRule，mediaRule，importRule，fontFaceRule
                this.processEveryRule(rule);
            }
        },
        //extract all css rules for the passed stylesheet
        extractRulesFromSheet: function (sheet) {
            try {
                var cssRules = sheet.cssRules;
                this.processRuleList(cssRules);
            } catch (err) {
                console.error("extractRules: " + err);
            }

        },
        getStyleSheets: function () {
            try {
                var num = document.styleSheets.length;
                for (var i = 0; i < num; i++) { // 循环 sheet
                    var sheet = document.styleSheets[i];
                    var rules = sheet.rules || sheet.cssRules;
                    if (rules.length > 0) {   // 这里的cssRules 不能读取怎么办？？？????? 忽略？？ ==> 【只适用于开发阶段】
                        this.extractRulesFromSheet(sheet);
                    }
                }
            } catch (err) {
                console.error("getStyleSheets: " + err)
            }
        },
        load: function () {
            try {
                this.allElements = document.getElementsByTagName('*');
                this.title = document.title;
                this.host = location.host;
                this.findElements();

                var msg = {
                    title: this.title,
                    host: this.host,
                    classes: this.classes,
                    IDs: this.IDs,
                    to: 'bg',
                    from: 'html'
                };

                // 把加载完的样式信息发送出去  ->  background.js
                console.log(msg, 'this is statictis 正在发送给 bg！');

                var self = this;
                chrome.runtime.sendMessage(msg, function (data) { // 接收bg的回传，得到去重后总数据
                    self.IDs = data.IDs;
                    self.classes = data.classes;
                    self.getStyleSheets(); // 它使用的是谁？

                    // 发送给popup统计信息
                    var popData = {
                        from: 'finally',
                        to: 'pop&bg',
                        iconUrl: data.iconUrl,

                        htmlData: data.htmlData,
                        jsData: data.jsData,

                        allSelector: self.selectorCount,
                        usedSelectors: self.usedSelectors,
                        unusedSelectors: self.unUsedSelectors,

                        record: self.record
                    };
                    chrome.runtime.sendMessage(popData);
                    console.log(popData, 'this is statictis 正在发送给 pop！');
                });
            } catch (err) {
                console.error("error on load: " + err);
            }
        },
        downloadCSS: function () {
            try {
                function getFileBlob(cssFile) {
                    try {
                        return new Blob([cssFile], {type: 'text/plain'});
                    } catch (e) {
                        // The BlobBuilder API has been deprecated in favour of Blob, but older
                        // browsers don't know about the Blob constructor
                        // IE10 also supports BlobBuilder, but since the `Blob` constructor
                        //  also works, there's no need to add `MSBlobBuilder`.
                        var BlobBuilder = window.WebKitBlobBuilder || window.MozBlobBuilder || window.BlobBuilder;
                        var bb = new BlobBuilder();
                        bb.append(cssFile);
                        return bb.getBlob('text/plain');
                    }
                }

                var file = getFileBlob(this.combinedCSS);

                var a = document.createElement('a');
                a.href = window.URL.createObjectURL(file);
                a.download = 'combined.css';
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                delete a;
            } catch (err) {
                console.error("Error downloading CSS: " + err)
            }
        }
    };
    chrome.extension.onMessage.addListener(
        function (request) {
            if (request.from === "pop" && request.msg === 'download') {
                try {
                    styleObj.downloadCSS();
                } catch (err) {
                    console.error("Error1: " + err.message);
                }
            }
        });
    // 页面contentloaded之后，向background发送数据, 因为它只会在页面加载完之后执行一次，因此生成样式不能放在这里
    styleObj.load();
})();