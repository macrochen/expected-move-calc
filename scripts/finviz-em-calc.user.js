// ==UserScript==
// @name         预期波动计算器 (Delta ATM 标定 + 远期价格修正版)
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  利用 0.5 Delta 定位远期期权 ATM 行权价，并以其为中心点计算真实预期波动
// @match        *://finviz.com/stock.ashx*
// @match        *://finviz.com/stock*
// @match        *://*.finviz.com/stock*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function calculateExpectedMove(price, callIv, putIv, expiryDateStr, market = 'us', forwardPrice = null) {
        if (isNaN(price) || price <= 0) throw new Error("标的价格必须为正数");
        if (isNaN(callIv) || callIv < 0) throw new Error("看涨 IV 必须为非负数");
        if (isNaN(putIv) || putIv < 0) throw new Error("看跌 IV 必须为非负数");
        if (!expiryDateStr) throw new Error("请输入到期日");

        const nowUtc = new Date();
        const todayMarket = new Date();
        todayMarket.setHours(0, 0, 0, 0);
        if (market === 'us' && nowUtc.getUTCHours() < 5) {
            todayMarket.setDate(todayMarket.getDate() - 1);
        }

        const cleanDate = expiryDateStr.toString().replace(/\D/g, '');
        const year = parseInt(cleanDate.substring(0, 4));
        const month = parseInt(cleanDate.substring(4, 6));
        const day = parseInt(cleanDate.substring(6, 8));

        const expiryDate = new Date(year, month - 1, day);
        expiryDate.setHours(0, 0, 0, 0);

        const daysToExpiry = Math.ceil((expiryDate.getTime() - todayMarket.getTime()) / (1000 * 60 * 60 * 24));
        if (daysToExpiry <= 0) throw new Error(`到期日必须晚于今天`);

        const timeFactor = Math.sqrt(daysToExpiry / 365.0);
        
        const centerPrice = (forwardPrice !== null && !isNaN(forwardPrice) && forwardPrice > 0) ? forwardPrice : price;

        const moveUpMoney = centerPrice * (callIv / 100) * timeFactor;
        const moveDownMoney = centerPrice * (putIv / 100) * timeFactor;

        return {
            centerPrice: centerPrice,
            expectedHigh: centerPrice + moveUpMoney,
            expectedLow: centerPrice - moveDownMoney,
            moveUpMoney,
            moveDownMoney
        };
    }

    function createFloatingUI() {
        if (document.getElementById('em-calc-container')) return;

        const container = document.createElement('div');
        container.id = 'em-calc-container';
        container.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            z-index: 9999;
            font-family: Arial, sans-serif;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border-radius: 8px;
            background: #1e2024;
            color: #d1d5db;
            border: 1px solid #374151;
            padding: 16px;
            min-width: 240px;
        `;

        const button = document.createElement('button');
        button.innerText = '计算预期波动';
        button.style.cssText = `
            width: 100%;
            padding: 8px 12px;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            margin-bottom: 10px;
        `;

        const resultBox = document.createElement('div');
        resultBox.id = 'em-calc-result';
        resultBox.style.cssText = 'font-size: 13px; line-height: 1.6; display: none;';

        button.addEventListener('click', () => {
            try {
                const priceMatch = document.body.innerText.match(/Last Close\s*(\d+\.\d+)/);
                if (!priceMatch) throw new Error("无法获取当前正股价格");
                const price = parseFloat(priceMatch[1]);

                const expirySelect = document.querySelector('select');
                const rawExpiry = expirySelect ? expirySelect.options[expirySelect.selectedIndex].text : "08/21/2026";
                const [month, day, year] = rawExpiry.split('/');
                const expiryDateStr = `${year}${month}${day}`;

                let atmStrike = 0;
                let callIv = 0;
                let putIv = 0;
                let atmCallDelta = 0;
                let minDeltaDiff = Infinity; 

                const trs = document.querySelectorAll('tr');
                trs.forEach(tr => {
                    const tds = tr.querySelectorAll('td');
                    if (tds.length >= 17) {
                        const strikeText = tds[8].innerText.trim();
                        const strikeVal = parseFloat(strikeText);
                        const callDeltaText = tds[2].innerText.trim();
                        const currentCallDelta = parseFloat(callDeltaText);

                        if (!isNaN(strikeVal) && !isNaN(currentCallDelta)) {
                            const deltaDiff = Math.abs(currentCallDelta - 0.5);
                            if (deltaDiff < minDeltaDiff) {
                                minDeltaDiff = deltaDiff;
                                atmStrike = strikeVal;
                                atmCallDelta = currentCallDelta;
                                callIv = parseFloat(tds[1].innerText.replace('%', ''));
                                putIv = parseFloat(tds[11].innerText.replace('%', ''));
                            }
                        }
                    }
                });

                if (minDeltaDiff === Infinity) throw new Error("无法定位期权数据行，请确认页面已完全加载");
                if (isNaN(callIv) || isNaN(putIv)) throw new Error(`成功定位 Strike ${atmStrike}，但 IV 解析失败`);

                const res = calculateExpectedMove(price, callIv, putIv, expiryDateStr, 'us', atmStrike);

                resultBox.style.display = 'block';
                resultBox.innerHTML = `
                    <div style="margin-bottom: 8px; border-bottom: 1px solid #374151; padding-bottom: 8px;">
                        <div><strong>标的现价:</strong> ${price.toFixed(2)}</div>
                        <div style="color: #60a5fa;"><strong>远期中心点 (ATM):</strong> ${atmStrike.toFixed(2)} (Delta: ${atmCallDelta.toFixed(4)})</div>
                        <div><strong>ATM IV:</strong> C: ${callIv.toFixed(2)}% | P: ${putIv.toFixed(2)}%</div>
                    </div>
                    <div style="color: #10b981;"><strong>预期上界:</strong> ${res.expectedHigh.toFixed(2)} (+${res.moveUpMoney.toFixed(2)})</div>
                    <div style="color: #ef4444;"><strong>预期下界:</strong> ${res.expectedLow.toFixed(2)} (-${res.moveDownMoney.toFixed(2)})</div>
                `;
            } catch (err) {
                resultBox.style.display = 'block';
                resultBox.innerHTML = `<span style="color: #ef4444;">计算出错: ${err.message}</span>`;
            }
        });

        container.appendChild(button);
        container.appendChild(resultBox);
        document.body.appendChild(container);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createFloatingUI);
    } else {
        createFloatingUI();
    }
})();
