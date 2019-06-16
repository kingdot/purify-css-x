window.onload = function () {
    // 从 bg 拉取最终数据
    chrome.runtime.sendMessage({from: 'show'}, function (response) {
        console.log(response);
    });

}