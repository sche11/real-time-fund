"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { isNumber, isPlainObject } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import ConfirmModal from './ConfirmModal';
import { ResetIcon, SettingsIcon } from './Icons';
import { storageStore, useStorageStore } from '../stores';
import {
  DEFAULT_FUND_TAG_THEME,
  getFundCodesFromTagRecord,
  migrateDcaPlansToScoped,
  sanitizeTagRowForStorage,
  stripLegacyTagsFromFundObject
} from '../lib/fundHelpers';

export default function SettingsModal({
  onClose,
  tempSeconds,
  setTempSeconds,
  saveSettings,
  exportLocalData,
  importFileRef,
  setImportMsg,
  onImportSuccess,
  importMsg,
  isMobile,
  containerWidth = 1200,
  setContainerWidth,
  onResetContainerWidth,
  refreshAll,
  applyViewMode,
  setFundTagRecords,
  setShowMarketIndexPc,
  setShowMarketIndexMobile,
  setShowGroupFundSearchPc,
  setShowGroupFundSearchMobile,
  showMarketIndexPc = true,
  showMarketIndexMobile = true,
  showGroupFundSearchPc = true,
  showGroupFundSearchMobile = true,
}) {
  const {
    setFunds,
    setFavorites,
    setGroups,
    setCollapsedCodes,
    setCollapsedTrends,
    setCollapsedEarnings,
    setRefreshMs,
    setHoldings,
    setGroupHoldings,
    setPendingTrades,
    setTransactions,
    setDcaPlans,
    setCustomSettings,
    setFundDailyEarnings,
  } = useStorageStore();
  const [sliderDragging, setSliderDragging] = useState(false);
  const [resetWidthConfirmOpen, setResetWidthConfirmOpen] = useState(false);
  const [localSeconds, setLocalSeconds] = useState(tempSeconds);
  const [localShowMarketIndexPc, setLocalShowMarketIndexPc] = useState(showMarketIndexPc);
  const [localShowMarketIndexMobile, setLocalShowMarketIndexMobile] = useState(showMarketIndexMobile);
  const [localShowGroupFundSearchPc, setLocalShowGroupFundSearchPc] = useState(showGroupFundSearchPc);
  const [localShowGroupFundSearchMobile, setLocalShowGroupFundSearchMobile] = useState(showGroupFundSearchMobile);
  const pageWidthTrackRef = useRef(null);

  const dedupeByCode = (list) => {
    const map = new Map();
    (Array.isArray(list) ? list : []).forEach((item) => {
      const code = String(item?.code ?? '').trim();
      if (!code) return;
      if (!map.has(code)) map.set(code, item);
    });
    return Array.from(map.values());
  };

  const cleanCodeArray = (input, allowedSet = null) => {
    const out = [];
    const seen = new Set();
    const list = Array.isArray(input) ? input : [];
    for (const x of list) {
      const code = String(x ?? '').trim();
      if (!code) continue;
      if (allowedSet && !allowedSet.has(code)) continue;
      if (seen.has(code)) continue;
      seen.add(code);
      out.push(code);
    }
    return out;
  };

  const normalizeFundDailyEarningsScoped = (source) => {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return {};
    const values = Object.values(source);
    const hasScoped = values.some((v) => v && typeof v === 'object' && !Array.isArray(v));
    if (!hasScoped && Object.keys(source).length > 0) {
      return { all: source };
    }
    return source;
  };

  const importConfigText = async (text) => {
    try {
      const data = JSON.parse(text);
      if (!isPlainObject(data)) return;

      const currentFunds = storageStore.getItem('funds', []);
      const currentFavorites = storageStore.getItem('favorites', []);
      const currentGroups = storageStore.getItem('groups', []);
      const currentCollapsed = storageStore.getItem('collapsedCodes', []);
      const currentTrends = storageStore.getItem('collapsedTrends', []);
      const currentEarnings = storageStore.getItem('collapsedEarnings', []);
      const currentPendingTrades = storageStore.getItem('pendingTrades', []);
      const currentDcaPlans = storageStore.getItem('dcaPlans', {});
      const currentGroupHoldings = storageStore.getItem('groupHoldings', {});

      let mergedFunds = currentFunds;
      let appendedCodes = [];

      if (Array.isArray(data.funds)) {
        const incomingFunds = dedupeByCode(data.funds.map(stripLegacyTagsFromFundObject));
        const existingCodes = new Set((Array.isArray(currentFunds) ? currentFunds : []).map((f) => f?.code));
        const newItems = incomingFunds.filter((f) => f && f.code && !existingCodes.has(f.code));
        appendedCodes = newItems.map((f) => f.code);
        mergedFunds = [...(Array.isArray(currentFunds) ? currentFunds : []), ...newItems];
        setFunds(mergedFunds);
      }

      if (Array.isArray(data.favorites)) {
        const fundCodeSet = new Set((mergedFunds || []).map((f) => f?.code).filter(Boolean));
        const mergedFav = cleanCodeArray([...(Array.isArray(currentFavorites) ? currentFavorites : []), ...data.favorites], fundCodeSet);
        setFavorites(new Set(mergedFav));
      }

      if (Array.isArray(data.tags)) {
        const currentTags = storageStore.getItem('tags', []);
        const fundCodeSet = new Set((mergedFunds || []).map((f) => f?.code).filter(Boolean));
        const byId = new Map((Array.isArray(currentTags) ? currentTags : []).map((r) => [String(r.id), r]));
        for (const r of data.tags) {
          if (!r || typeof r !== 'object') continue;
          const codes = getFundCodesFromTagRecord(r).filter((c) => fundCodeSet.has(c));
          const name = String(r.name ?? '').trim();
          if (!name) continue;
          const id = String(r.id ?? '').trim() || uuidv4();
          const existing = byId.get(id);
          const mergedCodes = existing
            ? [...new Set([...getFundCodesFromTagRecord(existing), ...codes])].sort()
            : codes.sort();
          const row = sanitizeTagRowForStorage({
            id,
            name,
            theme: String(r.theme ?? '').trim() || DEFAULT_FUND_TAG_THEME,
            fundCodes: mergedCodes,
          });
          if (row) byId.set(id, row);
        }
        const mergedTags = Array.from(byId.values())
          .map(sanitizeTagRowForStorage)
          .filter(Boolean)
          .sort((a, b) => String(a.id).localeCompare(String(b.id)));
        setFundTagRecords?.(mergedTags);
        storageStore.setItem('tags', JSON.stringify(mergedTags));
      }

      if (Array.isArray(data.groups)) {
        const mergedGroups = [...(Array.isArray(currentGroups) ? currentGroups : [])];
        data.groups.forEach((incomingGroup) => {
          const existingIdx = mergedGroups.findIndex((g) => g.id === incomingGroup.id);
          if (existingIdx > -1) {
            mergedGroups[existingIdx] = {
              ...mergedGroups[existingIdx],
              codes: Array.from(new Set([...mergedGroups[existingIdx].codes, ...(incomingGroup.codes || [])]))
            };
          } else {
            mergedGroups.push(incomingGroup);
          }
        });
        setGroups(mergedGroups);
      }

      if (Array.isArray(data.collapsedCodes)) {
        const mergedCollapsed = Array.from(new Set([...(Array.isArray(currentCollapsed) ? currentCollapsed : []), ...data.collapsedCodes]));
        setCollapsedCodes(new Set(mergedCollapsed));
      }

      if (Array.isArray(data.collapsedTrends)) {
        const mergedCollapsed = Array.from(new Set([...(Array.isArray(currentTrends) ? currentTrends : []), ...data.collapsedTrends]));
        setCollapsedTrends(new Set(mergedCollapsed));
      }

      if (Array.isArray(data.collapsedEarnings)) {
        const mergedCollapsed = Array.from(new Set([...(Array.isArray(currentEarnings) ? currentEarnings : []), ...data.collapsedEarnings]));
        setCollapsedEarnings(new Set(mergedCollapsed));
      }

      if (isNumber(data.refreshMs) && data.refreshMs >= 5000) {
        setRefreshMs(data.refreshMs);
        setTempSeconds?.(Math.round(data.refreshMs / 1000));
      }

      if (data.viewMode === 'card' || data.viewMode === 'list') {
        applyViewMode?.(data.viewMode);
      }

      if (isPlainObject(data.holdings)) {
        const mergedHoldings = { ...storageStore.getItem('holdings', {}), ...data.holdings };
        setHoldings(mergedHoldings);
      }

      if (isPlainObject(data.groupHoldings)) {
        const mergedGH = { ...(isPlainObject(currentGroupHoldings) ? currentGroupHoldings : {}) };
        Object.entries(data.groupHoldings).forEach(([gid, bucket]) => {
          if (!isPlainObject(bucket)) return;
          mergedGH[gid] = { ...(mergedGH[gid] || {}), ...bucket };
        });
        setGroupHoldings(mergedGH);
      }

      if (isPlainObject(data.transactions)) {
        const currentTransactions = storageStore.getItem('transactions', {});
        const mergedTransactions = { ...currentTransactions };
        Object.entries(data.transactions).forEach(([code, txs]) => {
          if (!Array.isArray(txs)) return;
          const existing = mergedTransactions[code] || [];
          const existingIds = new Set(existing.map((t) => t.id));
          const newTxs = txs.filter((t) => !existingIds.has(t.id));
          mergedTransactions[code] = [...existing, ...newTxs].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        });
        setTransactions(mergedTransactions);
      }

      if (Array.isArray(data.pendingTrades)) {
        const existingPending = Array.isArray(currentPendingTrades) ? currentPendingTrades : [];
        const incomingPending = data.pendingTrades.filter((trade) => trade && trade.fundCode);
        const fundCodeSet = new Set((mergedFunds || []).map((f) => f.code));
        const keyOf = (trade) => {
          if (trade?.id) return `id:${trade.id}`;
          return `k:${trade?.groupId || ''}:${trade?.fundCode || ''}:${trade?.type || ''}:${trade?.date || ''}:${trade?.share || ''}:${trade?.amount || ''}:${trade?.isAfter3pm ? 1 : 0}`;
        };
        const mergedPendingMap = new Map();
        existingPending.forEach((trade) => {
          if (!trade || !fundCodeSet.has(trade.fundCode)) return;
          mergedPendingMap.set(keyOf(trade), trade);
        });
        incomingPending.forEach((trade) => {
          if (!fundCodeSet.has(trade.fundCode)) return;
          mergedPendingMap.set(keyOf(trade), trade);
        });
        const mergedPending = Array.from(mergedPendingMap.values());
        setPendingTrades(mergedPending);
      }

      if (isPlainObject(data.dcaPlans)) {
        const mergedDca = { ...migrateDcaPlansToScoped(currentDcaPlans) };
        const incomingScoped = migrateDcaPlansToScoped(data.dcaPlans);
        Object.keys(incomingScoped).forEach((scope) => {
          mergedDca[scope] = {
            ...(isPlainObject(mergedDca[scope]) ? mergedDca[scope] : {}),
            ...(isPlainObject(incomingScoped[scope]) ? incomingScoped[scope] : {}),
          };
        });
        setDcaPlans(mergedDca);
      }

      if (isPlainObject(data.customSettings)) {
        try {
          const currentCustomSettings = storageStore.getItem('customSettings', {});
          const mergedSettings = {
            ...(isPlainObject(currentCustomSettings) ? currentCustomSettings : {}),
            ...data.customSettings,
          };
          setCustomSettings(mergedSettings);
          if (typeof mergedSettings.pcContainerWidth === 'number' && Number.isFinite(mergedSettings.pcContainerWidth)) {
            setContainerWidth?.(Math.min(2000, Math.max(600, mergedSettings.pcContainerWidth)));
          }
          if (typeof mergedSettings.showMarketIndexPc === 'boolean') setShowMarketIndexPc?.(mergedSettings.showMarketIndexPc);
          if (typeof mergedSettings.showMarketIndexMobile === 'boolean') setShowMarketIndexMobile?.(mergedSettings.showMarketIndexMobile);
          if (typeof mergedSettings.showGroupFundSearchPc === 'boolean') setShowGroupFundSearchPc?.(mergedSettings.showGroupFundSearchPc);
          if (typeof mergedSettings.showGroupFundSearchMobile === 'boolean') setShowGroupFundSearchMobile?.(mergedSettings.showGroupFundSearchMobile);
        } catch {}
      }

      if (isPlainObject(data.fundDailyEarnings)) {
        try {
          const incomingScoped = normalizeFundDailyEarningsScoped(data.fundDailyEarnings);
          const currentScoped = normalizeFundDailyEarningsScoped(storageStore.getItem('fundDailyEarnings', {}));
          const mergedDaily = { ...currentScoped };
          Object.entries(incomingScoped).forEach(([scope, bucket]) => {
            if (!isPlainObject(bucket)) return;
            const existingBucket = isPlainObject(mergedDaily[scope]) ? mergedDaily[scope] : {};
            const mergedBucket = { ...existingBucket };
            Object.entries(bucket).forEach(([code, list]) => {
              if (!Array.isArray(list)) return;
              const existingList = Array.isArray(mergedBucket[code]) ? mergedBucket[code] : [];
              const existingByDate = new Map(existingList.map((item) => [item.date, item]));
              list.forEach((item) => {
                if (!item || !item.date || !Number.isFinite(item.earnings)) return;
                existingByDate.set(item.date, item);
              });
              mergedBucket[code] = Array.from(existingByDate.values())
                .sort((a, b) => a.date.localeCompare(b.date));
            });
            mergedDaily[scope] = mergedBucket;
          });
          setFundDailyEarnings(mergedDaily);
        } catch {}
      }

      if (appendedCodes.length) {
        const allCodes = (mergedFunds || []).map((f) => f.code);
        await refreshAll?.(allCodes);
      }

      onImportSuccess?.();
      try {
        if (importFileRef.current) importFileRef.current.value = '';
      } catch {}
    } catch (err) {
      console.error('Import error:', err);
      setImportMsg?.('导入失败，请检查文件格式');
      setTimeout(() => setImportMsg?.(''), 4000);
      try {
        if (importFileRef.current) importFileRef.current.value = '';
      } catch {}
    }
  };

  const handleImportFileChange = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      await importConfigText(text);
    } catch (err) {
      console.error('Import error:', err);
    } finally {
      try {
        if (e.target) e.target.value = '';
      } catch {}
    }
  };

  const clampedWidth = Math.min(2000, Math.max(600, Number(containerWidth) || 1200));
  const pageWidthPercent = ((clampedWidth - 600) / (2000 - 600)) * 100;

  const updateWidthByClientX = (clientX) => {
    if (!pageWidthTrackRef.current || !setContainerWidth) return;
    const rect = pageWidthTrackRef.current.getBoundingClientRect();
    if (!rect.width) return;
    const ratio = (clientX - rect.left) / rect.width;
    const clampedRatio = Math.min(1, Math.max(0, ratio));
    const rawWidth = 600 + clampedRatio * (2000 - 600);
    const snapped = Math.round(rawWidth / 10) * 10;
    setContainerWidth(snapped);
  };

  useEffect(() => {
    if (!sliderDragging) return;
    const onPointerUp = () => setSliderDragging(false);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
    return () => {
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
    };
  }, [sliderDragging]);

  // 外部的 tempSeconds 变更时，同步到本地显示，但不立即生效
  useEffect(() => {
    setLocalSeconds(tempSeconds);
  }, [tempSeconds]);

  useEffect(() => {
    setLocalShowMarketIndexPc(showMarketIndexPc);
  }, [showMarketIndexPc]);

  useEffect(() => {
    setLocalShowMarketIndexMobile(showMarketIndexMobile);
  }, [showMarketIndexMobile]);

  useEffect(() => {
    setLocalShowGroupFundSearchPc(showGroupFundSearchPc);
  }, [showGroupFundSearchPc]);

  useEffect(() => {
    setLocalShowGroupFundSearchMobile(showGroupFundSearchMobile);
  }, [showGroupFundSearchMobile]);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose?.();
      }}
    >
      <DialogContent
        overlayClassName={`modal-overlay ${sliderDragging ? 'modal-overlay-translucent' : ''} z-[9999]`}
        className="!p-0 z-[10000]"
        showCloseButton={false}
      >
        <div className="glass card modal">
          <div className="title" style={{ marginBottom: 12 }}>
            <SettingsIcon width="20" height="20" />
            <DialogTitle asChild>
              <span>设置</span>
            </DialogTitle>
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <div className="muted" style={{ marginBottom: 8, fontSize: '0.8rem' }}>刷新频率</div>
            <div className="chips" style={{ marginBottom: 12 }}>
              {[30, 60, 120, 300].map((s) => (
                <button
                  key={s}
                  type="button"
                className={`chip ${localSeconds === s ? 'active' : ''}`}
                onClick={() => setLocalSeconds(s)}
                aria-pressed={localSeconds === s}
                >
                  {s} 秒
                </button>
              ))}
            </div>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              min="30"
              step="5"
            value={localSeconds}
            onChange={(e) => setLocalSeconds(Number(e.target.value))}
              placeholder="自定义秒数"
            />
          {localSeconds < 30 && (
              <div className="error-text" style={{ marginTop: 8 }}>
                最小 30 秒
              </div>
            )}
          </div>

          {!isMobile && setContainerWidth && (
            <div className="form-group" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <div className="muted" style={{ fontSize: '0.8rem' }}>页面宽度</div>
                {onResetContainerWidth && (
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => setResetWidthConfirmOpen(true)}
                    title="重置页面宽度"
                    style={{
                      border: 'none',
                      width: '24px',
                      height: '24px',
                      padding: 0,
                      backgroundColor: 'transparent',
                      color: 'var(--muted)',
                    }}
                  >
                    <ResetIcon width="14" height="14" />
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  ref={pageWidthTrackRef}
                  className="group relative"
                  style={{ flex: 1, height: 14, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  onPointerDown={(e) => {
                    setSliderDragging(true);
                    updateWidthByClientX(e.clientX);
                    e.currentTarget.setPointerCapture?.(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    if (!sliderDragging) return;
                    updateWidthByClientX(e.clientX);
                  }}
                >
                  <Progress value={pageWidthPercent} />
                  <div
                    className="pointer-events-none absolute top-1/2 -translate-y-1/2"
                    style={{ left: `${pageWidthPercent}%`, transform: 'translate(-50%, -50%)' }}
                  >
                    <div
                      className="h-3 w-3 rounded-full bg-primary shadow-md shadow-primary/40"
                    />
                  </div>
                </div>
                <span className="muted" style={{ fontSize: '0.8rem', minWidth: 48 }}>
                  {clampedWidth}px
                </span>
              </div>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 16 }}>
            <div className="muted" style={{ marginBottom: 8, fontSize: '0.8rem' }}>显示大盘指数</div>
            <div className="row" style={{ justifyContent: 'flex-start', alignItems: 'center' }}>
              <Switch
                checked={isMobile ? localShowMarketIndexMobile : localShowMarketIndexPc}
                className="ml-2 scale-125"
                onCheckedChange={(checked) => {
                  const nextValue = Boolean(checked);
                  if (isMobile) setLocalShowMarketIndexMobile(nextValue);
                  else setLocalShowMarketIndexPc(nextValue);
                }}
                aria-label="显示大盘指数"
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <div className="muted" style={{ marginBottom: 8, fontSize: '0.8rem' }}>显示分组内基金搜索</div>
            <div className="row" style={{ justifyContent: 'flex-start', alignItems: 'center' }}>
              <Switch
                checked={isMobile ? localShowGroupFundSearchMobile : localShowGroupFundSearchPc}
                className="ml-2 scale-125"
                onCheckedChange={(checked) => {
                  const nextValue = Boolean(checked);
                  if (isMobile) setLocalShowGroupFundSearchMobile(nextValue);
                  else setLocalShowGroupFundSearchPc(nextValue);
                }}
                aria-label="显示分组内基金搜索"
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <div className="muted" style={{ marginBottom: 8, fontSize: '0.8rem' }}>数据导出</div>
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="button" onClick={exportLocalData}>导出配置</button>
            </div>
            <div className="muted" style={{ marginBottom: 8, fontSize: '0.8rem', marginTop: 26 }}>数据导入</div>
            <div className="row" style={{ gap: 8, marginTop: 8 }}>
              <button type="button" className="button" onClick={() => importFileRef.current?.click?.()}>导入配置</button>
            </div>
            <input
              ref={importFileRef}
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={handleImportFileChange}
            />
            {importMsg && (
              <div className="muted" style={{ marginTop: 8 }}>
                {importMsg}
              </div>
            )}
          </div>

          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 24 }}>
            <button
              className="button"
              onClick={(e) => saveSettings(
                e,
                localSeconds,
                isMobile ? localShowMarketIndexMobile : localShowMarketIndexPc,
                isMobile ? localShowGroupFundSearchMobile : localShowGroupFundSearchPc,
                isMobile
              )}
              disabled={localSeconds < 30}
            >
              保存并关闭
            </button>
          </div>
        </div>
      </DialogContent>
      {resetWidthConfirmOpen && onResetContainerWidth && (
        <ConfirmModal
          title="重置页面宽度"
          message="是否重置页面宽度为默认值 1200px？"
          icon={<ResetIcon width="20" height="20" className="shrink-0 text-[var(--primary)]" />}
          confirmVariant="primary"
          onConfirm={() => {
            onResetContainerWidth();
            setResetWidthConfirmOpen(false);
          }}
          onCancel={() => setResetWidthConfirmOpen(false)}
          confirmText="重置"
        />
      )}
    </Dialog>
  );
}
