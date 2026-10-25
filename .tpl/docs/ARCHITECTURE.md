# 架构

应用采用 feature-based 结构。src/app 仅解析语言和 slug；meta.ts 导出页面注册。config/brand.ts 管理品牌，content/data.ts 管理双语内容，theme.css 管理全部令牌及断点。components/ 包含 Shell、WaterScene、Breathing、Forms、Cards 与 Article，pages/ 负责页面组合。host.tsx 通过 React Context 注入品牌及可选入口。运行素材限定 public/templates/zenpanda；展示截图放 .tpl/assets。无需后端、数据库、凭据或持久化服务。
