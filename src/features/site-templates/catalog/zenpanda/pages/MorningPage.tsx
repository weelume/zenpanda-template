import type { SiteTemplatePageProps } from '../../../types';
import { Article } from '../components/Article';
export default function Page(props: SiteTemplatePageProps) { return <Article {...props} slug="a-slower-morning"/>; }
