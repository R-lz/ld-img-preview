// LINUX DO 图片预览增强插件 - 后台脚本

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 处理下载请求
  if (request.action === 'download') {
    chrome.downloads.download({
      url: request.url,
      filename: request.filename,
      saveAs: false
    }, (downloadId) => {
      // 发送下载结果
      sendResponse({ success: true, downloadId: downloadId });
    });
    return true;
  }
}); 