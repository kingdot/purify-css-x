(function () {
    var tokenMap = {
        classes: [],
        IDs: [],
        host: location.host,
        title: document.title
    };

    // 通知content-script
    var notify = debounce(function () {
        window.postMessage(tokenMap, '*');
    }, 1000);

    /**
     * 重写 classList
     */
    var testElement = document.createElement("_");
    if (
        ("classList" in testElement)
        || document.createElementNS
        && ("classList" in document.createElementNS("http://www.w3.org/2000/svg", "g"))) {

        var createMethod = function (method) {
            var original = DOMTokenList.prototype[method];

            DOMTokenList.prototype[method] = function () {
                for (var i = 0; i < arguments.length; i++) {
                    tokenMap.classes.push('.' + arguments[i]);
                }
                original.apply(this, arguments);
                notify();
            };
        };
        createMethod('add');
        createMethod('toggle');
        createMethod('replace');
    }
    testElement = null;

    /**
     * 如果某个key的值为函数，则其 Object.getOwnPropertyDescriptor() 的结果为：
     {
                configurable: true
                enumerable: true
                value: ƒ setAttribute()
                writable: true
          }
     如果某个key的值为属性，则其 Object.getOwnPropertyDescriptor() 的结果为：
     {
                configurable: true
                enumerable: true
                get: ƒ className()
                set: ƒ className()
         }
     */

    /**
     * 重写 setAttribute
     */
    var originalSetA = Object.getOwnPropertyDescriptor(Element.prototype, 'setAttribute').value;
    Object.defineProperty(Element.prototype, "setAttribute", {
        value: function () {
            var attrKey = arguments[0], attrVal = arguments[1];
            if (attrKey === 'class') {
                processStringClasses(attrVal);
            } else if (attrKey === 'id') {
                tokenMap.IDs.push('#' + attrVal);
            }
            originalSetA.apply(this, arguments);
            notify();
        }
    });

    /**
     * 重写 className, 利用描述符
     */
    var originalClassNameSet = Object.getOwnPropertyDescriptor(Element.prototype, 'className').set;
    Object.defineProperty(Element.prototype, "className", {
        set: function (value) {
            processStringClasses(value);
            originalClassNameSet.call(this, value);
            notify();
        }
    });

    /**
     *  重写 innerHtml
     */
    var originalInnerHtmlSet = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML').set;
    Object.defineProperty(Element.prototype, "innerHTML", {
        set: function (value) {
            var reg = /(class|id)="([^"]*)"/g;
            var myArray;
            while ((myArray = reg.exec(value)) !== null) {
                if (myArray[1] === "class") {
                    processStringClasses(myArray[2]);
                } else {
                    tokenMap.IDs.push('#' + myArray[2]);
                }
            }
            originalInnerHtmlSet.call(this, value);
            notify();
        }
    });

    /**
     *  重写 document.write
     *  支持多参数，因此要用 arguments
     */
    var originalWrite = Object.getOwnPropertyDescriptor(Document.prototype, 'write').value;
    Object.defineProperty(Document.prototype, "write", {
        value: function () {
            var reg = /(class|id)="([^"]*)"/g;
            var len = arguments.length;
            for (var i = 0; i < len; i++) {
                var myArray;
                while ((myArray = reg.exec(String(arguments[i]))) !== null) {
                    if (myArray[1] === "class") {
                        processStringClasses(myArray[2]);
                    } else {
                        tokenMap.IDs.push('#' + myArray[2]);
                    }
                }
            }

            originalWrite.apply(this, arguments);
            notify();
        }
    });

    // 处理有多个class的情况
    function processStringClasses(str) {
        String(str).split(' ').forEach(function (item) {
            tokenMap.classes.push('.' + item);
        });
    }

    // 防抖函数
    function debounce(cb, time) {
        var timer = null;
        return function () {
            if (timer) clearTimeout(timer);
            timer = setTimeout(cb, time)
        }
    }
})();