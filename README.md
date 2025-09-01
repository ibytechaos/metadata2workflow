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
```
masterpiece, best quality, 1girl, beautiful lighting
Negative prompt: ugly, blurry, low quality
Steps: 30, Sampler: Euler a, CFG scale: 7, Seed: 1234567890, Size: 1024x1024, Model: sd_xl_base_1.0.safetensors
```

## Workflow 模板

### 1. Basic Template
- 基础的 text-to-image workflow
- 包含必要的节点: Checkpoint Loader, CLIP Encode, KSampler, VAE Decode, Save Image

### 2. Advanced Template  
- 高级 workflow，包含放大功能
- 两阶段生成: 基础生成 + 放大细化

### 3. Img2Img Template
- 图像到图像的 workflow
- 包含 Image Loader 和 VAE Encode 节点

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
- **MetadataParserNode**: 解析 Civitai metadata 文本，输出结构化数据
- **WorkflowGeneratorNode**: 根据解析数据生成 ComfyUI workflow JSON

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

### v1.0.0
- 首次发布
- 支持基础 metadata 解析和 workflow 生成
- 右键菜单和快捷键支持
- 多种 workflow 模板