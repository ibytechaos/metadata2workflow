# 🔍 图片元数据提取调试指南

如果上传图片后显示"未找到元数据"，请按以下步骤排查：

## 🔧 调试步骤

### 1. 打开浏览器开发者工具
- 按 `F12` 或右键选择"检查元素"
- 切换到 "Console" 标签页

### 2. 上传图片并查看日志
上传图片后，控制台会显示详细的提取过程：

#### PNG 文件日志示例：
```
Starting image upload process...
File selected: example.png image/png 2.5MB
Extracting PNG metadata...
Found PNG chunk: IHDR, length: 13
Found PNG chunk: tEXt, length: 1234
📝 Text chunk found - tEXt "parameters": 1234 chars
Content preview: Steps: 25, Sampler: DPM++ 2M Karras...
✅ Valid metadata found in PNG chunk
```

#### JPEG 文件日志示例：
```
Extracting EXIF metadata...
Searching for metadata patterns in JPEG (5.2MB chars)...
Found 3 potential JSON matches
Found parameter string in JPEG
```

### 3. 分析日志输出

#### ✅ 成功情况：
- 看到 "✅ Valid metadata found" 
- 或 "Found parameter string"
- 或 "Found valid JSON metadata"

#### ❌ 失败情况：
- "📊 Found 0 text chunks total" - PNG 文件没有文本块
- "No metadata found in JPEG" - JPEG 文件没有嵌入信息
- "❌ Text chunk not recognized as valid metadata" - 有文本但不是AI参数

## 🎯 常见问题和解决方案

### Q: PNG 文件显示 "Found 0 text chunks"
**原因：** 图片没有包含文本元数据块
**解决：** 
- 确保图片是从 Civitai 直接下载的原始文件
- 检查是否被其他软件重新保存过
- 尝试重新从 Civitai 下载

### Q: 显示 "Text chunk not recognized as valid metadata"
**原因：** 找到了文本但不包含AI生成参数
**查看：** 控制台会显示找到的文本内容预览
**解决：** 检查预览内容是否包含：
- Steps, Sampler, CFG scale 等参数
- 提示词内容
- 模型名称

### Q: JPEG 文件 "No metadata found"
**原因：** JPEG 的 EXIF 数据中没有AI参数
**解决：**
- 检查图片是否来自支持元数据嵌入的工具
- 尝试用专业 EXIF 查看器确认数据存在
- 有些工具将参数存储在非标准位置

## 🔍 高级调试

### 手动检查图片元数据

1. **使用在线工具：**
   - https://exifdata.com/
   - https://www.metadata2go.com/
   
2. **使用桌面软件：**
   - ExifTool (命令行)
   - IrfanView (Windows)
   - Preview (macOS)

### 查看完整控制台输出

插件会显示：
- 📝 所有找到的文本块
- 🎯 候选文本按长度排序
- 🔍 每个候选的验证过程
- 🤷 如果验证失败，会返回最长文本用于调试

### 识别的元数据格式

插件会自动识别：

#### 参数字符串格式：
```
Steps: 25, Sampler: DPM++ 2M, CFG scale: 7.5, Seed: 123456
```

#### JSON 格式：
```json
{"prompt": "...", "steps": 25, "sampler": "DPM++ 2M"}
```

#### 软件标识：
- Automatic1111, ComfyUI, NovelAI, Civitai 等

## 🛠️ 故障排除

### 如果控制台显示错误：
1. **复制完整错误信息**
2. **检查文件大小** (超过50MB会被拒绝)
3. **确认文件格式** (只支持PNG/JPEG/WebP)
4. **尝试不同的图片文件**

### 如果找到文本但无法解析：
1. 查看控制台中的 "Content preview"
2. 手动复制该文本
3. 使用 "📋 Paste Civitai Metadata" 功能粘贴

### 最后的调试选项：
如果所有方法都失败，插件会返回找到的最长文本供手动检查。查看控制台中：
```
🤷 No candidates passed validation, returning longest text: "keyword"
```

然后手动检查该文本是否包含有用信息。

## 💡 提示

- **最佳格式：** 从 Civitai 下载的 PNG 文件通常效果最好
- **避免编辑：** 不要用其他软件编辑或优化图片
- **直接下载：** 右键保存图片可能会丢失元数据，使用下载按钮
- **检查来源：** 确认图片确实是 AI 生成的，而不是手绘或拍摄的