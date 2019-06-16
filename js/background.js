(function (env) {
    // 保存搜集到的id和class信息
    var details = {},
        currentDetail = {};

// 获取当前tabId
    var getCurrentTabId = function (callback) {
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            if (callback) callback(tabs.length ? tabs[0].id : null);
        });
    };

// 发送数据给content-script
    var sendMessageToContentScript = function (message, callback) {
        getCurrentTabId(function (id) {
            chrome.tabs.sendMessage(id, message, function (response) {
                if (callback) callback(response);
            });
        })
    };

// 数组去重
    var unique = function (array) {
        return array.filter(function (item, index, array) {
            return array.indexOf(item) === index;
        });
    };

    // 处理数据
    var processData = function (host, type, request) {
        var detail = details[host];
        if (detail && detail[type]) { // 已经存在，直接添加
            var _IDs = detail[type]['IDs'],
                _classes = detail[type]['classes'];
            detail[type]['IDs'] = unique((_IDs ? _IDs : []).concat(request.IDs));
            detail[type]['classes'] = unique((_classes ? _classes : []).concat(request.classes));
        } else if (detail && (detail.hasOwnProperty('js') || detail.hasOwnProperty('html'))) { // 只存在其一
            var otherType = detail.hasOwnProperty('js') ? 'html' : 'js';
            detail[otherType] = {
                IDs: unique(request.IDs),
                classes: unique(request.classes)
            }
        } else { // 二者都没
            details[host] = {
                js: {},
                html: {}
            };
            details[host][type] = {
                IDs: unique(request.IDs),
                classes: unique(request.classes)
            }
        }
    };

    chrome.runtime.onMessage.addListener(
        function (request, sender, sendResponse) {
            // 存储来自数据源的数据
            if (request.to === "bg") {
                var host = request.host, from = request.from;
                console.log('收到来自: ' + host + ' 的原始数据', '来源：' + from);

                processData(host, from, request); // 存储数据

                if (from === 'html') { // popUp 时，才返回数据
                    // 返回本站点数据给content-script【statistic】
                    var jsData = details[host]['js'],
                        htmlData = details[host]['html'];
                    var res = {
                        iconUrl: sender.tab.favIconUrl,
                        jsData: jsData,
                        htmlData: htmlData,
                        IDs: unique((jsData.IDs ? jsData.IDs : []).concat(htmlData.IDs ? htmlData.IDs : [])),
                        classes: unique((jsData.classes ? jsData.classes : []).concat(htmlData.classes ? htmlData.classes : []))
                    };
                    console.log(res, '回送给content-script【statistic】的去重后数据');
                    sendResponse(res);
                }
            } else if (request.to === 'pop&bg') { // 保存当前最终数据，供show页面使用
                currentDetail = request;
            } else if (request.from === 'show') { // 来自 show 页面的数据请求
                sendResponse(currentDetail);
            }

        });

    env.bgDetails = {
        details: details,
        getCurrentTabId: getCurrentTabId,
        sendMessageToContentScript: sendMessageToContentScript,
        unique: unique
    };
})(window);


