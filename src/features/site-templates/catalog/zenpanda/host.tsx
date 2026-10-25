'use client';
import { createContext, useContext, type ReactNode } from 'react';
import { brand, type Bilingual } from './config/brand';
export interface ZenpandaHostConfig {
    brandName: Bilingual;
    logo?: string;
    lightLogo?: string;
    marketplaceHref?: string;
    marketplaceLabel?: Bilingual;
    marketplaceAriaLabel?: Bilingual;
    filing?: ReactNode;
}
const Context = createContext<ZenpandaHostConfig>({ brandName: brand.name });
export function ZenpandaHostProvider({ children, ...config }: ZenpandaHostConfig & {
    children: ReactNode;
}) { return <Context.Provider value={config}>{children}</Context.Provider>; }
export const useZenpandaHost = () => useContext(Context);
