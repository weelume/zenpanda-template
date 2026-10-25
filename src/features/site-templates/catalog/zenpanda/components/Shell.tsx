'use client';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { href } from '../routing';
import type { SiteTemplatePageProps } from '../../../types';
import { nav } from '../content/data';
import { brand } from '../config/brand';
import { useZenpandaHost } from '../host';
import { Panda } from './Panda';
import '../theme.css';
export function Roll({ children }: {
    children: string;
}) { return <span className="zp-roll"><span><span>{children}</span><span aria-hidden="true">{children}</span></span></span>; }
export function Reveal({ children, index = 0, className = '' }: {
    children: ReactNode;
    index?: number;
    className?: string;
}) { const reduced = useReducedMotion(); return <motion.div className={className} initial={reduced ? false : { opacity: 0, y: 32, filter: 'blur(4px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, amount: .15 }} transition={{ duration: .75, delay: index * .1, ease: [.2, .8, .2, 1] }}>{children}</motion.div>; }
export function Shell({ children, locale = 'zh', basePath, hero = false }: SiteTemplatePageProps & {
    children: ReactNode;
    hero?: boolean;
}) {
    const router = useRouter();
    const host = useZenpandaHost(), pathname = usePathname(), query = useSearchParams();
    const [open, setOpen] = useState(false);
    const menu = useRef<HTMLDivElement>(null), toggle = useRef<HTMLButtonElement>(null);
    const bare = (basePath.endsWith('/en') ? basePath.slice(0, -3) : basePath);
    const slug = pathname.slice(basePath.length).split('/').filter(Boolean).join('/');
    const other = locale === 'zh' ? href(bare + '/en', slug) : href(bare, slug);
    const langHref = other + (query.toString() ? '?' + query.toString() : '');
    useEffect(() => { console.debug('[zenpanda:navigation]', { pathname, locale }); }, [pathname, locale]);
    useEffect(() => { if (!open)
        return; const close = (e: KeyboardEvent) => { if (e.key === 'Escape') {
        setOpen(false);
        toggle.current?.focus();
    } if (e.key === 'Tab') {
        const items = menu.current?.querySelectorAll<HTMLAnchorElement>('a');
        if (!items?.length)
            return;
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        }
        else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    } }; const outside = (e: PointerEvent) => { if (!menu.current?.contains(e.target as Node) && !toggle.current?.contains(e.target as Node))
        setOpen(false); }; document.addEventListener('keydown', close); document.addEventListener('pointerdown', outside); menu.current?.querySelector('a')?.focus(); return () => { document.removeEventListener('keydown', close); document.removeEventListener('pointerdown', outside); }; }, [open]);
    return <div className={'zp-root ' + (hero ? 'zp-home' : '')} lang={locale === 'zh' ? 'zh-CN' : 'en'}><a className="zp-skip" href="#zp-main">{locale === 'zh' ? '跳到内容' : 'Skip to content'}</a><header className={'zp-header ' + (hero ? 'zp-header-hero' : '')}><Link className="zp-brand" href={href(basePath)} aria-label={host.brandName[locale]}>{host.logo ? <img src={host.logo} alt="" width="24" height="24"/> : <Panda />}<span>{host.brandName[locale]}</span></Link><nav className="zp-desktop" aria-label={locale === 'zh' ? '主导航' : 'Main navigation'}>{nav.map(item => <Link key={item.slug} href={href(basePath, item.slug)} aria-current={slug === item.slug ? 'page' : undefined} className="zp-nav-link"><Roll>{item.label[locale]}</Roll></Link>)}</nav><div className="zp-header-actions"><Link className="zp-language" href={langHref} hrefLang={locale === 'zh' ? 'en' : 'zh'} onClick={e => { e.preventDefault(); router.push(langHref + window.location.hash); }}>{locale === 'zh' ? 'EN' : '中文'}</Link><Link className="zp-button zp-start" href={href(basePath, 'contact')}><Roll>{locale === 'zh' ? '开始慢生活' : 'Get started'}</Roll></Link><button ref={toggle} className="zp-menu-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="zp-menu" aria-label={locale === 'zh' ? '切换导航菜单' : 'Toggle navigation menu'}>{open ? '×' : '☰'}</button></div>{open && <div ref={menu} className="zp-drawer" id="zp-menu" role="dialog" aria-label={locale === 'zh' ? '导航菜单' : 'Navigation menu'}>{[...nav, { slug: 'contact', label: { zh: '开始慢生活', en: 'Get started' } }].map(item => <Link key={item.slug} href={href(basePath, item.slug)} onClick={() => setOpen(false)}>{item.label[locale]}</Link>)}</div>}</header>{children}<footer className="zp-footer"><div className="zp-container zp-footer-grid"><div><Link className="zp-brand" href={href(basePath)}>{host.logo ? <img src={host.logo} alt="" width="24" height="24"/> : <Panda />}<span>{host.brandName[locale]}</span></Link><p>{brand.tagline[locale]}</p><small>{locale === 'zh' ? '留一些时间，给生活本来的样子。' : 'A little more room for life as it is.'}</small></div><nav aria-label={locale === 'zh' ? '页脚导航' : 'Footer navigation'}>{nav.slice(1).map(item => <Link key={item.slug} href={href(basePath, item.slug)}>{item.label[locale]}</Link>)}</nav><nav aria-label={locale === 'zh' ? '联系与政策' : 'Contact and policies'}><Link href={href(basePath, 'contact')}>{locale === 'zh' ? '联系我们' : 'Contact'}</Link><Link href={href(basePath, 'privacy')}>{locale === 'zh' ? '隐私政策' : 'Privacy'}</Link><Link href={href(basePath, 'terms')}>{locale === 'zh' ? '使用条款' : 'Terms'}</Link>{host.marketplaceHref && <Link href={host.marketplaceHref}>{host.marketplaceLabel?.[locale]}</Link>}</nav></div><div className="zp-container zp-footer-bottom"><span>© {brand.year} {host.brandName[locale]}</span>{host.filing}<span>{locale === 'zh' ? '演示网站 · 表单不发送、不保存' : 'Demo website · Forms do not send or save data'}</span></div></footer>{host.marketplaceHref && <Link className="zp-market" href={host.marketplaceHref} aria-label={host.marketplaceAriaLabel?.[locale]}>{host.lightLogo && <img src={host.lightLogo} width="24" height="24" alt=""/>}<span>{host.brandName[locale]}</span></Link>}</div>;
}
export function PageIntro({ eyebrow, title, description }: {
    eyebrow: string;
    title: string;
    description: string;
}) { return <div className="zp-page-intro zp-container"><p className="zp-eyebrow">{eyebrow}</p><h1>{title}</h1><p className="zp-lead">{description}</p></div>; }
