window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});// ==========================================
// PakePlus 抖音桌面版增强脚本
// 核心：保留防外跳 + 隐藏干扰 + 防暂停 + SPA适配
// ==========================================

// ---------- 1. 基础防外跳（保留你原来的核心逻辑） ----------
const hookClick = (e) => {
    const origin = e.target.closest('a');
    if (!origin || !origin.href) return;

    // 兼容 base target="_blank" 和 a 标签自带 target="_blank" 的情况
    const isBaseTargetBlank = document.querySelector('head base[target="_blank"]');
    if (origin.target === '_blank' || isBaseTargetBlank) {
        e.preventDefault();
        // 对于非抖音域名的外部链接，才允许跳出；站内链接强制在当前窗口导航
        if (origin.href.includes('douyin.com')) {
            location.href = origin.href;
        } else {
            // 外部链接（如 GitHub 等）仍然交给系统浏览器处理，避免应用内迷路
            window.open(origin.href, '_blank');
        }
    }
};

// 拦截 window.open，防止脚本弹窗打破单窗口体验
const originalWindowOpen = window.open;
window.open = function (url, target, features) {
    if (url && url.includes('douyin.com')) {
        location.href = url;
    } else {
        originalWindowOpen.call(window, url, target, features);
    }
};

document.addEventListener('click', hookClick, { capture: true });

// ---------- 2. 隐藏干扰元素（CSS 注入） ----------
// 抖音网页版改版频繁，这里放一些相对稳定的“高频干扰”选择器
// 如果未来某些元素又出现了，可以把新选择器加进 hideSelectors 数组
const hideSelectors = [
    // 登录弹窗的遮罩与容器（桌面端经常反复弹）
    '[class*="login-mask"]',
    '[class*="login-container"]',
    '[class*="login-guide"]',
    // 顶部“打开APP”或“下载客户端”的悬浮条
    '[class*="open-app"]',
    '[class*="download-guide"]',
    // 视频周围的“相关推荐”小广告卡片（部分版本）
    '[class*="ad-card"]',
    '[class*="promotion-card"]',
];

const style = document.createElement('style');
style.id = 'pakeplus-douyin-clean-style';
style.textContent = hideSelectors.map(s => `${s} { display: none !important; }`).join('\n');
document.head.appendChild(style);

// 用 MutationObserver 监听后续动态插入的广告节点，避免轮询消耗性能
const cleanObserver = new MutationObserver(() => {
    // 样式表已经生效，新插入的同名元素会自动被隐藏，这里无需重复操作
    // 保留观察者是为了将来可以处理“必须用 JS 移除”的顽固弹窗
});
cleanObserver.observe(document.body, { childList: true, subtree: true });


// ---------- 3. 防止挂机自动暂停（抖音桌面端核心痛点） ----------
// 原理：拦截 video 元素的原生 pause 方法，但通过事件监听区分“用户手动暂停”和“页面自动暂停”
let isManualPause = false;

// 在捕获阶段监听用户可能触发的暂停操作（点击播放器或按空格键）
document.addEventListener('click', (e) => {
    if (e.target.closest('video') || e.target.closest('[class*="player"]')) {
        isManualPause = true;
        setTimeout(() => { isManualPause = false; }, 1000);
    }
}, { capture: true });

document.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.code === 'Space') {
        isManualPause = true;
        setTimeout(() => { isManualPause = false; }, 1000);
    }
}, { capture: true });

// 劫持 HTMLMediaElement.prototype.pause
const originalPause = HTMLMediaElement.prototype.pause;
HTMLMediaElement.prototype.pause = function () {
    // 如果是用户主动暂停，放行；如果是页面脚本试图自动暂停，拦截
    if (isManualPause) {
        return originalPause.call(this);
    }
    console.log('[PakePlus] 拦截自动暂停');
    return Promise.resolve();
};

// 伪造页面可见性与焦点，对抗抖音的“闲置节能”检测
Object.defineProperty(document, 'hidden', { get: () => false });
Object.defineProperty(document, 'visibilityState', { get: () => 'visible' });
document.hasFocus = () => true;

// 定时发送微弱的活跃信号（随机间隔，降低被行为检测的概率）
const keepAlive = () => {
    if (!document.hidden) {
        document.dispatchEvent(new Event('mousemove', { bubbles: true }));
    }
    // 使用随机间隔（20-40秒），避免固定周期特征
    setTimeout(keepAlive, 20000 + Math.random() * 20000);
};
setTimeout(keepAlive, 30000); // 启动后延迟 30 秒再开始，避开页面初始加载


// ---------- 4. SPA 路由适配 ----------
// 抖音是单页应用，切换页面时 URL 会变但不会刷新。用 History API 和 popstate 监听变化
const onRouteChange = () => {
    // 路由切换时，检查样式是否还在（防止被部分页面逻辑移除）
    if (!document.getElementById('pakeplus-douyin-clean-style')) {
        document.head.appendChild(style);
    }
};

// 劫持 pushState 和 replaceState
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;
history.pushState = function (...args) {
    originalPushState.apply(history, args);
    onRouteChange();
};
history.replaceState = function (...args) {
    originalReplaceState.apply(history, args);
    onRouteChange();
};
window.addEventListener('popstate', onRouteChange);


// ---------- 5. 禁止右键菜单（可选，纯桌面沉浸体验） ----------
// 如果你需要用到右键复制链接或检查元素，把下面这行注释掉即可
document.addEventListener('contextmenu', e => e.preventDefault());