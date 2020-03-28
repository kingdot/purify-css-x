(function () {
    const sheetRecords = {};

    document.addEventListener("DOMContentLoaded", function () {
        let links = document.getElementsByTagName("link");
        links = Array.prototype.slice.call(links);

        let srcs = [];
        links.filter(node => node.rel === "stylesheet").forEach(item => {
            let src = item.href;
            if (sheetRecords[src]) return;

            srcs.push(src);
        });
        sendUrlToBg(srcs);

        // 监听head
        crateHeadMutation();
    });

    // 监听bg发来的contents
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse)
    {
        if(request.contentArr) {
            console.log(request);
            request.contentArr.forEach(content => generateStyle(content));
        }
    });

    // 随后,你还可以停止观察
    // observer.disconnect();


    function generateStyle(content) {
        var style = document.createElement('style');
        style.innerHTML = content;
        document.getElementsByTagName('HEAD').item(0).appendChild(style);
    }

    function sendUrlToBg(srcArr) {
        // 发送urls到background，让它取请求数据
        chrome.runtime.sendMessage({
            from: "initial",
            to: 'bg',
            srcArr
        }); // 这里不用回调，因为bg是异步返回，此时port已经关闭
    }

    // 检测head变化，提取css link 的 href 地址
    function crateHeadMutation() {
        let MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
        // 选择目标节点
        let target = document.querySelector('head');
        // 创建观察者对象
        let observer = new MutationObserver(function (mutations) {
            let srcArr = [];
            mutations.forEach(function (mutation) {
                let addedNs = mutation.addedNodes, len = addedNs.length;
                if (len === 0) return;

                addedNs.forEach((item, index) => {
                    if (item instanceof HTMLLinkElement && item.rel === "stylesheet") {
                        let src = item.href;
                        console.log(src, sheetRecords);
                        if (sheetRecords[src]) return;

                        srcArr.push(src);
                    }
                })
            });

            sendUrlToBg(srcArr);
        });
        // 配置观察选项:
        let config = {childList: true, characterData: false, subtree: false};
        // 传入目标节点和观察选项
        observer.observe(target, config);
    }
})();