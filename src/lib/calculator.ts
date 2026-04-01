export function calculateExpectedMove(
  price: number,
  callIv: number,
  putIv: number,
  expiryDateStr: string,
  market: 'us' | 'hk' | 'a'
) {
  if (isNaN(price) || price <= 0) throw new Error("标的价格必须为正数");
  if (isNaN(callIv) || callIv < 0) throw new Error("看涨 IV 必须为非负数");
  if (isNaN(putIv) || putIv < 0) throw new Error("看跌 IV 必须为非负数");
  if (!expiryDateStr) throw new Error("请输入到期日");

  const nowUtc = new Date();
  const utcHour = nowUtc.getUTCHours();

  // User's local today
  const todayUser = new Date();
  todayUser.setHours(0, 0, 0, 0);

  // Market today adjustment (heuristic for US market)
  const todayMarket = new Date(todayUser);
  if (market === 'us' && utcHour < 5) {
    todayMarket.setDate(todayMarket.getDate() - 1);
  }

  // Parse date: support DD, MMDD, YYYYMMDD, or YYYY-MM-DD
  let year, month, day;
  const cleanDate = expiryDateStr.replace(/\D/g, '');
  if (cleanDate.length === 8) {
    year = parseInt(cleanDate.substring(0, 4));
    month = parseInt(cleanDate.substring(4, 6));
    day = parseInt(cleanDate.substring(6, 8));
  } else if (cleanDate.length === 4) {
    year = todayUser.getFullYear();
    month = parseInt(cleanDate.substring(0, 2));
    day = parseInt(cleanDate.substring(2, 4));
  } else if (cleanDate.length === 2 || cleanDate.length === 1) {
    year = todayUser.getFullYear();
    month = todayUser.getMonth() + 1;
    day = parseInt(cleanDate);
  } else {
    throw new Error("日期格式错误 (支持 DD, MMDD, YYYYMMDD)");
  }

  const expiryDate = new Date(year, month - 1, day);
  expiryDate.setHours(0, 0, 0, 0);

  const diffTime = expiryDate.getTime() - todayMarket.getTime();
  const daysToExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysToExpiry <= 0) {
    throw new Error(`到期日必须晚于今天`);
  }

  // Time factor (Square root of time)
  const timeFactor = Math.sqrt(daysToExpiry / 365.0);
  
  // Asymmetric Expected Move
  const moveUpMoney = price * (callIv / 100) * timeFactor;
  const moveDownMoney = price * (putIv / 100) * timeFactor;
  
  const moveUpPercent = (moveUpMoney / price) * 100;
  const moveDownPercent = (moveDownMoney / price) * 100;
  
  const expectedHigh = price + moveUpMoney;
  const expectedLow = price - moveDownMoney;

  return {
    currentPrice: price,
    daysToExpiry,
    moveUpPercent,
    moveDownPercent,
    moveUpMoney,
    moveDownMoney,
    expectedHigh,
    expectedLow,
    market
  };
}
