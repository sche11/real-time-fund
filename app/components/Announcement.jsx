'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ANNOUNCEMENT_KEY = 'hasClosedAnnouncement_v22';

export default function Announcement() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasClosed = localStorage.getItem(ANNOUNCEMENT_KEY);
    if (!hasClosed) {
      setIsVisible(true);
    }
  }, []);

  const handleClose = () => {
    // 清理历史 ANNOUNCEMENT_KEY
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('hasClosedAnnouncement_v') && key !== ANNOUNCEMENT_KEY) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    localStorage.setItem(ANNOUNCEMENT_KEY, 'true');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            padding: '20px',
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="glass"
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '24px',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              maxHeight: 'calc(100dvh - 40px)',
              overflow: 'hidden',
            }}
          >
            <div className="title" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 700, fontSize: '18px', color: 'var(--accent)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span>公告</span>
            </div>
            <div style={{ color: 'var(--text)', lineHeight: '1.6', fontSize: '15px', overflowY: 'auto', minHeight: 0, flex: 1, paddingRight: '4px' }}>
              <p>v1.0.1 更新内容如下：</p>
              <p>1. 移动底部导航栏动态显隐。</p>
              <p>2. 当日收益计算方式完善。</p>
              <p>3. 自定义分组交易记录数据问题。</p>
              <p>4. PC端分组左右滑动问题。</p>
              <p>5. 恢复自定义分组添加全部分组的基金到此分组。</p>
              <br/>
              <p>感谢上月以下用户对本项目赞助支持（排名不分先后）。</p>
              <p>y*w、s*、*李、l*r、钱程似锦、Y*u、*子、F、陈*n、z*g、小坏、*.、*枫、*z、aqara、Aimer、*L、**赛、**文、*彬</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                className="button"
                onClick={handleClose}
                style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center' }}
              >
                我知道了
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
