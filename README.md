# ComfyUI Metadata2Workflow Plugin

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.8+-green.svg)
![ComfyUI](https://img.shields.io/badge/ComfyUI-Compatible-orange.svg)
![JetBrains](https://img.shields.io/badge/JetBrains-Open%20Source-000000.svg?logo=jetbrains)

一个用于解析 Civitai 图片 metadata 并自动生成 ComfyUI workflow 的开源插件。

## 功能特性

- 🎯 **右键菜单支持**: 通过右键菜单快速粘贴 Civitai metadata
- 📋 **剪贴板集成**: 直接从剪贴板读取 metadata
- ⚡ **自动解析**: 智能解析各种 Civitai metadata 格式
- 🔧 **多模板支持**: 支持基础、高级、img2img 等workflow模板
- 🎨 **完整参数支持**: 支持提示词、负面提示词、采样器、步数等所有常用参数
- 🎭 **LoRA 支持**: 自动识别和加载 LoRA 模型，支持强度设置
- ⌨️ **快捷键**: 支持 Ctrl+Shift+V (Mac: Cmd+Shift+V) 快捷键

## 安装方法

### 方法一: 使用 ComfyUI Manager（推荐）
1. 在 ComfyUI 中安装 ComfyUI Manager
2. 通过 Manager 搜索并安装 "Metadata2Workflow"

### 方法二: 手动安装
1. 进入 ComfyUI 安装目录的 `custom_nodes` 文件夹
2. 克隆此仓库:
```bash
git clone https://github.com/yourusername/metadata2workflow.git
```
3. 重启 ComfyUI

## 使用方法

### 1. 右键菜单方式
1. 在 ComfyUI 画布空白处右键
2. 选择 "📋 Paste Civitai Metadata"
3. 粘贴从 Civitai 复制的图片 metadata
4. 插件将自动生成对应的 workflow

### 2. 快捷键方式
1. 按下 `Ctrl+Shift+V` (Mac: `Cmd+Shift+V`)
2. 在弹出的对话框中粘贴 metadata
3. 插件将自动生成 workflow

### 3. 手动节点方式
1. 在节点菜单中找到 "Metadata2Workflow" 分类
2. 添加 "Metadata Parser" 节点
3. 在文本框中粘贴 Civitai metadata
4. 添加 "Workflow Generator" 节点并连接
5. 选择 workflow 模板类型

## 支持的 Metadata 格式

插件支持解析以下参数:
- **正面提示词** (Positive Prompt)
- **负面提示词** (Negative Prompt) 
- **LoRA 模型** (LoRA Models) - 自动识别 `<lora:name:strength>` 格式
- **采样步数** (Steps)
- **CFG Scale**
- **采样器** (Sampler)
- **调度器** (Scheduler)
- **种子值** (Seed)
- **图片尺寸** (Size)
- **模型名称** (Model)
- **VAE**
- **Clip Skip**
- **去噪强度** (Denoising Strength)

### 示例 Metadata 格式

#### 基础格式（无LoRA）
```
masterpiece, best quality, 1girl, beautiful lighting
Negative prompt: ugly, blurry, low quality
Steps: 30, Sampler: Euler a, CFG scale: 7, Seed: 1234567890, Size: 1024x1024, Model: sd_xl_base_1.0.safetensors
```

#### 包含 LoRA 的格式
```
<lora:character_v1:0.8>, <lora:style_anime:1.0>, masterpiece, best quality, 1girl, beautiful lighting
Negative prompt: ugly, blurry, low quality
Steps: 25, Sampler: DPM++ 2M, CFG scale: 7.5, Seed: 1234567890, Size: 1024x1024, Model: sd_xl_base_1.0.safetensors
```

#### 复杂格式（多个LoRA + 高级参数）
```
<lora:character_model_v2:0.75>, <lora:style_realistic:0.9>, <lora:clothing_dress:0.6>, 
(masterpiece:1.2), (best quality:1.2), 1girl, detailed face, beautiful eyes
Negative prompt: (worst quality:1.4), ugly, blurry, bad anatomy
Steps: 40, Sampler: DPM++ 2M SDE, CFG scale: 8, Seed: 9876543210, Size: 1024x1536, 
Model: realisticVision_v6.0.safetensors, VAE: vae-ft-mse.safetensors, Clip skip: 2
```

## Workflow 模板

### 1. Basic Template
- 基础的 text-to-image workflow
- 包含必要的节点: Checkpoint Loader, CLIP Encode, KSampler, VAE Decode, Save Image
- **LoRA 支持**: 自动添加 LoRA Loader 节点并正确连接

### 2. Advanced Template  
- 高级 workflow，包含放大功能
- 两阶段生成: 基础生成 + 放大细化
- **LoRA 支持**: 在放大阶段保持 LoRA 效果

### 3. Img2Img Template
- 图像到图像的 workflow
- 包含 Image Loader 和 VAE Encode 节点
- **LoRA 支持**: 在图生图过程中应用 LoRA 效果

## LoRA 功能详解

### 🎭 LoRA 自动识别
- 自动从提示词中提取 `<lora:name:strength>` 格式的 LoRA 标签
- 支持多个 LoRA 模型同时使用
- 自动清理提示词，移除 LoRA 标签

### 🔧 LoRA 节点生成
- 自动创建 LoRA Loader 节点
- 正确设置模型强度和 CLIP 强度
- 自动链式连接多个 LoRA（如果有多个）
- 确保最终模型和 CLIP 连接到正确的节点

### 💪 LoRA 强度支持
- 支持 0.1 到 2.0 范围的强度值
- 未指定强度时默认为 1.0
- 支持小数精度（如 0.75, 1.25）

### 📝 LoRA 格式示例
```
支持的格式:
<lora:model_name:0.8>          # 标准格式
<lora:model_name>              # 默认强度 1.0
<lora:model-with-dashes:0.5>   # 支持破折号
<lora:model_v2_final:1.2>      # 支持下划线和版本号
```

## 采样器映射

插件自动将 Civitai 采样器名称映射到 ComfyUI 对应名称:

| Civitai 采样器 | ComfyUI 采样器 |
|---------------|----------------|
| Euler a | euler_ancestral |
| Euler | euler |
| DPM++ 2M | dpmpp_2m |
| DPM++ 2M SDE | dpmpp_2m_sde |
| DDIM | ddim |
| ... | ... |

## 开发信息

### 文件结构
```
metadata2workflow/
├── __init__.py              # 插件入口
├── nodes/
│   ├── __init__.py
│   ├── metadata_parser.py   # Metadata 解析节点
│   └── workflow_generator.py # Workflow 生成节点
├── js/
│   └── metadata2workflow.js # 前端交互逻辑
├── requirements.txt
├── pyproject.toml
└── README.md
```

### 节点说明
- **MetadataParserNode**: 解析 Civitai metadata 文本，输出结构化数据（包括 LoRA 信息）
- **WorkflowGeneratorNode**: 根据解析数据生成 ComfyUI workflow JSON（支持 LoRA 节点）

### 输出接口
```python
MetadataParserNode 输出:
- positive_prompt (STRING): 清理后的正面提示词
- negative_prompt (STRING): 负面提示词  
- steps (INT): 采样步数
- cfg_scale (FLOAT): CFG 缩放
- sampler (STRING): 采样器名称
- scheduler (STRING): 调度器名称
- seed (INT): 种子值
- size (STRING): 图片尺寸
- parsed_data (DICT): 完整解析数据
- loras (LIST): LoRA 列表 [{"name": str, "strength": float, "full_tag": str}, ...]
```

## 🤝 贡献指南

我们热烈欢迎社区贡献！无论是 bug 报告、功能建议还是代码贡献，都对项目的发展非常有价值。

### 如何贡献

1. **报告 Bug**
   - 在 [GitHub Issues](https://github.com/yourusername/metadata2workflow/issues) 创建新的 issue
   - 详细描述问题和复现步骤
   - 提供相关的错误信息和环境信息

2. **提出功能建议**
   - 通过 Issues 提出新功能建议
   - 详细说明功能需求和使用场景
   - 讨论实现方案的可行性

3. **代码贡献**
   - Fork 本项目
   - 创建功能分支 (`git checkout -b feature/AmazingFeature`)
   - 提交更改 (`git commit -m 'Add some AmazingFeature'`)
   - 推送到分支 (`git push origin feature/AmazingFeature`)
   - 创建 Pull Request

### 开发环境设置

```bash
# 克隆项目
git clone https://github.com/yourusername/metadata2workflow.git
cd metadata2workflow

# 安装到 ComfyUI
cp -r . /path/to/ComfyUI/custom_nodes/metadata2workflow/

# 运行测试
python3 test_metadata_parser.py
```

### 代码规范

- 遵循 PEP 8 Python 代码规范
- 为新功能添加相应的测试
- 更新相关文档
- 保持代码注释的清晰性

更多详细信息，请查看 [CONTRIBUTING.md](./CONTRIBUTING.md)

## 🙏 致谢

- 感谢 [ComfyUI](https://github.com/comfyanonymous/ComfyUI) 项目提供的强大平台
- 感谢 [Civitai](https://civitai.com/) 社区提供的丰富资源
- 感谢所有贡献者和使用者的支持

## 💝 支持项目

如果这个项目对你有帮助，请考虑：

- ⭐ 给项目点个 Star
- 🐛 报告 Bug 或提出改进建议
- 📢 分享给更多的朋友
- 🤝 参与代码贡献

## 📞 联系方式

- **GitHub Issues:** [项目问题反馈](https://github.com/yourusername/metadata2workflow/issues)
- **Email:** your.email@example.com
- **Discussion:** [GitHub Discussions](https://github.com/yourusername/metadata2workflow/discussions)

## 许可证

MIT License

## 更新日志

### v1.1.0 (Latest)
- ✨ **新增 LoRA 支持**: 完整的 LoRA 识别、解析和节点生成
- 🔧 **智能 LoRA 处理**: 自动提取、清理提示词、链式连接多个 LoRA
- 🎯 **增强模板**: 所有 workflow 模板现在都支持 LoRA
- 📋 **扩展输出**: MetadataParserNode 新增 LoRA 列表输出
- 🧪 **完整测试**: 新增 LoRA 相关测试用例

### v1.0.0
- 首次发布
- 支持基础 metadata 解析和 workflow 生成
- 右键菜单和快捷键支持
- 多种 workflow 模板