const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

const PORT = 5501;
const HOST = process.env.HOST || '127.0.0.1';

// --- 爬蟲設定 ---
let CONFIG = {
    COOKIE: "",
    RANDOM_FORM: "",
    MIN_INTERVAL: 10000,
    MAX_INTERVAL: 20000,
    USER_AGENT: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

let cachedCars = [];
let lastUpdate = null;
let cachedRoutingIds = [];
let routingIdsUpdatedAt = 0;
const ROUTING_IDS_TTL = 10 * 60 * 1000; // 10 分鐘
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function refreshSession() {
    console.log(`[${new Date().toLocaleTimeString()}] 正在模擬瀏覽器更新 Session...`);
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // Docker 需要
    });
    try {
        const page = await browser.newPage();
        await page.setUserAgent(CONFIG.USER_AGENT);
        await page.goto('https://route.tyoem.gov.tw/', { waitUntil: 'networkidle2', timeout: 30000 });
        const randomForm = await page.evaluate(() => document.getElementById('random_form')?.value || "");
        const cookies = await page.cookies();
        const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');

        if (cookieStr && randomForm) {
            CONFIG.COOKIE = cookieStr;
            CONFIG.RANDOM_FORM = randomForm;
            console.log(`✅ Session 更新成功`);
            return true;
        }
        return false;
    } catch (e) {
        console.error("❌ 無法獲取 Session:", e.message);
        return false;
    } finally {
        await browser.close();
    }
}

async function updateData() {
    if (!CONFIG.COOKIE || cachedCars.length === 0) {
        const success = await refreshSession();
        if (!success) return scheduleNext();
    }

    try {
        console.log(`[${new Date().toLocaleTimeString()}] 開始同步全桃園車輛數據...`);
        const headers = {
            "accept": "*/*",
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            "x-requested-with": "XMLHttpRequest",
            "user-agent": CONFIG.USER_AGENT,
            "cookie": CONFIG.COOKIE,
            "Referer": "https://route.tyoem.gov.tw/"
        };

        const now = Date.now();
        if (cachedRoutingIds.length === 0 || now - routingIdsUpdatedAt > ROUTING_IDS_TTL) {
            let allRoutingIds = [];
            for (let i = 1; i <= 13; i++) {
                const gid = `lagi2-${i.toString().padStart(3, '0')}`;
                const res = await fetch("https://route.tyoem.gov.tw/web/dataManagerAgentWeb.jsp", {
                    method: "POST", headers, body: `dcfid=lagifQueryRouteByTown&gid=${gid}&random_form=${CONFIG.RANDOM_FORM}`
                });
                const json = await res.json();
                if (json.result) json.result.forEach(r => allRoutingIds.push(r.routing_id));
                await sleep(150);
            }
            const freshIds = [...new Set(allRoutingIds)];
            if (freshIds.length > 0) {
                cachedRoutingIds = freshIds;
                routingIdsUpdatedAt = now;
                console.log(`📋 路線 ID 更新: ${freshIds.length} 條 (下次更新: ${new Date(now + ROUTING_IDS_TTL).toLocaleTimeString()})`);
            }
        }
        const uniqueIds = cachedRoutingIds;

        let rawCarData = [];
        const chunkSize = 15;
        for (let i = 0; i < uniqueIds.length; i += chunkSize) {
            const chunk = uniqueIds.slice(i, i + chunkSize);
            const results = await Promise.all(chunk.map(async (rid) => {
                try {
                    const res = await fetch("https://route.tyoem.gov.tw/web/dataManagerAgentWeb.jsp", {
                        method: "POST", headers, body: `dcfid=lagifQueryRealtimeByRoute&routing_id=${rid}&random_form=${CONFIG.RANDOM_FORM}`
                    });
                    const data = await res.json();
                    return data.result || [];
                } catch (e) { return []; }
            }));
            rawCarData.push(...results.flat());
        }

        const carMap = new Map();
        rawCarData.forEach(car => {
            if (!carMap.has(car.car_id)) {
                carMap.set(car.car_id, {
                    gid: car.gid, lng: parseFloat(car.lng), lat: parseFloat(car.lat),
                    car_type: car.car_type, addr: car.addr,
                    car_id: car.car_id, clean_status: car.clean_status, status: car.status
                });
            }
        });

        cachedCars = Array.from(carMap.values());
        lastUpdate = new Date().toISOString();
        if (cachedCars.length > 0) {
            console.log(`✅ 同步完成，共計 ${cachedCars.length} 台車輛`);
        }

    } catch (err) {
        console.error("❌ 更新失敗:", err.message);
        CONFIG.COOKIE = "";
    } finally {
        scheduleNext();
    }
}

function scheduleNext() {
    const nextInterval = Math.floor(Math.random() * (CONFIG.MAX_INTERVAL - CONFIG.MIN_INTERVAL + 1)) + CONFIG.MIN_INTERVAL;
    setTimeout(updateData, nextInterval);
}

// 啟動背景更新
updateData();

// API
app.get('/api/cars', (req, res) => {
    res.json({ cars: cachedCars, count: cachedCars.length, lastUpdate });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', carCount: cachedCars.length, lastUpdate });
});

app.listen(PORT, HOST, () => {
    console.log(`🚛 垃圾車爬蟲服務啟動 http://${HOST}:${PORT}`);
    console.log(`   /api/cars   - 車輛數據`);
    console.log(`   /health     - 健康檢查`);
});
