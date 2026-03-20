const express = require('express');
const app = express();

// 樂善里附近的假車輛數據（中心 25.0607, 121.3788）
const baseLat = 25.0607;
const baseLng = 121.3788;

function randomOffset() {
  return (Math.random() - 0.5) * 0.006;
}

const carTypes = ['垃圾車', '資源回收車', '廚餘回收車'];
const statuses = ['清運中', '已收運', '待命中', '行駛中'];

function generateCars() {
  const count = 8 + Math.floor(Math.random() * 5); // 8~12 台
  const cars = [];
  for (let i = 1; i <= count; i++) {
    cars.push({
      car_id: `桃環清-${String(i).padStart(3, '0')}`,
      lat: baseLat + randomOffset(),
      lng: baseLng + randomOffset(),
      car_type: carTypes[i % carTypes.length],
      addr: `龜山區模擬路${i}段${Math.floor(Math.random() * 200)}號`,
      clean_status: statuses[Math.floor(Math.random() * statuses.length)],
      status: '執勤中',
      gid: `lagi2-${String(i).padStart(3, '0')}`
    });
  }
  return cars;
}

let cachedCars = generateCars();

// 每 10 秒更新位置（模擬車輛移動）
setInterval(() => {
  cachedCars = cachedCars.map(car => ({
    ...car,
    lat: car.lat + (Math.random() - 0.5) * 0.001,
    lng: car.lng + (Math.random() - 0.5) * 0.001,
  }));
}, 10000);

app.get('/api/cars', (req, res) => {
  res.json({ cars: cachedCars, count: cachedCars.length, lastUpdate: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok (mock)', carCount: cachedCars.length });
});

app.listen(5501, '127.0.0.1', () => {
  console.log('🚛 Mock 垃圾車服務啟動 http://127.0.0.1:5501');
  console.log(`   模擬 ${cachedCars.length} 台車輛，每 10 秒更新位置`);
});
