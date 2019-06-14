(function () {
    // 向页面注入JS
    function injectCustomJs(jsPath) {
        jsPath = jsPath || 'js/inject.js';
        var temp = document.createElement('script');
        temp.setAttribute('type', 'text/javascript');
        // 获得的地址类似：chrome-extension://ihcokhadfjfchaeagdoclpnjdiokfakg/js/inject.js
        temp.src = chrome.extension.getURL(jsPath);
        temp.onload = function () {
            // 放在页面不好看，执行完后移除掉
            this.parentNode.removeChild(this);
        };
        document.documentElement.appendChild(temp);
    }

    // 接受来自页面的消息，然后转发给background
    window.addEventListener("message", function (e) {
        var data = e.data;
        if (data.hasOwnProperty('IDs') && data.hasOwnProperty('classes')) {
            var res = {
                to: 'bg',
                from: 'js',
                host: location.host,
                IDs: data.IDs,
                classes: data.classes
            };

            console.log(res, 'this is js content 正在发送给 bg！');
            chrome.runtime.sendMessage(res);
        }
    }, false);

    injectCustomJs();
})();