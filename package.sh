#!/bin/bash

# 打包 LINUX DO 图片预览增强扩展
echo "开始打包 LINUX DO 图片预览增强扩展..."

# 创建临时目录
temp_dir="linuxdo-image-preview-tmp"
mkdir -p "$temp_dir"

# 复制必要文件
cp manifest.json "$temp_dir/"
cp content.js "$temp_dir/"
cp styles.css "$temp_dir/"
cp -r images "$temp_dir/"
cp README.md "$temp_dir/"

# 创建 ZIP 包
zip_file="linuxdo-image-preview.zip"
zip -r "$zip_file" "$temp_dir"/*

# 清理临时目录
rm -rf "$temp_dir"

echo "打包完成: $zip_file"
echo "您可以将此 ZIP 文件上传到 Chrome/Edge/Firefox 浏览器中安装。" 