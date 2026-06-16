'use client';
import { isFunction, isNumber } from 'lodash';

import * as React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';

import { cn } from '@/lib/utils';

const DrawerScrollLockContext = React.createContext(null);

/**
 * 移动端滚动锁定：不再对 body 设置任何属性，
 * 仅在 Context 中提供 open 状态，然后在 DrawerOverlay 中处理禁止遮罩层的滚动。
 */
function useScrollLock(open) {
  return React.useMemo(() => (open ? { open } : null), [open]);
}

function getViewportHeight() {
  if (typeof window === 'undefined') return null;
  const visualHeight = window.visualViewport?.height;
  if (Number.isFinite(visualHeight) && visualHeight > 0) return visualHeight;
  const innerHeight = window.innerHeight;
  return Number.isFinite(innerHeight) && innerHeight > 0 ? innerHeight : null;
}

function parseVhToPx(vhStr) {
  if (isNumber(vhStr)) return Number.isFinite(vhStr) && vhStr >= 0 ? vhStr : null;
  const match = String(vhStr).match(/^([\d.]+)\s*vh$/);
  if (!match) return null;
  const ratio = Number(match[1]);
  const viewportHeight = getViewportHeight();
  if (!Number.isFinite(ratio) || viewportHeight == null) return null;
  return (viewportHeight * ratio) / 100;
}

function safePreventDefault(e) {
  if (isFunction(e?.preventDefault) && e?.cancelable !== false) e.preventDefault();
}

function stopEvent(e) {
  safePreventDefault(e);
  if (isFunction(e?.stopPropagation)) e.stopPropagation();
}

function getEventClientY(e) {
  const nativeEvent = e?.nativeEvent ?? e;
  const touches = e?.touches ?? nativeEvent?.touches ?? nativeEvent?.changedTouches;
  const clientY = e?.clientY ?? nativeEvent?.clientY ?? touches?.[0]?.clientY;
  return Number.isFinite(clientY) ? clientY : null;
}

function Drawer({ open, ...props }) {
  const scrollLock = useScrollLock(open);
  const contextValue = React.useMemo(() => ({ ...scrollLock, open: !!open }), [scrollLock, open]);
  return (
    <DrawerScrollLockContext.Provider value={contextValue}>
      <DrawerPrimitive.Root modal={false} data-slot="drawer" open={open} {...props} />
    </DrawerScrollLockContext.Provider>
  );
}

function DrawerTrigger({ ...props }) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({ ...props }) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose({ ...props }) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({ className, style, ...props }) {
  const ctx = React.useContext(DrawerScrollLockContext);
  const { open = false, ...scrollLockProps } = ctx || {};

  const overlayRef = React.useRef(null);

  React.useEffect(() => {
    const el = overlayRef.current;
    if (!el || !open) return;

    el.addEventListener('touchmove', stopEvent, { passive: false });
    el.addEventListener('wheel', stopEvent, { passive: false });

    return () => {
      el.removeEventListener('touchmove', stopEvent);
      el.removeEventListener('wheel', stopEvent);
    };
  }, [open]);

  // modal={false} 时 vaul 不渲染/隐藏 Overlay，用自定义遮罩 div 保证始终有遮罩；点击遮罩关闭
  return (
    <div
      ref={overlayRef}
      data-slot="drawer-overlay"
      data-state={open ? 'open' : 'closed'}
      role="button"
      tabIndex={-1}
      aria-label="关闭"
      className={cn(
        'fixed inset-0 z-50 cursor-default bg-[var(--drawer-overlay,rgba(0,0,0,0.45))] backdrop-blur-[6px]',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
        className
      )}
      {...scrollLockProps}
      {...props}
      style={{ touchAction: 'none', ...style }}
    />
  );
}

function DrawerContent({
  className,
  children,
  defaultHeight = '77vh',
  minHeight = '20vh',
  maxHeight = '90vh',
  ...props
}) {
  const [heightPx, setHeightPx] = React.useState(() =>
    typeof window !== 'undefined' ? parseVhToPx(defaultHeight) : null
  );
  const [isDragging, setIsDragging] = React.useState(false);
  const dragRef = React.useRef({ startY: 0, startHeight: 0 });

  const minPx = React.useMemo(() => parseVhToPx(minHeight), [minHeight]);
  const maxPx = React.useMemo(() => parseVhToPx(maxHeight), [maxHeight]);

  React.useEffect(() => {
    const px = parseVhToPx(defaultHeight);
    if (Number.isFinite(px)) setHeightPx(px);
  }, [defaultHeight]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const sync = () => {
      const max = parseVhToPx(maxHeight);
      const min = parseVhToPx(minHeight);
      setHeightPx((prev) => {
        const fallback = parseVhToPx(defaultHeight);
        if (!Number.isFinite(prev)) return Number.isFinite(fallback) ? fallback : prev;
        const clampedMax = Number.isFinite(max) ? Math.min(prev, max) : prev;
        const clampedMin = Number.isFinite(min) ? Math.max(clampedMax, min) : clampedMax;
        return Number.isFinite(clampedMin) ? clampedMin : prev;
      });
    };
    const visualViewport = window.visualViewport;
    window.addEventListener('resize', sync);
    if (isFunction(visualViewport?.addEventListener)) visualViewport.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('resize', sync);
      if (isFunction(visualViewport?.removeEventListener)) visualViewport.removeEventListener('resize', sync);
    };
  }, [defaultHeight, minHeight, maxHeight]);

  const handlePointerDown = React.useCallback(
    (e) => {
      const startY = getEventClientY(e);
      if (!Number.isFinite(startY)) return;
      safePreventDefault(e);
      setIsDragging(true);
      const fallbackHeight = parseVhToPx(defaultHeight);
      dragRef.current = {
        startY,
        startHeight: Number.isFinite(heightPx) ? heightPx : Number.isFinite(fallbackHeight) ? fallbackHeight : 0
      };
    },
    [heightPx, defaultHeight]
  );

  React.useEffect(() => {
    if (!isDragging) return;
    const move = (e) => {
      const clientY = getEventClientY(e);
      const { startY, startHeight } = dragRef.current;
      if (!Number.isFinite(clientY) || !Number.isFinite(startY) || !Number.isFinite(startHeight)) return;
      const delta = startY - clientY;
      const lower = Number.isFinite(minPx) ? minPx : 0;
      const upper = Number.isFinite(maxPx) ? maxPx : Infinity;
      const next = Math.min(upper, Math.max(lower, startHeight + delta));
      if (Number.isFinite(next)) setHeightPx(next);
    };
    const up = () => setIsDragging(false);
    document.addEventListener('mousemove', move, { passive: true });
    document.addEventListener('mouseup', up);
    document.addEventListener('touchmove', move, { passive: true });
    document.addEventListener('touchend', up);
    document.addEventListener('touchcancel', up);
    return () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', up);
      document.removeEventListener('touchcancel', up);
    };
  }, [isDragging, minPx, maxPx]);

  const contentStyle = React.useMemo(() => {
    if (!Number.isFinite(heightPx)) return undefined;
    return { height: `${heightPx}px`, maxHeight: Number.isFinite(maxPx) ? `${maxPx}px` : undefined };
  }, [heightPx, maxPx]);

  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        style={contentStyle}
        className={cn(
          'group/drawer-content fixed z-50 flex h-auto flex-col bg-[var(--card)] text-[var(--text)] border-[var(--border)]',
          'data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-[var(--radius)] data-[vaul-drawer-direction=top]:border-b drawer-shadow-top',
          'data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[88vh] data-[vaul-drawer-direction=bottom]:rounded-t-[20px] data-[vaul-drawer-direction=bottom]:border-t drawer-shadow-bottom',
          'data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=right]:sm:max-w-sm',
          'data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:border-r data-[vaul-drawer-direction=left]:sm:max-w-sm',
          'drawer-content-theme',
          className
        )}
        {...props}
      >
        <div
          role="separator"
          aria-label="拖动调整高度"
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          className={cn(
            'mx-auto mt-4 hidden h-2 w-[100px] shrink-0 rounded-full bg-[var(--muted)] cursor-n-resize touch-none select-none',
            'group-data-[vaul-drawer-direction=bottom]/drawer-content:block',
            'hover:bg-[var(--muted-foreground)/0.4] active:bg-[var(--muted-foreground)/0.6]'
          )}
        />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        'flex flex-col gap-0.5 p-4 border-b border-[var(--border)] group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center group-data-[vaul-drawer-direction=top]/drawer-content:text-center md:gap-1.5 md:text-left',
        'drawer-header-theme',
        className
      )}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }) {
  return <div data-slot="drawer-footer" className={cn('mt-auto flex flex-col gap-2 p-4', className)} {...props} />;
}

function DrawerTitle({ className, ...props }) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn('font-semibold text-[var(--text)]', className)}
      {...props}
    />
  );
}

function DrawerDescription({ className, ...props }) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn('text-sm text-[var(--muted)]', className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription
};
