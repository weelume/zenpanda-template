'use client';
import { useState, type FormEvent } from 'react';
import type { TemplateLocale } from '../../../types';
export function DemoForm({ locale, contact = false }: {
    locale: TemplateLocale;
    contact?: boolean;
}) { const [result, setResult] = useState(''); const zh = locale === 'zh'; function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); if (!e.currentTarget.reportValidity())
    return; console.debug('[zenpanda:form]', { kind: contact ? 'contact' : 'newsletter', stage: 'local-validation-passed', sent: false, saved: false }); setResult(zh ? '校验通过。本演示未发送、未保存任何信息。' : 'Validated. This demo has not sent or saved any information.'); } return <form className="zp-form" onSubmit={submit}><p className="zp-notice">{zh ? '演示表单仅做本地校验，不发送、不保存信息。' : 'Demo form: local validation only. No information is sent or saved.'}</p>{contact && <label>{zh ? '怎么称呼你' : 'Your name'}<input name="name" required maxLength={80} autoComplete="name"/></label>}<label>{zh ? '电子邮箱' : 'Email address'}<input name="email" type="email" required maxLength={254} autoComplete="email" placeholder="you@example.com"/></label>{contact && <label>{zh ? '想聊些什么' : 'Your message'}<textarea name="message" required minLength={10} maxLength={2000} rows={5}/><small>{zh ? '请填写 10–2000 个字符' : 'Please use 10–2000 characters'}</small></label>}<button className="zp-button" type="submit">{zh ? '本地校验' : 'Validate locally'}</button><p role="status" aria-live="polite">{result}</p></form>; }
