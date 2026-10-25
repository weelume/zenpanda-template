import type { ComponentType } from 'react';
export type TemplateLocale = 'zh' | 'en';
export interface SiteTemplatePageProps {
    locale?: TemplateLocale;
    basePath: string;
}
export interface SiteTemplatePage {
    slug: string;
    title: string;
    localizedTitles?: Partial<Record<TemplateLocale, string>>;
    load: () => Promise<{
        default: ComponentType<SiteTemplatePageProps>;
    }>;
}
export type TemplatePlatform = 'pc' | 'miniprogram' | 'mobile';
export const TEMPLATE_PLATFORM_LABELS: Record<TemplatePlatform, string> = {
    pc: 'PC 端',
    miniprogram: '小程序',
    mobile: '手机端',
};
export interface TemplateSurface {
    locales?: readonly TemplateLocale[];
    id: string;
    name: string;
    platform: TemplatePlatform;
    pages: SiteTemplatePage[];
}
export type TemplateDevice = 'desktop' | 'tablet' | 'mobile';
export interface TemplateScreenshot {
    src: string;
    alt: string;
    device?: TemplateDevice;
    width?: number;
    height?: number;
}
export type TemplatePresentation = Omit<SiteTemplate, 'surfaces'> & {
    category: string;
    surfaces: Array<Omit<TemplateSurface, 'pages'> & {
        pages: Array<Pick<SiteTemplatePage, 'slug' | 'title'>>;
    }>;
};
export interface SiteTemplate {
    id: string;
    gitUrl?: string;
    name: string;
    localizedNames?: Partial<Record<TemplateLocale, string>>;
    sceneId: string;
    listed: boolean;
    tags: string[];
    summary: string;
    accentColor: string;
    cover: string;
    screenshots: [
        TemplateScreenshot,
        ...TemplateScreenshot[]
    ];
    surfaces: TemplateSurface[];
}
