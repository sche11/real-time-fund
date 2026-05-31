'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { Switch } from '@/components/ui/switch';
import ConfirmModal from './ConfirmModal';
import SuccessModal from './SuccessModal';
import SyncPersonalSettingsModal from './SyncPersonalSettingsModal';
import { CloseIcon, DragIcon, RefreshIcon, ResetIcon, SettingsIcon } from './Icons';
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";


/**
 * 移动端表格个性化设置弹框（底部抽屉，基于 Drawer 组件）
 * @param {Object} props
 * @param {boolean} props.open - 是否打开
 * @param {() => void} props.onClose - 关闭回调
 * @param {Array<{id: string, header: string}>} props.columns - 非冻结列（id + 表头名称）
 * @param {Record<string, boolean>} [props.columnVisibility] - 列显示状态映射（id => 是否显示）
 * @param {(newOrder: string[]) => void} props.onColumnReorder - 列顺序变更回调
 * @param {(id: string, visible: boolean) => void} props.onToggleColumnVisibility - 列显示/隐藏切换回调
 * @param {() => void} props.onResetColumnOrder - 重置列顺序回调
 * @param {() => void} props.onResetColumnVisibility - 重置列显示/隐藏回调
 * @param {boolean} [props.showFullFundName] - 是否展示完整基金名称
 * @param {(show: boolean) => void} [props.onToggleShowFullFundName] - 切换是否展示完整基金名称回调
 * @param {Array<{id: string, name: string, description?: string}>} [props.syncOptions] - 可同步目标分组
 * @param {string} [props.currentGroupName] - 当前分组名称
 * @param {(targetIds: string[]) => void} [props.onSyncSettings] - 同步当前设置至目标分组
 * @param {() => void} [props.onSyncSuccess] - 同步成功后的外部提示回调
 */
function MobileSettingReorderItem({
  item,
  index,
  columnVisibility,
  onToggleColumnVisibility,
  setIsReordering,
}) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      key={item.id || `col-${index}`}
      value={item}
      className="mobile-setting-item glass"
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      onDragStart={() => setIsReordering(true)}
      onDragEnd={() => setIsReordering(false)}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 35,
        mass: 1,
        layout: { duration: 0.2 },
      }}
      style={{ touchAction: 'pan-y' }}
      dragListener={false}
      dragControls={dragControls}
    >
      <div
        className="drag-handle"
        style={{
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          color: 'var(--muted)',
          touchAction: 'none',
        }}
        onPointerDown={(e) => {
          dragControls.start(e);
        }}
        role="button"
        tabIndex={0}
        aria-label="拖拽排序"
      >
        <DragIcon width="18" height="18" />
      </div>
      <div style={{ flex: 1, fontSize: '14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span>{item.header}</span>
        {item.id === 'totalChangePercent' && (
          <span className="muted" style={{ fontSize: '12px' }}>
            估值涨幅与持有收益的汇总
          </span>
        )}
        {item.id === 'relatedSector' && (
          <span className="muted" style={{ fontSize: '12px' }}>
            需登录账号
          </span>
        )}
      </div>
      {onToggleColumnVisibility && (
        <Tooltip>
<TooltipTrigger asChild>
<Switch
          checked={columnVisibility?.[item.id] !== false}
          onCheckedChange={(checked) => {
            onToggleColumnVisibility(item.id, !!checked);
          }}
          
        />
</TooltipTrigger>
<TooltipContent>
<p>{columnVisibility?.[item.id] === false ? '显示' : '隐藏'}</p>
</TooltipContent>
</Tooltip>
      )}
    </Reorder.Item>
  );
}

export default function MobileSettingModal({
  open,
  onClose,
  columns = [],
  columnVisibility,
  onColumnReorder,
  onToggleColumnVisibility,
  onResetColumnOrder,
  onResetColumnVisibility,
  showFullFundName,
  onToggleShowFullFundName,
  syncOptions = [],
  currentGroupName = '当前',
  onSyncSettings,
  onSyncSuccess,
}) {
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncSuccessOpen, setSyncSuccessOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setResetConfirmOpen(false);
      setSyncModalOpen(false);
      setSyncSuccessOpen(false);
    }
  }, [open]);

  const handleReorder = (newItems) => {
    const newOrder = newItems.map((item) => item.id);
    onColumnReorder?.(newOrder);
  };

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={(v) => {
          if (!v) onClose();
        }}
        direction="bottom"
        handleOnly={isReordering}
      >
        <DrawerContent
          className="glass"
          defaultHeight="77vh"
          minHeight="40vh"
          maxHeight="90vh"
        >
          <DrawerHeader className="mobile-setting-header flex-row items-center justify-between gap-2 py-5 pt-5 text-base font-semibold">
            <div className="flex min-w-0 items-center gap-2.5">
              <DrawerTitle className="flex items-center gap-2.5 text-left">
                <SettingsIcon width="20" height="20" />
                <span>个性化设置</span>
              </DrawerTitle>
              {onSyncSettings && (
                <button
                  type="button"
                  onClick={() => setSyncModalOpen(true)}
                  className="button secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    height: 28,
                    padding: '0 10px',
                    borderRadius: 999,
                    fontSize: 12,
                    background: 'rgba(255,255,255,0.06)',
                    color: 'var(--primary)',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <RefreshIcon width="14" height="14" />
                  同步
                </button>
              )}
            </div>
            <Tooltip>
<TooltipTrigger asChild>
<DrawerClose
              className="icon-button border-none bg-transparent p-1"
              
              style={{ borderColor: 'transparent', backgroundColor: 'transparent' }}
            >
              <CloseIcon width="20" height="20" />
            </DrawerClose>
</TooltipTrigger>
<TooltipContent>
<p>关闭</p>
</TooltipContent>
</Tooltip>
          </DrawerHeader>

          <div className="mobile-setting-body flex flex-1 flex-col overflow-y-auto">
            {onToggleShowFullFundName && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom: '1px solid var(--border)',
                  marginBottom: 16,
                }}
              >
                <span style={{ fontSize: '14px' }}>展示完整基金名称</span>
                <Tooltip>
<TooltipTrigger asChild>
<Switch
                  checked={!!showFullFundName}
                  onCheckedChange={(checked) => {
                    onToggleShowFullFundName?.(!!checked);
                  }}
                  
                />
</TooltipTrigger>
<TooltipContent>
<p>{showFullFundName ? '关闭' : '开启'}</p>
</TooltipContent>
</Tooltip>
              </div>
            )}
            <h3 className="mobile-setting-subtitle">表头设置</h3>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
                gap: 8,
              }}
            >
              <p className="muted" style={{ fontSize: '13px', margin: 0 }}>
                拖拽调整列顺序
              </p>
              {(onResetColumnOrder || onResetColumnVisibility) && (
                <Tooltip>
<TooltipTrigger asChild>
<button
                  className="icon-button"
                  onClick={() => setResetConfirmOpen(true)}
                  
                  style={{
                    border: 'none',
                    width: '28px',
                    height: '28px',
                    backgroundColor: 'transparent',
                    color: 'var(--muted)',
                    flexShrink: 0,
                  }}
                >
                  <ResetIcon width="16" height="16" />
                </button>
</TooltipTrigger>
<TooltipContent>
<p>重置表头设置</p>
</TooltipContent>
</Tooltip>
              )}
            </div>
            {columns.length === 0 ? (
              <div className="muted" style={{ textAlign: 'center', padding: '24px 0', fontSize: '14px' }}>
                暂无可配置列
              </div>
            ) : (
              <Reorder.Group
                axis="y"
                values={columns}
                onReorder={handleReorder}
                className="mobile-setting-list"
                layoutScroll
                style={{ touchAction: 'pan-y' }}
              >
                <AnimatePresence mode="popLayout">
                  {columns.map((item, index) => (
                    <MobileSettingReorderItem
                      key={item.id || `col-${index}`}
                      item={item}
                      index={index}
                      columnVisibility={columnVisibility}
                      onToggleColumnVisibility={onToggleColumnVisibility}
                      setIsReordering={setIsReordering}
                    />
                  ))}
                </AnimatePresence>
              </Reorder.Group>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <AnimatePresence>
        {resetConfirmOpen && (
          <Tooltip>
<TooltipTrigger asChild>
<ConfirmModal
            key="mobile-reset-confirm"
            
            message="是否重置表头顺序和显示/隐藏为默认值？"
            icon={<ResetIcon width="20" height="20" className="shrink-0 text-[var(--primary)]" />}
            confirmVariant="primary"
            onConfirm={() => {
              onResetColumnOrder?.();
              onResetColumnVisibility?.();
              setResetConfirmOpen(false);
            }}
            onCancel={() => setResetConfirmOpen(false)}
            confirmText="重置"
          />
</TooltipTrigger>
<TooltipContent>
<p>重置表头设置</p>
</TooltipContent>
</Tooltip>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {syncModalOpen && (
          <SyncPersonalSettingsModal
            open={syncModalOpen}
            onClose={() => setSyncModalOpen(false)}
            options={syncOptions}
            sourceName={currentGroupName}
            onConfirm={(targetIds) => {
              const result = onSyncSettings?.(targetIds);
              if (result !== false) {
                setSyncModalOpen(false);
                if (onSyncSuccess) onSyncSuccess();
                else setSyncSuccessOpen(true);
              }
              return result;
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {syncSuccessOpen && typeof document !== 'undefined' && createPortal(
          <SuccessModal
            message="同步成功"
            onClose={() => setSyncSuccessOpen(false)}
            overlayStyle={{ zIndex: 10004 }}
            cardStyle={{ maxWidth: '420px', width: '90vw', zIndex: 10005 }}
          />,
          document.body,
        )}
      </AnimatePresence>
    </>
  );
}
