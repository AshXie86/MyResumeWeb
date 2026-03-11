// script.js
// 文件上传功能实现：支持PDF与Word文件预览
// 使用PDF.js渲染PDF，使用docx-preview解析.docx文件

/**
 * 文件上传处理器类
 * 管理文件选择、类型验证、内容预览及错误处理
 */
class FileUploadHandler {
  constructor() {
    // 绑定DOM元素
    this.fileInput = document.getElementById('fileInput');
    this.previewContainer = document.getElementById('previewContainer');
    this.loadingIndicator = this.createLoadingElement();

    // 验证文件输入和容器是否存在
    if (!this.fileInput || !this.previewContainer) {
      console.error('未找到必要的DOM元素：fileInput 或 previewContainer');
      return;
    }

    // 初始化事件监听器
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
  }

  /**
   * 创建加载状态指示元素
   * @returns {HTMLDivElement} 加载提示元素
   */
  createLoadingElement() {
    const loader = document.createElement('div');
    loader.textContent = '文件解析中...';
    loader.style.cssText = `
      text-align: center;
      padding: 20px;
      color: #4a90e2;
      font-size: 16px;
    `;
    return loader;
  }

  /**
   * 处理文件选择事件
   * @param {Event} event - 文件输入的change事件
   */
  handleFileSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // 清空之前的预览内容并显示加载状态
      this.clearPreview();
      this.previewContainer.appendChild(this.loadingIndicator);

      // 根据文件类型调用对应处理方法
      if (file.type === 'application/pdf') {
        this.previewPDF(file);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        this.previewWord(file);
      } else {
        throw new Error('不支持的文件格式。请上传PDF或Word(.docx)文件。');
      }
    } catch (error) {
      this.showError(error.message);
    }
  }

  /**
   * 预览PDF文件
   * @param {File} file - 用户上传的PDF文件
   */
  async previewPDF(file) {
    try {
      // 动态导入PDF.js以减少初始包体积（如果使用模块化加载）
      // 注意：实际项目中需确保pdfjsLib已通过script标签或npm引入
      if (typeof pdfjsLib === 'undefined') {
        throw new Error('PDF.js未加载，请检查pdfjs-dist库是否正确引入。');
      }

      // 设置worker路径（推荐使用CDN）
      pdfjsLib.GlobalWorkerOptions.workerSrc = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

      // 读取文件为ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1); // 渲染第一页
      const viewport = page.getViewport({ scale: window.devicePixelRatio || 1 });

      // 创建canvas用于渲染
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // 渲染页面到canvas
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;

      // 替换加载状态为渲染结果
      this.clearPreview();
      this.previewContainer.appendChild(canvas);

    } catch (error) {
      console.error('PDF渲染失败:', error);
      this.showError(`PDF文件解析失败：${error.message}`);
    }
  }

  /**
   * 预览Word文档(.docx)
   * @param {File} file - 用户上传的.docx文件
   */
  async previewWord(file) {
    try {
      // 检查docx-preview是否可用
      if (typeof renderAsync !== 'function') {
        throw new Error('docx-preview库未加载，请引入docx-preview.js');
      }

      // 清空当前预览内容
      this.clearPreview();

      // 直接使用renderAsync将.docx文件渲染为HTML
      await renderAsync(
        file,
        this.previewContainer,
        null,
        {
          className: 'docx-preview',     // 自定义类名
          inWrapper: true,               // 包裹在默认容器内
          ignoreWidth: false,           // 尊重原始文档宽度
          ignoreHeight: false,          // 尊重原始文档高度
          breakPages: true,             // 分页显示
          renderHeaders: true,          // 渲染页眉
          renderFooters: true,          // 渲染页脚
          useBase64URL: true            // 图片使用base64编码避免跨域问题
        }
      );

    } catch (error) {
      console.error('Word文件解析失败:', error);
      this.showError(`Word文件预览失败：${error.message}`);
    }
  }

  /**
   * 显示错误信息
   * @param {string} message - 错误提示文本
   */
  showError(message) {
    this.clearPreview();
    const errorEl = document.createElement('div');
    errorEl.style.cssText = `
      color: #e74c3c;
      padding: 20px;
      background-color: #fdf2f2;
      border: 1px solid #eec0c0;
      border-radius: 8px;
      margin: 10px 0;
    `;
    errorEl.textContent = message;
    this.previewContainer.appendChild(errorEl);
  }

  /**
   * 清空预览区域内容
   */
  clearPreview() {
    this.previewContainer.innerHTML = '';
  }
}

/**
 * 初始化文件上传功能
 * 在DOM加载完成后创建处理器实例
 */
document.addEventListener('DOMContentLoaded', () => {
  // 检查浏览器对File API的支持
  if (!window.File || !window.FileReader || !window.URL) {
    alert('您的浏览器不支持文件上传功能，请升级至现代浏览器。');
    return;
  }

  // 启动文件上传处理器
  new FileUploadHandler();
});

// 导出类（适用于模块化环境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FileUploadHandler;
}