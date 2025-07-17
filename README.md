# 市场数据分析平台

一个基于 Next.js 构建的实时市场数据分析平台，集成 AI 驱动的市场情绪分析功能。

## 功能特性

- 📊 实时市场数据显示（1小时和3分钟K线数据）
- 🤖 AI驱动的市场情绪分析
- 📈 交互式图表和数据表格
- 🎨 现代化响应式UI设计
- 🔐 用户自定义API密钥管理

## 技术栈

- **前端**: Next.js 15, React 18, TypeScript
- **UI组件**: Radix UI, Tailwind CSS
- **图表**: Recharts
- **数据存储**: AWS DynamoDB
- **AI分析**: Google Gemini API
- **技术指标**: technicalindicators库

## 本地开发

### 环境要求

- Node.js 20+
- npm 或 yarn

### 安装和运行

1. 克隆项目
```bash
git clone <your-repo-url>
cd firebase_amazon
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
创建 `.env.local` 文件并添加以下配置：
```env
# AWS DynamoDB 配置
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_REGION=your_aws_region_here
```

4. 启动开发服务器
```bash
npm run dev
```

5. 打开浏览器访问 [http://localhost:9002](http://localhost:9002)

## Vercel 部署

### 方法一：通过 Vercel 网站部署

1. 访问 [vercel.com](https://vercel.com) 并登录
2. 点击 "New Project"
3. 从 Git 仓库导入您的项目
4. 配置环境变量：
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`
5. 点击 "Deploy"

### 方法二：通过 Vercel CLI 部署

1. 安装 Vercel CLI
```bash
npm install -g vercel
```

2. 登录 Vercel
```bash
vercel login
```

3. 在项目根目录运行
```bash
vercel
```

4. 按照提示配置项目

5. 设置环境变量
```bash
vercel env add AWS_ACCESS_KEY_ID
vercel env add AWS_SECRET_ACCESS_KEY
vercel env add AWS_REGION
```

6. 重新部署
```bash
vercel --prod
```

## 环境变量配置

### 必需的环境变量

| 变量名 | 描述 | 示例 |
|--------|------|------|
| `AWS_ACCESS_KEY_ID` | AWS访问密钥ID | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | AWS访问密钥 | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_REGION` | AWS区域 | `us-east-1` |

### 可选环境变量

| 变量名 | 描述 | 示例 |
|--------|------|------|
| `GEMINI_API_KEY` | 默认的Gemini API密钥 | `AIzaSy...` |

## 使用说明

1. **选择交易品种**: 在下拉菜单中选择要分析的交易品种
2. **查看数据**: 切换表格和图表视图查看市场数据
3. **设置API密钥**: 在配置区域输入您的Gemini API密钥
4. **AI分析**: 点击"AI分析"按钮获得智能市场分析报告

## 项目结构

```
src/
├── app/                 # Next.js App Router
│   ├── actions.ts      # Server Actions
│   ├── layout.tsx      # 根布局
│   └── page.tsx        # 主页
├── components/         # React组件
│   ├── ui/            # UI基础组件
│   └── market-data-*  # 市场数据相关组件
├── ai/                # AI分析功能
│   └── flows/         # AI流程
├── lib/               # 工具库
├── types/             # TypeScript类型定义
└── hooks/             # 自定义Hooks
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License
