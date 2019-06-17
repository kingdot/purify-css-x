window.onload = function () {
    console.log('load');

    var pageDetails;

    // 模拟 jQuery
    var $ = function (id) {
        var el = document.getElementById(id);
        el.html = function (text) {
            this.innerHTML = text;
        };
        return el;
    };
    // 获取 bg 的工具方法
    var bg = chrome.extension.getBackgroundPage().bgDetails;

    function update(items) {
        var icon = document.getElementById('site-icon');
        icon.setAttribute('src', items.iconUrl);

        $("all-selector").html(items.allSelector);
        $("use-selector").html(Object.keys(items.record.used).length);

        $("html-class").html(items.htmlData.classes.length);
        $("html-id").html(items.htmlData.IDs.length);

        $("js-class").html(items.jsData.classes.length || '--');
        $("js-id").html(items.jsData.IDs.length || '--');
    }

    // 接收来自 statistic 的最终数据
    chrome.runtime.onMessage.addListener(function (request) {
        if (request.to === 'pop&bg') {
            pageDetails = request;
            update(pageDetails);
        }
    });

    bg.getCurrentTabId(function (id) {
        chrome.tabs.executeScript(id, {file: 'js/statistics-script.js'});
    });


    $('btn-export').onclick = function () {
        bg.sendMessageToContentScript({
            to: 'statistics',
            from: 'pop',
            msg: 'download'
        });
    };
    $('btn-detail').onclick = function () {
        var link = chrome.extension.getURL("html/show.html");
        chrome.tabs.create({url: link}, function (tab) {
            chrome.windows.update(tab.windowId, {focused: true}, null);
        });
    };

};