/** 路径拼接保持纯函数，供服务端页面与客户端导航共同使用。 */
export const href = (basePath: string, slug = ''): string => ((basePath.endsWith('/') ? basePath.slice(0, -1) : basePath) + (slug ? '/' + slug : '')) || '/';
