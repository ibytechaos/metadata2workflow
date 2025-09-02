# 🖼️ Civitai Image Upload Feature Guide

## 功能概述

现在 Metadata2Workflow 插件支持直接上传 Civitai 下载的图片，自动提取其中的元数据并生成对应的 ComfyUI 工作流！

## 如何使用

1. **右键点击 ComfyUI 画布空白区域**
2. **选择 "🖼️ Upload Civitai Image"**  
3. **选择从 Civitai 下载的图片文件**
4. **等待自动生成工作流**

## 支持的图片格式

### ✅ PNG 格式 (推荐)
- 最常见的 AI 图片格式
- 支持 tEXt、iTXt、zTXt 等 PNG 文本块
- 元数据通常存储在 "parameters"、"Comment" 等字段中

### ✅ JPEG 格式  
- 支持 EXIF 数据解析
- 查找嵌入的 JSON 和参数字符串
- 支持 base64 编码的元数据

### 🔄 WebP 格式 (计划中)
- 目前暂未实现，将在后续版本支持

## 支持的元数据格式

### 📝 参数字符串格式
```
beautiful girl, detailed face, <lora:style:0.8>

Negative prompt: blurry, low quality

Steps: 25, Sampler: DPM++ 2M Karras, CFG scale: 7.5, Seed: 123456789, Size: 768x1024, Model: realisticVisionV51_v51VAE
```

### 📊 JSON 格式
```json
{
  "prompt": "beautiful girl, <lora:style:0.8>",
  "negativePrompt": "blurry, low quality", 
  "steps": 25,
  "sampler": "DPM++ 2M Karras",
  "cfgScale": 7.5,
  "seed": 123456789,
  "baseModel": "realisticVisionV51_v51VAE"
}
```

## 智能元数据检测

插件会自动识别以下关键词和模式：

### 🔍 PNG 文本块关键词
- parameters, metadata, prompt, comment, description
- generation, software, civitai, automatic1111, comfyui  
- stable diffusion, dream, invoke, novelai

### 🔍 参数指示器
- steps:, sampler:, cfg scale:, seed:, model:, basemodel:
- negative prompt:, lora:, "prompt", "steps", "sampler"

## 工作流生成特性

上传图片后，插件将：

1. **🔍 自动提取** 图片中的所有元数据信息
2. **📊 智能解析** 提示词、参数、模型、LoRA 等信息  
3. **🔗 创建节点** 生成完整的 ComfyUI 标准节点
4. **🎯 配置参数** 自动设置所有采样参数
5. **🔀 建立连接** 正确连接所有节点形成工作流

## 支持的元素

- ✅ **多个 LoRA** - 自动创建 LoRA 链
- ✅ **模型加载** - 支持各种模型字段名  
- ✅ **采样参数** - Steps, CFG Scale, Sampler, Scheduler
- ✅ **图像尺寸** - 自动设置 width x height
- ✅ **种子值** - 保持可重现性
- ✅ **提示词** - 正向和负向提示词

## 常见问题

### Q: 上传后显示"未找到元数据"？
A: 请确保：
- 图片是从 Civitai 或其他 AI 生成工具下载的原始文件
- 图片格式为 PNG 或 JPEG
- 图片未被压缩或重新保存过

### Q: 支持哪些 AI 生成工具的图片？
A: 理论上支持所有在图片中嵌入元数据的工具：
- Automatic1111 WebUI
- ComfyUI (如果有元数据)
- NovelAI  
- Invoke AI
- DreamStudio
- Civitai 在线生成器

### Q: 生成的工作流不完整？
A: 这可能是因为：
- 原始图片的元数据不完整
- 某些参数在转换时丢失
- 可以手动调整生成的节点

## 调试信息

如果遇到问题，请：

1. **打开浏览器开发者工具** (F12)
2. **查看 Console 标签页**  
3. **上传图片并查看详细日志**
4. **日志会显示提取到的元数据和处理过程**

## 未来计划

- 🔄 WebP 格式支持
- 📱 拖拽上传支持
- 🎨 更多 AI 工具格式支持
- 🔧 元数据编辑器
- 📤 批量处理功能