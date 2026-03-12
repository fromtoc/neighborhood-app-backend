import type { Metadata } from 'next';

export const metadata: Metadata = { title: '關於巷口 GoLocal' };

export default function AboutPage() {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', lineHeight: 1.8, color: '#333' }}>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem' }}>關於巷口</h1>

      <p>巷口 GoLocal 是一款以「里」為核心的在地生活平台，專為台灣社區居民打造。我們相信最即時的守望、最溫暖的互助，都來自巷口的每一位鄰居。</p>

      <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '1.5rem' }}>安全守護</h2>
      <p>居民的人身安全是巷口最重視的事。停水、停電、地震、火災、水災等緊急災情，巷口會在第一時間推播通知，讓里民即時掌握狀況、迅速應變。走失人口協尋、可疑人事物通報等鄰里守望功能，讓整個里成為彼此的安全網。</p>

      <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '1.5rem' }}>里的脈動</h2>
      <p>從里長公告、里民補助、社區活動、里投票，到垃圾車即時動態，所有與里相關的大小事都能在巷口一站掌握。不只是單向佈達，而是讓里民與里長、鄰居之間形成真正的雙向互動，凝聚社區的向心力。</p>

      <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '1.5rem' }}>鄰里互助社群</h2>
      <p>巷口的社群不只是聊天，更是一個生活互助圈。隨意閒聊、分享日常、里團購、二手贈送與交易、生活求助⋯⋯不管大事小事，鄰居之間的一句話，往往就是最即時的幫助。我們希望每個里都能形成一個彼此信賴、互相支援的社區生態。</p>

      <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '1.5rem' }}>在地店家</h2>
      <p>巷口幫你認識生活圈內的每一間店。哪間早餐店最好吃、誰提供到府收送洗衣、哪裡有到府洗車服務——里民的真實評價讓你不再踩雷。特約店家出示巷口即享優惠，附近店家有促銷也會即時推播通知。</p>
      <p>出門在外開啟遊客模式，不論是孩子突然生病需要找診所、還是想知道附近有什麼好吃的，打開巷口就能找到鄰居們推薦的好店。</p>

      <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '1.5rem' }}>即時聊聊</h2>
      <p>從整個區的公開群組、到里的聊天室、再到一對一私訊，巷口讓鄰里之間的溝通零距離。重要資訊不漏接，緊急狀況即時傳達，讓每位里民都能參與社區最即時的脈動。</p>

      <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '1.5rem' }}>版本資訊</h2>
      <p>版本：v1.0.0</p>
      <p>開發團隊：GoLocal Team</p>
      <p style={{ marginTop: '2rem', fontSize: '0.82rem', color: '#999' }}>© 2026 GoLocal Team. All rights reserved.</p>
    </div>
  );
}
