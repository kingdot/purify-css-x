﻿(function () {
    var styleObj = {
        IDs: [],
        classes: [],
        title: '',
        host: '',
        allElements: null,
        rules: [],
        combinedCSS: '',
        lbrk: '\r\n',
        record: {used: {}, unused: {}},
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
        checkOther: function (rule) { // 任何无法解析的都原样复制
            this.selectorCount++;

            var name = rule.cssText.slice(0, 10) + '...';
            this.record.used[name] = 'other';

            this.combinedCSS += (rule.cssText + this.lbrk);
            return rule.cssText;
        },
        checkFontFace: function (rule) { // 直接拷贝
            this.selectorCount++;

            var name = rule.cssText.replace(/"/g, '').match(/font-family:\s*([\w-\s]+);/)[1];
            if (!name){
                console.warn('fontface name invalid:', rule.cssText);
                name = rule.cssText.slice(26, 36);
            }
            this.record.used[name] = 'fonts';

            this.combinedCSS += (rule.cssText + this.lbrk);
            return rule.cssText;
        },
        checkKeyframes: function (rule) { // 直接拷贝
            this.selectorCount++;

            var fname = rule.name;
            this.record.used[fname] = 'keyframes';

            this.combinedCSS += (rule.cssText + this.lbrk);
            return rule.cssText;
        },
        checkMedia: function (rule) {
            // 递归处理，同时去除空内容的media声明
            var prefix = '@media ' + rule.conditionText + ' {' + this.lbrk,
                len = prefix.length,
                cssRules = rule.cssRules,
                result = '';

            this.combinedCSS += prefix;
            result = this.processRuleList(cssRules);

            if (!result) {
                this.combinedCSS = this.combinedCSS.slice(0, -len);
            } else {
                this.combinedCSS += ('}' + this.lbrk);
            }
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
                if ((selector.indexOf('#') === -1) && (selector.indexOf('.') === -1)) { // 标签选择器 or 属性选择器，全部留下

                    if (/\[.+\]/.test(selector)) {
                        this.record.used[selector] = "attributes";
                    } else {
                        this.record.used[selector] = "tag";
                    }
                    found = true;
                }
                // 有些属性选择器为 class和id 的混合： .test1[data-1]  #test2[data-2]
                if ((selector.indexOf('[') !== -1) && (selector.indexOf(']') !== -1)) {

                    if (/\[.+\]/.test(selector)) {
                        this.record.used[selector] = "attributes";
                    } else {
                        this.record.used[selector] = "tag";
                    }
                    found = true;
                }
            }

            if (found === false) {
                //iterate through the list of IDs and
                //compare to see if the selector contains the ID
                for (i = 0; i < num; i++) {
                    if (selector.indexOf(this.IDs[i]) > -1) {
                        this.rules.push(selector);  //this.rules 干啥用的？？？ => 存储 id 和 class
                        found = true;
                        this.record.used[selector] = "ID";
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
                        var endOf = selector.substr(endNum); // 从后往前找
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
                        this.record.used[selector] = "class";
                        break;
                    }
                }

            }

            //not a used selector
            if (found === false) {
                this.record.unused[selector] = "unused";
                return '';
            } else {
                this.combinedCSS = this.combinedCSS + rule.cssText + lbrk;
                return rule.cssText;
                // this.record.used.push(selector + ": unused selector by default");
            }

        },
        processEveryRule: function (rule) {
            if (rule instanceof CSSStyleRule) {
                return this.checkSelector(rule);
            } else if (rule instanceof CSSMediaRule) { // 处理 @media
                return this.checkMedia(rule);
            } else if (rule instanceof CSSImportRule) {
                return this.checkImport(rule);
            } else if (rule instanceof CSSFontFaceRule) {
                return this.checkFontFace(rule);
            } else if (rule instanceof CSSKeyframesRule) {
                return this.checkKeyframes(rule)
            } else {
                console.warn("this cssRule can't match", rule);
                this.checkOther(rule);
            }
        },
        processRuleList: function (cssRules) {
            var numberRules = cssRules.length,
                temp = '';
            for (var n = 0; n < numberRules; n++) { // 循环 cssRules
                var rule = cssRules[n];
                // 从这里，分种类处理： 包括 cssStyleRule，mediaRule，importRule，fontFaceRule
                temp += this.processEveryRule(rule);
            }
            return temp;
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
                console.log('sheetlength:', num)
                for (var i = 0; i < num; i++) { // 循环 sheet
                    var sheet = document.styleSheets[i];
                    if (sheet.href) { // 来自远程的css,全部跳过
                        // var hrefHost = sheet.href.split('/')[2];
                        // if (this.host !== hrefHost) continue; // 跨域不统计
                        continue;
                    }

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
                this.findElements(); // 统计当前HTML的class和id

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
                chrome.runtime.sendMessage(msg, function (data) { // 接收bg的回传，得到去重后【依赖总数据】
                    self.IDs = data.IDs;
                    self.classes = data.classes;
                    self.getStyleSheets(); // 它使用的是从document解析的总样式数据，开始精简

                    // 发送给popup统计信息
                    var popData = {
                        from: 'finally',
                        to: 'pop&bg',  // popup展示所用数据，同时bg存储一份给show用
                        iconUrl: data.iconUrl,

                        htmlData: data.htmlData,
                        jsData: data.jsData,

                        allSelector: self.selectorCount,
                        record: self.record
                    };
                    chrome.runtime.sendMessage(popData);
                    console.log(popData, 'this is statictis 正在发送给 pop&bg！');
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
                    console.log('ready download...')
                    styleObj.downloadCSS();
                } catch (err) {
                    console.error("Error1: " + err.message);
                }
            }
        });
    // popup => 触发，重新搜集页面html依赖，向background发送数据后在回调函数里执行精简操作，得到最终数据。
    styleObj.load();
})();