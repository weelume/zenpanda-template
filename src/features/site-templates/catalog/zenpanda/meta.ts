import type { SiteTemplate, TemplateScreenshot } from '../../types';
const shots: TemplateScreenshot[] = (['desktop', 'tablet', 'mobile'] as const).flatMap(device => ['home', 'mindfulness', 'journal', 'contact'].map(page => ({ src: '/templates/zenpanda/screenshots/' + device + '-' + page + '.webp', alt: 'Zenpanda ' + device + ' ' + page, device, width: device === 'desktop' ? 1425 : device === 'tablet' ? 819 : 375, height: device === 'desktop' ? 990 : device === 'tablet' ? 1159 : 812 })));
export const zenpandaTemplate: SiteTemplate = { id: 'zenpanda', gitUrl: 'https://github.com/weelume/zenpanda-template', name: 'Zenpanda · 禅意慢生活', localizedNames: { en: 'Zenpanda · Mindful living' }, sceneId: 'corporate-site', listed: false, tags: ['慢生活', '互动水波', '视频场景', '双语', 'PC / iPad / H5'], summary: '熊猫泛舟视频、互动水面和逐字标题组成的禅意慢生活网站，含正念练习、自然、手记、社区和联系。', accentColor: '#398b93', cover: '/templates/zenpanda/screenshots/desktop-home.webp', screenshots: [shots[0], ...shots.slice(1)], surfaces: [{ id: 'site', name: '慢生活官网', platform: 'pc', locales: ['zh', 'en'], pages: [
                { slug: "", title: "首页", localizedTitles: { en: "Home" }, load: () => import('./pages/HomePage') },
                { slug: "about", title: "我们的理念", localizedTitles: { en: "About" }, load: () => import('./pages/AboutPage') },
                { slug: "mindfulness", title: "正念练习", localizedTitles: { en: "Mindfulness" }, load: () => import('./pages/MindfulnessPage') },
                { slug: "nature", title: "走进自然", localizedTitles: { en: "Nature" }, load: () => import('./pages/NaturePage') },
                { slug: "journal", title: "生活手记", localizedTitles: { en: "Journal" }, load: () => import('./pages/JournalPage') },
                { slug: "journal/a-slower-morning", title: "慢慢开始清晨", localizedTitles: { en: "A slower morning" }, load: () => import('./pages/MorningPage') },
                { slug: "journal/listen-to-the-trees", title: "听见树的声音", localizedTitles: { en: "Listen to the trees" }, load: () => import('./pages/TreesPage') },
                { slug: "journal/room-for-less", title: "给生活留白", localizedTitles: { en: "Room for less" }, load: () => import('./pages/SpacePage') },
                { slug: "community", title: "慢生活社区", localizedTitles: { en: "Community" }, load: () => import('./pages/CommunityPage') },
                { slug: "contact", title: "联系", localizedTitles: { en: "Contact" }, load: () => import('./pages/ContactPage') },
                { slug: "privacy", title: "隐私政策", localizedTitles: { en: "Privacy" }, load: () => import('./pages/PrivacyPage') },
                { slug: "terms", title: "使用条款", localizedTitles: { en: "Terms" }, load: () => import('./pages/TermsPage') }
            ] }] };
