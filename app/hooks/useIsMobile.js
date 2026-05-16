import { useState, useEffect } from 'react';

/**
 * 监听是否为移动端 (<= 640px)
 * 采用标准 useState + useEffect 模式，保证 SSR 与客户端首次渲染一致（始终返回 false），
 * 在 hydration 完成后立刻检测并更新状态，彻底避免 Next.js Hydration failed 报错。
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(max-width: 640px)');
    
    // 初始化设置
    setIsMobile(mediaQuery.matches);

    const handler = (event) => {
      setIsMobile(event.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, []);

  return isMobile;
}
