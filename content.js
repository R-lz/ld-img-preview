// LINUX DO 图片预览增强插件

// 图片查看器类
class ImageViewer {
  constructor() {
    this.overlay = null;
    this.imgContainer = null;
    this.img = null;
    this.closeBtn = null;
    this.zoomInBtn = null;
    this.zoomOutBtn = null;
    this.resetBtn = null;
    this.downloadBtn = null;
    this.infoDisplay = null;
    //this.contrastBtn = null;
    this.rotateBtn = null;
    this.controlsContainer = null;
    this.currentScale = 1;
    this.isDragging = false;
    this.lastX = 0;
    this.lastY = 0;
    this.translateX = 0;
    this.translateY = 0;
    this.contrastMode = 'normal'; 
    this.currentRotation = 0;
    
    // 从设置加载对比度模式
    this.loadSettings();
    
    this.init();
  }
  
  // 加载设置
  loadSettings() {
    try {
      // 尝试使用Chrome存储API
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['contrastMode', 'currentRotation'], (result) => {
          if (result.contrastMode) {
            this.contrastMode = result.contrastMode;
          }
          if (result.currentRotation) {
            this.currentRotation = result.currentRotation;
          }
        });
      } else {
        const savedContrastMode = localStorage.getItem('linuxdo-contrast-mode');
        if (savedContrastMode) {
          this.contrastMode = savedContrastMode;
        }
        
        const savedRotation = localStorage.getItem('linuxdo-rotation');
        if (savedRotation) {
          this.currentRotation = parseInt(savedRotation, 10);
        }
      }
    } catch (e) {
      console.error('无法加载设置:', e);
    }
  }
  
  // 保存设置
  saveSettings() {
    try {
      // 尝试使用Chrome存储API
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ 
          'contrastMode': this.contrastMode,
          'currentRotation': this.currentRotation
        });
      } else {
        // 回退到localStorage
        localStorage.setItem('linuxdo-contrast-mode', this.contrastMode);
        localStorage.setItem('linuxdo-rotation', this.currentRotation.toString());
      }
    } catch (e) {
      console.error('无法保存设置:', e);
    }
  }
  
  // 初始化
  init() {
    // 监听页面中所有图片的点击事件
    document.addEventListener('click', (e) => {
      // 只处理图片元素
      if (e.target.tagName !== 'IMG') return;
      
      if (this.shouldExcludeImage(e.target)) return;
      
      // 只处理帖子内容区域中的图片
      if (this.isPostContentImage(e.target)) {
        const originalSrc = this.getOriginalImageUrl(e.target);
        this.openViewer(originalSrc, e.target);
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
  }
  
  // 判断是否是帖子内容中的图片
  isPostContentImage(imgElement) {
    // 在LINUX DO论坛中，帖子内容通常包含在以下选择器中的元素内
    const validSelectors = [
      '.topic-body .cooked', 
      '.topic-body .post-content', 
      '.lightbox-wrapper', 
      '.cooked img:not(.emoji)'
    ];
    
    // 检查图片是否在有效的内容选择器中
    return validSelectors.some(selector => {
      return imgElement.closest(selector) !== null;
    });
  }
  
  // 判断是否应该排除此图片
  shouldExcludeImage(imgElement) {
    if (
      imgElement.closest('.avatar') !== null || 
      imgElement.classList.contains('avatar') ||
      imgElement.closest('.user-card-avatar') !== null ||
      imgElement.closest('.user-image') !== null
    ) {
      return true;
    }
    
    if (imgElement.classList.contains('emoji')) {
      return true;
    }
    
    if (
      imgElement.closest('header') !== null ||
      imgElement.closest('nav') !== null ||
      imgElement.closest('.site-header') !== null ||
      imgElement.closest('.menu-panel') !== null ||
      imgElement.closest('.d-header') !== null ||
      imgElement.width < 40 ||
      imgElement.height < 40
    ) {
      return true;
    }
    
    return false;
  }
  
  // 获取原始图片URL
  getOriginalImageUrl(imgElement) {
    if (imgElement.dataset.originalSrc) {
      return imgElement.dataset.originalSrc;
    }
    
    const lightbox = imgElement.closest('.lightbox');
    if (lightbox && lightbox.href) {
      return lightbox.href;
    }
    
    // 检查父元素中是否有链接指向原图
    const parentLink = imgElement.closest('a');
    if (parentLink && parentLink.href && this.isImageUrl(parentLink.href)) {
      return parentLink.href;
    }
    
    // 将缩略图路径转换为原图路径
    let originalUrl = imgElement.src;
    originalUrl = originalUrl.replace(/\?.*$/, '');
    originalUrl = originalUrl.replace(/\/optimized\//, '/original/');
    originalUrl = originalUrl.replace(/\/resized\//, '/original/');
    originalUrl = originalUrl.replace(/_\d+x\d+(\.\w+)$/, '$1');
    originalUrl = originalUrl.replace(/\.thumbnail(\.\w+)$/, '$1');
    
    // 处理类似 linux.do 的可能使用的CDN图片调整尺寸参数
    originalUrl = originalUrl.replace(/\/w\d+\//, '/');
    originalUrl = originalUrl.replace(/\/h\d+\//, '/');
    originalUrl = originalUrl.replace(/\/s\d+\//, '/');
    
    return originalUrl;
  }
  
  // 检查URL是否为图片
  isImageUrl(url) {
    return /\.(jpe?g|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url);
  }
  
  // 创建查看器 UI
  createViewer(imgSrc, naturalWidth, naturalHeight, imgType, imgSize) {
    // 创建遮罩层
    this.overlay = document.createElement('div');
    this.overlay.className = 'linuxdo-image-viewer-overlay';
    
    // 创建图片容器
    this.imgContainer = document.createElement('div');
    this.imgContainer.className = 'linuxdo-image-viewer-container';
    
    // 创建图片元素
    this.img = document.createElement('img');
    this.img.className = 'linuxdo-image-viewer-img';
    
    // 创建图片信息显示区域
    this.infoDisplay = document.createElement('div');
    this.infoDisplay.className = 'linuxdo-image-viewer-info';
    this.infoDisplay.innerHTML = '加载中...';
    
    // 创建按钮容器
    this.controlsContainer = document.createElement('div');
    this.controlsContainer.className = 'linuxdo-image-viewer-controls';
    
    // 创建关闭按钮
    this.closeBtn = document.createElement('button');
    this.closeBtn.className = 'linuxdo-image-viewer-btn linuxdo-image-viewer-close round';
    this.closeBtn.innerHTML = '×';
    this.closeBtn.title = '关闭';
    
    // 创建放大按钮
    this.zoomInBtn = document.createElement('button');
    this.zoomInBtn.className = 'linuxdo-image-viewer-btn round';
    this.zoomInBtn.innerHTML = this.getSvgIcon('zoom-in');
    this.zoomInBtn.title = '放大';
    
    // 创建缩小按钮
    this.zoomOutBtn = document.createElement('button');
    this.zoomOutBtn.className = 'linuxdo-image-viewer-btn round';
    this.zoomOutBtn.innerHTML = this.getSvgIcon('zoom-out');
    this.zoomOutBtn.title = '缩小';
    
    // 创建下载按钮
    this.downloadBtn = document.createElement('button');
    this.downloadBtn.className = 'linuxdo-image-viewer-btn';
    this.downloadBtn.innerHTML = this.getSvgIcon('download') + '<span>下载</span>';
    this.downloadBtn.title = '下载原图';
    
    // 创建重置按钮
    this.resetBtn = document.createElement('button');
    this.resetBtn.className = 'linuxdo-image-viewer-btn';
    this.resetBtn.innerHTML = this.getSvgIcon('reset') + '<span>重置</span>';
    this.resetBtn.title = '重置视图';
    
    // 添加对比度切换按钮
    // this.contrastBtn = document.createElement('button');
    // this.contrastBtn.className = 'linuxdo-image-viewer-btn';
    // this.contrastBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><path d="M12 4c-4.41 0-8 3.59-8 8s3.59 8 8 8v-16z"/></svg>';
    // this.contrastBtn.title = '调整对比度';
    
    // 添加旋转按钮
    this.rotateBtn = document.createElement('button');
    this.rotateBtn.className = 'linuxdo-image-viewer-btn';
    this.rotateBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7.11 8.53L5.7 7.11C4.8 8.27 4.24 9.61 4.07 11h2.02c.14-.87.49-1.72 1.02-2.47zM6.09 13H4.07c.17 1.39.72 2.73 1.62 3.89l1.41-1.42c-.52-.75-.87-1.59-1.01-2.47zm1.01 5.32c1.16.9 2.51 1.44 3.9 1.61V17.9c-.87-.15-1.71-.49-2.46-1.03L7.1 18.32zM13 4.07V1L8.45 5.55 13 10V6.09c2.84.48 5 2.94 5 5.91s-2.16 5.43-5 5.91v2.02c3.95-.49 7-3.85 7-7.93s-3.05-7.44-7-7.93z"/></svg>';
    this.rotateBtn.title = '旋转图片';
    
    this.imgContainer.appendChild(this.img);
    this.overlay.appendChild(this.imgContainer);
    this.overlay.appendChild(this.closeBtn);
    
    this.controlsContainer.appendChild(this.infoDisplay);
    this.controlsContainer.appendChild(this.zoomOutBtn);
    this.controlsContainer.appendChild(this.zoomInBtn);
    this.controlsContainer.appendChild(this.resetBtn);
    this.controlsContainer.appendChild(this.rotateBtn);
    this.controlsContainer.appendChild(this.downloadBtn);
    //this.controlsContainer.appendChild(this.contrastBtn);
    
    this.overlay.appendChild(this.controlsContainer);
    this.closeBtn.addEventListener('click', () => this.closeViewer());
    this.zoomInBtn.addEventListener('click', () => this.zoom(0.2));
    this.zoomOutBtn.addEventListener('click', () => this.zoom(-0.2));
    this.resetBtn.addEventListener('click', () => this.resetView());
    this.downloadBtn.addEventListener('click', () => this.downloadImage());
    //this.contrastBtn.addEventListener('click', () => this.toggleContrastMode());
    this.rotateBtn.addEventListener('click', () => this.rotateImage());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.closeViewer();
    });
    
    // 鼠标滚轮缩放
    this.overlay.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      this.zoom(delta);
    });
    
    // 拖动图片
    this.imgContainer.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.isDragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.imgContainer.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const deltaX = e.clientX - this.lastX;
      const deltaY = e.clientY - this.lastY;
      this.translateX += deltaX;
      this.translateY += deltaY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.applyTransform();
    });
    
    document.addEventListener('mouseup', () => {
      this.isDragging = false;
      if (this.imgContainer) {
        this.imgContainer.style.cursor = 'grab';
      }
    });
    
    // 添加键盘支持
    document.addEventListener('keydown', (e) => {
      if (!this.overlay || !document.body.contains(this.overlay)) return;
      
      switch (e.key) {
        case 'Escape':
          this.closeViewer();
          break;
        case '+':
        case '=':
          this.zoom(0.2);
          break;
        case '-':
          this.zoom(-0.2);
          break;
        case '0':
          this.resetView();
          break;
        case 'd':
        case 'D':
          this.downloadImage();
          break;
      }
    });
    
    document.body.appendChild(this.overlay);
  }
  
  // 获取SVG图标
  getSvgIcon(type) {
    const icons = {
      'zoom-in': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 0 0 1.48-5.34c-.47-2.78-2.79-5-5.59-5.34a6.505 6.505 0 0 0-7.27 7.27c.34 2.8 2.56 5.12 5.34 5.59a6.5 6.5 0 0 0 5.34-1.48l.27.28v.79l4.25 4.25c.41.41 1.08.41 1.49 0 .41-.41.41-1.08 0-1.49L15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zm.5-7H9v2H7v1h2v2h1v-2h2V9h-2z"/></svg>',
      'zoom-out': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 0 0 1.48-5.34c-.47-2.78-2.79-5-5.59-5.34a6.505 6.505 0 0 0-7.27 7.27c.34 2.8 2.56 5.12 5.34 5.59a6.5 6.5 0 0 0 5.34-1.48l.27.28v.79l4.25 4.25c.41.41 1.08.41 1.49 0 .41-.41.41-1.08 0-1.49L15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM7 9h5v1H7z"/></svg>',
      'download': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>',
      'reset': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>'
    };
    
    return icons[type] || '';
  }
  
  // 打开查看器
  openViewer(imgSrc, originalImgElement = null) {
    this.createViewer(imgSrc, 0, 0, '', '');
    
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'linuxdo-image-viewer-loading';
    for (let i = 0; i < 3; i++) {
      loadingIndicator.appendChild(document.createElement('div'));
    }
    this.overlay.appendChild(loadingIndicator);
    
    // 设置图片源和重置视图
    this.img.src = imgSrc;
    this.resetView();
    document.body.style.overflow = 'hidden';
    
    this.originalImgElement = originalImgElement;
    
    // 获取图片文件大小信息
    this.fetchImageInfo(imgSrc);
    
    this.img.onload = () => {
      this.resetView();
      
      if (loadingIndicator.parentNode) {
        loadingIndicator.parentNode.removeChild(loadingIndicator);
      }
      
      this.updateImageDimensions();
      this.ensureImageVisible();
    };
    
    // 处理加载错误
    this.img.onerror = () => {
      // 如果原图加载失败，尝试使用原始元素的src
      if (originalImgElement && this.img.src !== originalImgElement.src) {
        this.img.src = originalImgElement.src;
        // 重新尝试获取文件大小
        this.fetchImageInfo(originalImgElement.src);
      } else {
        // 显示加载失败消息
        if (loadingIndicator.parentNode) {
          loadingIndicator.parentNode.removeChild(loadingIndicator);
        }
        const errorMsg = document.createElement('div');
        errorMsg.className = 'linuxdo-image-viewer-error';
        errorMsg.textContent = '图片加载失败';
        this.overlay.appendChild(errorMsg);
        
        if (this.infoDisplay) {
          this.infoDisplay.innerHTML = '加载失败';
        }
      }
    };
  }
  
  // 确保图片完全可见
  ensureImageVisible() {
    if (!this.img) return;
    
    // 获取图片和容器的尺寸信息
    const imgRect = this.img.getBoundingClientRect();
    const containerRect = this.overlay.getBoundingClientRect();
    
    // 如果图片宽度或高度为0，说明图片还没有完全加载，等待再试
    if (imgRect.width === 0 || imgRect.height === 0) {
      setTimeout(() => this.ensureImageVisible(), 100);
      return;
    }
    
    // 计算图片中心和容器中心
    const imgCenterX = imgRect.left + imgRect.width / 2;
    const imgCenterY = imgRect.top + imgRect.height / 2;
    const containerCenterX = containerRect.left + containerRect.width / 2;
    const containerCenterY = containerRect.top + containerRect.height / 2;
    
    // 如果中心点偏移超过一定阈值，重新居中
    const thresholdX = containerRect.width * 0.05; // 5%容差
    const thresholdY = containerRect.height * 0.05;
    
    // 检查是否需要调整位置
    const needsAdjustmentX = Math.abs(imgCenterX - containerCenterX) > thresholdX;
    const needsAdjustmentY = Math.abs(imgCenterY - containerCenterY) > thresholdY;
    
    if (needsAdjustmentX || needsAdjustmentY) {
      // 计算需要调整的位移
      const adjustX = containerCenterX - imgCenterX;
      const adjustY = containerCenterY - imgCenterY;
      
      this.translateX += adjustX;
      this.translateY += adjustY;
      
      // 应用新的变换
      this.applyTransform();
      
      // 记录调整
      console.log(`图片位置已调整: X=${adjustX.toFixed(2)}px, Y=${adjustY.toFixed(2)}px`);
    }
    
    // 检查图片是否过大而超出容器范围
    if (imgRect.width > containerRect.width || imgRect.height > containerRect.height) {
      // 计算需要的缩放比例，使图片完全适合容器
      const scaleX = containerRect.width / imgRect.width * 0.9;
      const scaleY = containerRect.height / imgRect.height * 0.9;
      const adjustScale = Math.min(scaleX, scaleY);
      
      // 只在图片明显过大时才缩小
      if (adjustScale < 0.9) {
        this.currentScale *= adjustScale;
        this.applyTransform();
        
        // 重新检查位置
        setTimeout(() => this.ensureImageVisible(), 50);
      }
    }
  }
  
  // 关闭查看器
  closeViewer() {
    if (this.overlay && this.overlay.parentNode) {
      // 添加退出动画
      this.overlay.style.animation = 'fade-in 0.2s reverse forwards';
      this.img.style.animation = 'image-pop-in 0.2s reverse forwards';
      
      // 等待动画完成后移除元素
      setTimeout(() => {
        if (this.overlay && this.overlay.parentNode) {
          this.overlay.parentNode.removeChild(this.overlay);
          document.body.style.overflow = '';
        }
        
        // 重置状态
        this.overlay = null;
        this.imgContainer = null;
        this.img = null;
        this.closeBtn = null;
        this.zoomInBtn = null;
        this.zoomOutBtn = null;
        this.resetBtn = null;
        this.downloadBtn = null;
        this.infoDisplay = null;
        //this.contrastBtn = null;
        this.rotateBtn = null;
        this.controlsContainer = null;
        this.currentScale = 1;
        this.translateX = 0;
        this.translateY = 0;
        this.currentRotation = 0;
      }, 200);
    }
  }
  
  // 缩放
  zoom(factor) {
    const newScale = Math.max(0.1, this.currentScale + factor);
    this.currentScale = newScale;
    this.applyTransform();
  }
  
  // 重置视图
  resetView() {
    if (!this.img) return;
    
    const oldRotation = this.currentRotation;
    
    // 重置变换值
    this.currentScale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.currentRotation = 0;
    
    // 确保变换原点为中心
    this.img.style.transformOrigin = 'center center';
    
    // 重置图片的最大尺寸约束
    this.img.style.maxWidth = '90vw';
    this.img.style.maxHeight = '90vh';
    
    // 应用变换
    this.applyTransform();
    
    // 无论是否之前有旋转，都确保图片居中可见
    setTimeout(() => {
      // 确保图片完全可见
      this.ensureImageVisible();
    }, 50);
  }
  
  // 旋转图片
  rotateImage() {
    if (!this.img) return;
    
    const oldRotation = this.currentRotation;
    
    // 每次旋转90度
    this.currentRotation = (this.currentRotation + 90) % 360;
    
    // 每360度旋转一周，重置变换以避免累积误差
    if (this.currentRotation === 0 && oldRotation === 270) {
      this.translateX = 0;
      this.translateY = 0;
    }
    
    // 应用旋转变换
    this.applyTransform();
    this.centerAfterRotation(oldRotation);
    this.saveSettings();
  }
  
  // 旋转后重新居中
  centerAfterRotation(oldRotation) {
    if (!this.img) return;
    
    const wasLandscape = oldRotation % 180 === 0;
    const isLandscape = this.currentRotation % 180 === 0;
    
    // 如果方向发生了改变，或者完成了一周旋转
    if (wasLandscape !== isLandscape || (oldRotation === 270 && this.currentRotation === 0)) {
      // 重置位置
      this.translateX = 0;
      this.translateY = 0;
      
      // 等待浏览器重新计算样式后再调整位置
      setTimeout(() => {
        // 获取图片当前尺寸
        const imgRect = this.img.getBoundingClientRect();
        const containerRect = this.overlay.getBoundingClientRect();
        
        // 计算需要的调整，使用overlay作为参考点而不是imgContainer
        const containerCenterX = containerRect.width / 2;
        const containerCenterY = containerRect.height / 2;
        const imgCenterX = imgRect.left + imgRect.width / 2 - containerRect.left;
        const imgCenterY = imgRect.top + imgRect.height / 2 - containerRect.top;
        
        // 调整位置使图片居中
        this.translateX = containerCenterX - imgCenterX;
        this.translateY = containerCenterY - imgCenterY;
        
        // 应用新的变换
        this.applyTransform();
        
        // 再次检查位置是否正确
        setTimeout(() => this.ensureImageVisible(), 50);
      }, 50);
    }
  }
  
  // 应用变换 (缩放和旋转)
  applyTransform() {
    if (!this.img) return;
    
    // 设置变换原点为中心
    this.img.style.transformOrigin = 'center center';
    
    // 应用缩放和旋转
    this.img.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.currentScale}) rotate(${this.currentRotation}deg)`;
    
    // 根据旋转角度调整图片的尺寸约束
    if (this.currentRotation % 180 === 90) {
      // 旋转为竖直方向时的处理
      const viewportWidth = window.innerWidth * 0.9;
      const viewportHeight = window.innerHeight * 0.9;
      
      if (this.img.naturalWidth > this.img.naturalHeight) {
        // 原图是横向的，旋转后需要更多的垂直空间
        this.img.style.maxWidth = `${viewportHeight}px`;
        this.img.style.maxHeight = `${viewportWidth}px`;
      } else {
        // 原图是纵向的，旋转后需要更多的水平空间
        this.img.style.maxWidth = `${viewportHeight}px`;
        this.img.style.maxHeight = `${viewportWidth}px`;
      }
    } else {
      // 正常方向
      this.img.style.maxWidth = '90vw';
      this.img.style.maxHeight = '90vh';
    }
  }
  
  // 下载图片
  downloadImage() {
    if (!this.img || !this.img.src) return;
    
    // 获取文件名
    const filename = this.getFilenameFromUrl(this.img.src);
    
    // 确认是在扩展环境中
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      // 通过消息传递请求后台脚本下载
      chrome.runtime.sendMessage({
        action: 'download',
        url: this.img.src,
        filename: filename
      }, response => {
        if (!response || !response.success) {
          // 如果扩展API失败，尝试备用方法
          this.downloadWithFetch(this.img.src, filename);
        }
      });
    } else {
      // 在非扩展环境中使用fetch方法
      this.downloadWithFetch(this.img.src, filename);
    }
  }
  
  // 使用Fetch API下载图片
  downloadWithFetch(url, filename) {
    fetch(url)
      .then(response => response.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        
        // 添加到DOM并触发点击
        document.body.appendChild(link);
        link.click();
        
        // 清理
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }, 100);
      })
      .catch(error => {
        console.error('下载图片时出错:', error);
        
        // 最后尝试直接打开并提示用户右键保存
        const link = document.createElement('a');
        link.href = url;
        link.download = filename; // 虽然可能不起作用
        link.target = '_blank';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // 提示用户右键保存
        const messageDiv = document.createElement('div');
        messageDiv.className = 'linuxdo-image-viewer-message';
        messageDiv.textContent = '请在新页面中右键点击图片，选择"图片另存为"保存图片';
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
          document.body.removeChild(messageDiv);
        }, 3000);
      });
  }
  
  // 从URL中提取文件名
  getFilenameFromUrl(url) {
    try {
      // 尝试使用 URL 对象解析
      const parsedUrl = new URL(url);
      const pathname = parsedUrl.pathname;
      let filename = pathname.split('/').pop();
      
      filename = filename.split('?')[0].split('#')[0];
      if (!filename || filename.trim() === '') {
        filename = 'image.png';
      }
      
      return filename;
    } catch (e) {
      // 解析失败，使用时间戳作为文件名
      return `image_${Date.now()}.png`;
    }
  }
  
  // 更新图片尺寸信息显示
  updateImageDimensions() {
    if (!this.img || !this.infoDisplay) return;
    
    const width = this.img.naturalWidth || 0;
    const height = this.img.naturalHeight || 0;
    
    if (this.fileSize) {
      this.infoDisplay.innerHTML = `${width} × ${height} · ${this.fileSize}`;
    } else {
      this.infoDisplay.innerHTML = `${width} × ${height}`;
    }
  }
  
  // 获取图片文件大小
  fetchImageInfo(url) {
    if (!url || !this.infoDisplay) return;
    
    this.fileSize = null;
    
    // 使用fetch获取文件大小
    fetch(url, { method: 'HEAD' })
      .then(response => {
        if (response.ok) {
          // 获取Content-Length头
          const contentLength = response.headers.get('Content-Length');
          if (contentLength) {
            this.fileSize = this.formatFileSize(parseInt(contentLength, 10));
            this.updateImageDimensions();
          }
        }
      })
      .catch(error => {
        console.error('获取图片信息时出错:', error);
      });
  }
  
  // 格式化文件大小
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  // 拖动开始
  startDrag(e) {
    if (e.button !== 0) return; // 只响应左键
    this.isDragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.imgContainer.style.cursor = 'grabbing';
  }
  
  // 拖动
  drag(e) {
    if (!this.isDragging) return;
    const deltaX = e.clientX - this.lastX;
    const deltaY = e.clientY - this.lastY;
    this.translateX += deltaX;
    this.translateY += deltaY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.applyTransform();
  }
  
  // 结束拖动
  endDrag() {
    this.isDragging = false;
    this.imgContainer.style.cursor = 'move';
  }
  
  // 滚轮事件处理
  handleWheel(e) {
    e.preventDefault();
    
    // 根据滚轮方向缩放
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    this.zoom(delta);
  }
  
  // 切换图片对比度模式
  // toggleContrastMode() {
  //   // 根据当前模式切换到下一个模式
  //   switch (this.contrastMode) {
  //     case 'normal':
  //       this.contrastMode = 'high';
  //       this.contrastBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 15.31L23.31 12 20 8.69V4h-4.69L12 .69 8.69 4H4v4.69L.69 12 4 15.31V20h4.69L12 23.31 15.31 20H20v-4.69zM12 18V6c3.31 0 6 2.69 6 6s-2.69 6-6 6z"/></svg>';
  //       break;
  //     case 'high':
  //       this.contrastMode = 'higher';
  //       this.contrastBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 15.31L23.31 12 20 8.69V4h-4.69L12 .69 8.69 4H4v4.69L.69 12 4 15.31V20h4.69L12 23.31 15.31 20H20v-4.69zM12 18V6c3.31 0 6 2.69 6 6s-2.69 6-6 6z"/><circle cx="12" cy="12" r="2"/></svg>';
  //       break;
  //     case 'higher':
  //       this.contrastMode = 'normal';
  //       this.contrastBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><path d="M12 4c-4.41 0-8 3.59-8 8s3.59 8 8 8v-16z"/></svg>';
  //       break;
  //   }
    
  //   // 应用新的对比度样式
  //   this.applyContrastMode();
    
  //   // 保存设置
  //   this.saveSettings();
  // }
  
  // 应用图片对比度样式
  // applyContrastMode() {
  //   if (!this.img) return;
    
  //   this.img.classList.remove('ldo-contrast-normal', 'ldo-contrast-high', 'ldo-contrast-higher');
  //   this.img.classList.add(`ldo-contrast-${this.contrastMode}`);
  // }
}

// 创建并初始化图片查看器
const viewer = new ImageViewer(); 