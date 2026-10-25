import Link from 'next/link';
import type { TemplateLocale } from '../../../types';
import { asset } from '../config/brand';
import { articles, rituals } from '../content/data';
import { Reveal } from './Shell';
import { href } from '../routing';
export function RitualCards({ locale, basePath }: {
    locale: TemplateLocale;
    basePath: string;
}) { return <div className="zp-grid zp-grid-three">{rituals.map((r, i) => <Reveal key={r.id} index={i}><Link className="zp-card" href={href(basePath, 'mindfulness') + '#' + r.id}><div className="zp-card-image"><img src={asset(r.image)} alt={r.title[locale]} loading="lazy" width="800" height="600"/><span className="zp-number">{r.number}</span></div><div className="zp-card-body"><p className="zp-eyebrow">{r.duration[locale]}</p><h3>{r.title[locale]}</h3><p>{r.description[locale]}</p></div></Link></Reveal>)}</div>; }
export function ArticleCards({ locale, basePath }: {
    locale: TemplateLocale;
    basePath: string;
}) { return <div className="zp-grid zp-grid-three">{articles.map((article, i) => <Reveal key={article.slug} index={i}><Link className="zp-card" href={href(basePath, 'journal/' + article.slug)}><div className="zp-card-image"><img src={asset(article.image)} alt={article.title[locale]} loading="lazy" width="800" height="600"/></div><div className="zp-card-body"><p className="zp-eyebrow">{article.category[locale]} · {article.minutes} {locale === 'zh' ? '分钟' : 'min'}</p><h3>{article.title[locale]}</h3><p>{article.intro[locale]}</p><time dateTime={article.date}>{article.date}</time></div></Link></Reveal>)}</div>; }
