'use client';
import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { TemplateLocale } from '../../../types';
export function Breathing({ locale }: {
    locale: TemplateLocale;
}) { const reduced = useReducedMotion(), [active, setActive] = useState(false), [seconds, setSeconds] = useState(0); useEffect(() => { if (!active)
    return; console.debug('[zenpanda:breathing]', { stage: 'started', reducedMotion: reduced }); const timer = window.setInterval(() => { if (!document.hidden)
    setSeconds(s => s + 1); }, 1000); return () => window.clearInterval(timer); }, [active, reduced]); const inhale = seconds % 10 < 4; return <div className="zp-breathing"><div className={'zp-orbit ' + ((active || seconds > 0) && !reduced ? 'is-active' : '')} style={{ animationPlayState: active ? 'running' : 'paused' }}><span>{active ? (locale === 'zh' ? (inhale ? '自然吸气' : '缓缓呼气') : (inhale ? 'Breathe in' : 'Breathe out')) : (locale === 'zh' ? '此刻，在这里' : 'Here, now')}</span></div><p>{locale === 'zh' ? '跟随自己的舒适节奏，不屏息、不勉强。' : 'Follow your own comfortable pace. Do not hold or force your breath.'}</p><div className="zp-button-row"><button className="zp-button" onClick={() => setActive(!active)}>{locale === 'zh' ? (active ? '暂停练习' : '开始练习') : (active ? 'Pause practice' : 'Begin practice')}</button><button className="zp-button zp-button-light" onClick={() => { setActive(false); setSeconds(0); }}>{locale === 'zh' ? '重新开始' : 'Reset'}</button></div><p role="status">{locale === 'zh' ? '已练习' : 'Time spent'} {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</p></div>; }
