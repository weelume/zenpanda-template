# Zenpanda 禅意慢生活模板

Next.js / React / TypeScript 双语响应式网站，默认中文，英文在 /en。首页复刻公开参考 Header：熊猫泛舟视频、16 点交互水波、逐字符模糊入场、文字滚动悬停及移动菜单；补充理念、正念练习、自然、手记列表与三篇文章、社区、联系和政策，共 12 页、24 条双语路径。

先读 .tpl/README.md、.tpl/template.json 和 .tpl/project.json。Node 24.16.0、pnpm 9.15.4 固定；pnpm install --frozen-lockfile 后 pnpm dev，访问 http://127.0.0.1:43530。Ctrl+C 停止。pnpm build 后 pnpm start 为生产预览。可选 PORT、HOSTNAME 见 .env.example，不需要密钥。依赖安装和构建请在本机 WSL Linux 文件系统执行。

pnpm typecheck、pnpm lint、pnpm test、pnpm build 为应用检查。node .tpl/tools/check.mjs . 为协议检查，不代替应用运行。pnpm bundle 生成共享运行包及 SHA256，不自动上传或发布。

品牌 config/brand.ts、双语 content/data.ts、主题 theme.css、交互 components/、页面 pages/，均在 src/features/site-templates/catalog/zenpanda。meta.ts 注册页面。./template 和 ./host 供消费方注入品牌与附加入口，通用业务没有宿主依赖。完整修改入口见 .tpl/customization.json。

联系与订阅只在浏览器校验，不发送、不保存。呼吸练习是可暂停的日常节奏引导，不是医疗或治疗；社区为概念演示，没有真实报名、账户、课程或收费。新增页面为原创同风格内容，不冒充原参考的现有内页。

支持系统减少动态效果：禁用入场与水波、默认暂停视频，仍提供手动播放。WebGL 或媒体错误显式呈现并记录，不以静态图冒充视频。交付限制和实际验证见 .tpl/docs/VERIFICATION.md 与 MOTION.md。

设计参考与视频权利未完整核实，listed=false、redistributionAllowed=false。公开源码不构成第三方素材商业许可。源码、工具、字体和照片分别见 .tpl/docs/LICENSE.md 与 ASSETS.json。
