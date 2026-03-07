export const tw = {
  title: 'AU Payslip Checker',
  rate: '基本時薪',
  on: 'ON',
  day: '星期',
  start: '上班打卡',
  end: '下班打卡',
  break: '無薪休息',
  holiday: '國定假日',
  summary: '薪資總覽',
  ord: '普通',
  ot: '加班 (1.5x)',
  hol: '假日 (2x)',
  gross: '稅前總額',
  super: '退休金 (12%)',
  details: '每日時數',
  fairwork: '造訪 Fair Work 官網',
  howItWorks: '計算規則',
  note1: '普通：每日最高 7.6 小時。',
  note2: '加班：每日超過 7.6 小時部分。',
  note3: '無薪休息：固定扣除 0.5 小時用餐時間。',
  privacy: '數據不離身。僅在本地瀏覽器計算。'
};

export type Translation = typeof tw;
