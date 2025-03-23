#!/bin/bash

echo "开始打包"

# 创建临时目录
temp_dir="ld-img-preview-tmp"
mkdir -p "$temp_dir"

# 复制必要文件
cp manifest.json "$temp_dir/"
cp content.js "$temp_dir/"
cp styles.css "$temp_dir/"
cp -r images "$temp_dir/"

# 创建 ZIP 包
zip_file="ld-img-preview.zip"
zip -r "$zip_file" "$temp_dir"/*

# 清理临时目录
rm -rf "$temp_dir"

echo "打包完成: $zip_file"