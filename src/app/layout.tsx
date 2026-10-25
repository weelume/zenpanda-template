import type { ReactNode } from 'react';
import './globals.css';
export const metadata = { title: 'Zenpanda', description: '慢一点生活，明亮每一天 · Mindful living' };
export default function Layout({ children }: {
    children: ReactNode;
}) { return <html lang="zh-CN"><body>{children}</body></html>; }
