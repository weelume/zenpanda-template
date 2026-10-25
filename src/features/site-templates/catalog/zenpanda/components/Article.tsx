import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { SiteTemplatePageProps } from '../../../types';
import { articles } from '../content/data';
import { asset } from '../config/brand';
import { Shell } from './Shell';
import { href } from '../routing';
export function Article({ locale = 'zh', basePath, slug }: SiteTemplatePageProps & {
    slug: string;
}) { const a = articles.find(a => a.slug === slug); if (!a)
    notFound(); return <Shell locale={locale} basePath={basePath}><main id="zp-main"><article className="zp-article zp-container"><Link className="zp-text-link" href={href(basePath, 'journal')}>{locale === 'zh' ? '全部生活手记' : 'All journal stories'}</Link><p className="zp-eyebrow">{a.category[locale]} · <time dateTime={a.date}>{a.date}</time> · {a.minutes} {locale === 'zh' ? '分钟阅读' : 'minute read'}</p><h1>{a.title[locale]}</h1><p className="zp-lead">{a.intro[locale]}</p><img className="zp-article-cover" src={asset(a.image)} alt={a.title[locale]} width="1200" height="800"/><div className="zp-prose">{a.sections.map((s, i) => <section key={i}><h2>{s.title[locale]}</h2><p>{s.body[locale]}</p></section>)}<p className="zp-notice">{locale === 'zh' ? '本文为模板原创演示内容，仅分享日常生活灵感。' : 'Original demonstration content sharing everyday living ideas.'}</p><Link className="zp-button" href={href(basePath, 'mindfulness')}>{locale === 'zh' ? '试试一个小练习' : 'Try a small practice'}</Link></div></article></main></Shell>; }
