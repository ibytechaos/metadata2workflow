# 贡献指南 / Contributing Guide

感谢您对 ComfyUI Metadata2Workflow 项目的兴趣！我们欢迎各种形式的贡献，包括但不限于：

- 🐛 Bug 报告
- 💡 功能建议
- 📝 文档改进
- 🛠️ 代码贡献
- 🧪 测试用例
- 🌐 翻译工作

## 📋 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [报告 Bug](#报告-bug)
- [功能建议](#功能建议)
- [代码贡献](#代码贡献)
- [开发环境设置](#开发环境设置)
- [代码规范](#代码规范)
- [提交消息规范](#提交消息规范)
- [Pull Request 流程](#pull-request-流程)
- [测试](#测试)
- [文档](#文档)

## 🤝 行为准则

参与此项目的每个人都应该遵循我们的行为准则：

- 🌈 **包容性**: 欢迎不同背景和经验水平的贡献者
- 🤝 **尊重**: 对他人的意见和贡献保持尊重
- 🔄 **建设性反馈**: 提供有建设性的反馈和建议
- 📚 **学习心态**: 保持开放和学习的心态
- 🚀 **专业性**: 保持专业和友好的交流方式

## 🚀 如何贡献

### 1. 开始之前

- 查看现有的 [Issues](https://github.com/yourusername/metadata2workflow/issues) 和 [Pull Requests](https://github.com/yourusername/metadata2workflow/pulls)
- 确保您的贡献没有与现有工作重复
- 对于重大变更，请先创建 Issue 讨论

### 2. Fork 和克隆

```bash
# Fork 项目到您的 GitHub 账户
# 然后克隆到本地

git clone https://github.com/yourusername/metadata2workflow.git
cd metadata2workflow

# 添加原始仓库作为 upstream
git remote add upstream https://github.com/original-author/metadata2workflow.git
```

### 3. 创建分支

```bash
# 从 main 分支创建新的功能分支
git checkout -b feature/your-feature-name

# 或者为 bug 修复创建分支
git checkout -b fix/issue-number-description
```

## 🐛 报告 Bug

好的 Bug 报告对项目非常有价值！请包含以下信息：

### Bug 报告模板

```markdown
## Bug 描述
简洁清晰的描述 bug 是什么。

## 复现步骤
详细的复现步骤：
1. 进入 '...'
2. 点击 '...'
3. 滚动到 '...'
4. 看到错误

## 预期行为
清楚简洁地描述您期望发生什么。

## 实际行为
清楚简洁地描述实际发生了什么。

## 环境信息
- OS: [例如 iOS, Windows, macOS]
- ComfyUI 版本: [例如 v1.0.0]
- Python 版本: [例如 3.8]
- 浏览器 [如果适用]: [例如 Chrome, Safari]

## 附加信息
添加任何其他有关问题的上下文、截图等。
```

## 💡 功能建议

我们欢迎新功能建议！请提供：

### 功能建议模板

```markdown
## 功能描述
清楚简洁地描述您希望看到的功能。

## 问题描述
描述这个功能要解决的问题。例如："我总是遇到 [...]"

## 建议的解决方案
清楚简洁地描述您希望的解决方案。

## 考虑的替代方案
清楚简洁地描述您考虑过的任何替代解决方案或功能。

## 附加信息
添加任何其他有关功能请求的上下文或截图。
```

## 🛠️ 代码贡献

### 代码结构

```
metadata2workflow/
├── __init__.py              # 插件入口点
├── nodes/                   # 节点实现
│   ├── __init__.py
│   ├── metadata_parser.py   # Metadata 解析节点
│   └── workflow_generator.py # Workflow 生成节点
├── js/                      # 前端 JavaScript
│   └── metadata2workflow.js # 用户界面交互
├── tests/                   # 测试文件
│   └── test_*.py
└── docs/                    # 文档文件
```

### 添加新功能

1. **在 `nodes/` 目录添加新节点**
2. **在 `__init__.py` 中注册节点**
3. **添加相应的测试**
4. **更新文档**

## ⚙️ 开发环境设置

### 必要条件

- Python 3.8+
- ComfyUI 环境
- Git

### 设置步骤

```bash
# 1. 克隆项目
git clone https://github.com/yourusername/metadata2workflow.git
cd metadata2workflow

# 2. 创建符号链接到 ComfyUI（推荐用于开发）
ln -s $(pwd) /path/to/ComfyUI/custom_nodes/metadata2workflow

# 3. 安装开发依赖（如果有）
pip install -r requirements-dev.txt  # 如果存在

# 4. 运行测试
python3 test_metadata_parser.py
```

### IDE 配置

推荐使用 JetBrains IDEs（PyCharm, WebStorm）进行开发：

- **PyCharm**: 用于 Python 开发
- **WebStorm**: 用于 JavaScript 开发

## 📏 代码规范

### Python 代码

- 遵循 [PEP 8](https://pep8.org/) 代码规范
- 使用 4 个空格缩进
- 行长度限制为 88 字符
- 使用有意义的变量和函数名

### JavaScript 代码

- 遵循 [JavaScript Standard Style](https://standardjs.com/)
- 使用 2 个空格缩进
- 使用分号结束语句
- 使用 camelCase 命名

### 注释和文档

```python
def parse_metadata(self, metadata_text: str) -> Dict[str, Any]:
    """
    Parse Civitai metadata from text input
    
    Args:
        metadata_text: Raw metadata text from Civitai
        
    Returns:
        Dictionary containing parsed metadata parameters
        
    Raises:
        ValueError: If metadata format is invalid
    """
```

## 📝 提交消息规范

使用[约定式提交](https://www.conventionalcommits.org/)格式：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### 类型 (type)

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更改
- `style`: 代码格式（不影响代码运行的变动）
- `refactor`: 重构（既不是新增功能，也不是修改bug的代码变动）
- `test`: 增加测试
- `chore`: 构建过程或辅助工具的变动

### 示例

```
feat: add support for SDXL metadata parsing

- Add SDXL-specific parameter parsing
- Update workflow generation for SDXL models
- Add tests for SDXL metadata format

Closes #123
```

## 🔄 Pull Request 流程

### 1. 准备 PR

```bash
# 确保您的分支是最新的
git checkout main
git pull upstream main
git checkout your-branch
git rebase main

# 运行测试
python3 test_metadata_parser.py

# 提交您的更改
git add .
git commit -m "feat: your descriptive commit message"
git push origin your-branch
```

### 2. 创建 Pull Request

- 使用清晰的标题和描述
- 引用相关的 Issues
- 包含更改的摘要
- 添加测试截图（如果适用）

### 3. PR 检查清单

- [ ] 代码遵循项目的代码规范
- [ ] 已添加必要的测试
- [ ] 所有测试通过
- [ ] 文档已更新（如果需要）
- [ ] PR 描述清楚说明了更改

### 4. 代码审查

- 耐心等待维护者的审查
- 及时回应审查意见
- 根据反馈进行必要的修改

## 🧪 测试

### 运行测试

```bash
# 运行所有测试
python3 test_metadata_parser.py

# 运行特定测试
python3 -c "import test_metadata_parser; test_metadata_parser.test_basic_metadata_parsing()"
```

### 编写测试

为新功能添加测试：

```python
def test_new_feature():
    """Test description"""
    # Arrange
    parser = MetadataParserNode()
    test_data = "test metadata"
    
    # Act
    result = parser.parse_metadata(test_data)
    
    # Assert
    assert result[0] == "expected_value"
```

## 📚 文档

### 更新文档

- 为新功能添加使用说明
- 更新 README.md 中的功能列表
- 添加代码注释和文档字符串

### 文档风格

- 使用清晰、简洁的语言
- 提供实际的使用示例
- 包含必要的截图或 GIF

## ❓ 获得帮助

如果您需要帮助，可以：

- 查看现有的 [Issues](https://github.com/yourusername/metadata2workflow/issues)
- 创建新的 Issue 询问问题
- 在 [GitHub Discussions](https://github.com/yourusername/metadata2workflow/discussions) 中讨论

## 🎉 成为贡献者

一旦您的 Pull Request 被合并，您将：

- 被添加到 Contributors 列表
- 获得项目贡献者的认可
- 成为项目社区的一员

---

再次感谢您的贡献！每一个贡献都让这个项目变得更好。🚀