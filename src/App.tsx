import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, RotateCcw, Settings } from 'lucide-react';
import { calculateExpectedMove } from './lib/calculator';

export default function App() {
  const [price, setPrice] = useState<string>('');
  const [callIv, setCallIv] = useState<string>('');
  const [putIv, setPutIv] = useState<string>('');
  const [market, setMarket] = useState<'us' | 'hk' | 'a'>('us');
  
  const [expiryDate, setExpiryDate] = useState<string>('');

  const [presetDates, setPresetDates] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('presetDates');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      us: ['0417', '0618', '0918'],
      hk: ['0429', '0530', '0629'],
      a: ['0424', '0522', '0626']
    };
  });
  const [isEditingPresets, setIsEditingPresets] = useState(false);
  const [presetInput, setPresetInput] = useState('');

  useEffect(() => {
    localStorage.setItem('presetDates', JSON.stringify(presetDates));
  }, [presetDates]);

  const handleClear = () => {
    setPrice('');
    setCallIv('');
    setPutIv('');
    setExpiryDate('');
  };

  const result = useMemo(() => {
    if (!price || (!callIv && !putIv) || !expiryDate) return null;
    try {
      return calculateExpectedMove(
        parseFloat(price),
        parseFloat(callIv || putIv),
        parseFloat(putIv || callIv),
        expiryDate,
        market
      );
    } catch (err: any) {
      return { error: err.message };
    }
  }, [price, callIv, putIv, expiryDate, market]);

  return (
    <div className="h-dvh bg-zinc-950 text-zinc-50 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col max-w-md mx-auto font-sans">
      <div className="relative flex items-center justify-center mb-6 mt-2">
        <h1 className="text-xl font-medium text-zinc-200 tracking-wider">预期波动计算器</h1>
        <button
          onClick={handleClear}
          className="absolute right-0 p-2 text-zinc-500 hover:text-zinc-300 transition-colors rounded-full hover:bg-zinc-800/50"
          aria-label="清空数据"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* 输入区 */}
      <div className="space-y-4 bg-zinc-900/80 p-5 rounded-2xl border border-zinc-800/50 mb-6 shrink-0">
        
        <div className="flex items-center justify-between">
          <label className="text-zinc-400 text-sm">市场</label>
          <div className="flex gap-1 bg-zinc-950 border border-zinc-800 rounded-lg p-1 w-40">
            {(['us', 'hk', 'a'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMarket(m)}
                className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
                  market === m ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {m === 'us' ? '美股' : m === 'hk' ? '港股' : 'A股'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-zinc-400 text-sm">标的价格</label>
          <input
            type="text"
            inputMode="decimal"
            value={price}
            onChange={(e) => {
              const val = e.target.value;
              if (/^\d*\.?\d*$/.test(val)) setPrice(val);
            }}
            onFocus={(e) => e.target.select()}
            placeholder="0.00"
            className="w-32 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-right text-white focus:border-blue-500 outline-none transition-colors"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-zinc-400 text-sm">隐含波动率 (%)</label>
          <div className="flex gap-2 w-40">
            <input
              type="text"
              inputMode="decimal"
              value={callIv}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*\.?\d*$/.test(val)) setCallIv(val);
              }}
              onFocus={(e) => e.target.select()}
              placeholder="看涨"
              className="w-1/2 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-center text-white focus:border-blue-500 outline-none transition-colors"
            />
            <input
              type="text"
              inputMode="decimal"
              value={putIv}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*\.?\d*$/.test(val)) setPutIv(val);
              }}
              onFocus={(e) => e.target.select()}
              placeholder="看跌"
              className="w-1/2 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-center text-white focus:border-blue-500 outline-none transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-zinc-400 text-sm">到期日</label>
            <div className="relative flex items-center w-40">
              <input
                type="text"
                inputMode="numeric"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="MMDD"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-3 pr-10 py-2 text-right text-white focus:border-blue-500 outline-none transition-colors"
              />
              <div className="absolute right-0 top-0 bottom-0 w-10 flex items-center justify-center overflow-hidden">
                <Calendar className="w-4 h-4 text-zinc-500 pointer-events-none absolute" />
                <input 
                  type="date" 
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer [color-scheme:dark]"
                  onChange={(e) => {
                    if (e.target.value) {
                      setExpiryDate(e.target.value.replace(/-/g, ''));
                    }
                  }}
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-end h-6">
            {isEditingPresets ? (
              <div className="flex items-center gap-2 w-full justify-end">
                <input 
                  type="text" 
                  value={presetInput}
                  onChange={(e) => setPresetInput(e.target.value)}
                  placeholder="如: 0417, 0618"
                  className="bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5 text-xs text-white flex-1 outline-none focus:border-blue-500"
                />
                <button 
                  onClick={() => {
                    const newDates = presetInput.split(/[,，\s]+/).filter(d => d.trim() !== '');
                    setPresetDates(prev => ({ ...prev, [market]: newDates }));
                    setIsEditingPresets(false);
                  }} 
                  className="text-blue-400 text-xs hover:text-blue-300"
                >
                  保存
                </button>
                <button 
                  onClick={() => setIsEditingPresets(false)} 
                  className="text-zinc-500 text-xs hover:text-zinc-400"
                >
                  取消
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {presetDates[market]?.map(date => (
                  <button
                    key={date}
                    onClick={() => setExpiryDate(date)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-2 py-1 rounded transition-colors"
                  >
                    {date}
                  </button>
                ))}
                <button 
                  onClick={() => {
                    setPresetInput((presetDates[market] || []).join(', '));
                    setIsEditingPresets(true);
                  }} 
                  className="text-zinc-500 hover:text-zinc-300 p-1"
                >
                  <Settings className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 结果区 */}
      <div className="flex-1 flex flex-col min-h-0 pb-4">
        {!result ? (
          <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm border border-dashed border-zinc-800 rounded-2xl">
            输入参数查看结果
          </div>
        ) : 'error' in result ? (
          <div className="flex-1 flex items-center justify-center text-red-400 text-sm border border-dashed border-red-900/30 bg-red-500/5 rounded-2xl p-4 text-center">
            {result.error}
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center bg-zinc-900/80 p-6 rounded-2xl border border-zinc-800/50 relative">
            
            <div className="absolute top-4 right-4 text-xs text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-md">
              剩余 {result.daysToExpiry} 天
            </div>

            <div className="flex justify-between items-center gap-4 mb-8">
              <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4 flex-1">
                <div className="text-red-400 text-sm mb-1 text-center">预期低点</div>
                <div className="text-3xl font-mono font-medium text-white text-center">
                  {result.expectedLow.toFixed(2)}
                </div>
              </div>
              <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4 flex-1">
                <div className="text-emerald-400 text-sm mb-1 text-center">预期高点</div>
                <div className="text-3xl font-mono font-medium text-white text-center">
                  {result.expectedHigh.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="text-center space-y-2">
              <div className="text-zinc-400 text-sm">预期波动</div>
              <div className="text-3xl md:text-4xl font-mono font-semibold tracking-tighter flex items-center justify-center gap-3">
                {result.moveUpPercent === result.moveDownPercent ? (
                  <span className="text-white">±{result.moveUpPercent.toFixed(2)}<span className="text-xl md:text-2xl">%</span></span>
                ) : (
                  <>
                    <span className="text-red-400">-{result.moveDownPercent.toFixed(2)}<span className="text-xl">%</span></span>
                    <span className="text-zinc-600 font-light">|</span>
                    <span className="text-emerald-400">+{result.moveUpPercent.toFixed(2)}<span className="text-xl">%</span></span>
                  </>
                )}
              </div>
              <div className="text-zinc-500 font-mono text-base md:text-lg">
                {result.moveUpMoney === result.moveDownMoney 
                  ? `±${result.moveUpMoney.toFixed(2)}` 
                  : `-${result.moveDownMoney.toFixed(2)} / +${result.moveUpMoney.toFixed(2)}`}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
