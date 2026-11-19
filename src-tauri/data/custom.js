window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});const hookClick = (e) => {
    // 1. 先确认点到的是 <a>，不是按钮、空白、输入框等
    const origin = e.target?.closest?.('a')
    const href = origin?.href
    if (!href) return

    // 2. || 短路：显式 _blank 时，右边的 base 查询不会执行
    if (
        origin.target === '_blank' ||
        document.head?.querySelector('base[target="_blank"]')
    ) {
        e.preventDefault()
        location.href = href
    }
}