# 修改指南

品牌修改 config/brand.ts；双语文章与导航修改 content/data.ts；颜色、字体、间距、玻璃卡片和响应式修改 theme.css。视频和指针波纹修改 WaterScene.tsx，标题时序修改 HomePage.tsx 与 theme.css，新增页面同步 meta.ts 与 .tpl/template.json。三端截图使用 1440×1000、834×1180、390×844，并补测 320px。字体必须保留真实 400/700 中文与 400/600/700 西文字重。新增素材同步来源与许可。表单接入真实服务前必须显式设计隐私和异常语义。运行 typecheck、lint、test、build，再检查受影响交互。
