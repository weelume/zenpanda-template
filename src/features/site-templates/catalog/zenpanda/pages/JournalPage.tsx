import type { SiteTemplatePageProps } from '../../../types';
import { Shell, PageIntro } from '../components/Shell';
import { ArticleCards } from '../components/Cards';
export default function JournalPage({ locale = 'zh', basePath }: SiteTemplatePageProps) { return <Shell locale={locale} basePath={basePath}><main id="zp-main"><PageIntro eyebrow="JOURNAL · 03" title={locale === 'zh' ? '一些慢慢写下的生活' : 'Notes on a slower kind of life'} description={locale === 'zh' ? '关于清晨、自然和简单日常的小小记录。找一篇喜欢的，慢慢读。' : 'Small observations on mornings, nature, and ordinary days. Find a story and take your time.'}/><section className="zp-container zp-section zp-section-topless"><ArticleCards locale={locale} basePath={basePath}/></section></main></Shell>; }
