// The crosshair of the Live markets example. While the pointer is over the chart, this reads where it
// is about thirty times a second and says which candle that is. The main function writes `series`,
// so this one knows what is on the chart without drawing anything.
({ data, pointer, nowMs }) => {
  const PLOT = { x: 546, y: 330, w: 830, h: 430 };
  const TIP = { w: 256, h: 82 };
  const FRAME_MS = 33;
  const UP = '#2ee6a6';
  const DOWN = '#ff5c7a';

  const hidden = {
    o: 0,
    x: PLOT.x,
    dot_x: PLOT.x,
    dot_y: PLOT.y,
    tip_x: PLOT.x,
    tip_y: PLOT.y,
    price_y: PLOT.y,
    info_y: PLOT.y,
    price: '',
    info: '',
    price_c: UP,
  };
  const series = data.series;
  if (!data.hover) return { data: { cross: hidden }, wakeAt: null };
  const again = nowMs + FRAME_MS;
  if (!pointer || !series?.n) return { data: { cross: hidden }, wakeAt: again };

  const inside =
    pointer.x >= PLOT.x && pointer.x <= PLOT.x + PLOT.w && pointer.y >= PLOT.y && pointer.y <= PLOT.y + PLOT.h;
  if (!inside) return { data: { cross: hidden }, wakeAt: again };

  // The nearest candle, and where the chart drew it.
  const along = Math.max(0, Math.min(1, (pointer.x - PLOT.x) / series.inner));
  const index = series.centred
    ? Math.min(series.n - 1, Math.floor(along * series.n))
    : Math.round(along * (series.n - 1));
  const close = series.closes[index];
  const x = series.centred
    ? ((index + 0.5) / series.n) * series.inner
    : (index / (series.n - 1)) * series.inner;
  const y = 6 + ((series.top - close) / (series.top - series.bottom)) * (PLOT.h - 78);

  const group = (digits) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const places = close >= 10 ? 2 : close >= 1 ? 4 : 5;
  const [whole, part] = close.toFixed(places).split('.');
  const move = series.first ? ((close - series.first) / series.first) * 100 : 0;
  const at = new Date((series.last - (series.n - 1 - index) * series.step) * 1000);
  const MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
  const two = (value) => String(value).padStart(2, '0');
  const when = `${MONTHS[at.getMonth()]} ${at.getDate()} ${two(at.getHours())}:${two(at.getMinutes())}`;

  // The label stays on the chart, on whichever side has room.
  const canvasX = PLOT.x + x;
  const canvasY = PLOT.y + y;
  const tipX = canvasX + 18 + TIP.w > PLOT.x + PLOT.w ? canvasX - 18 - TIP.w : canvasX + 18;
  const tipY = Math.max(PLOT.y + 4, Math.min(PLOT.y + PLOT.h - TIP.h - 4, canvasY - TIP.h / 2));
  return {
    data: {
      cross: {
        o: 1,
        x: canvasX - 1,
        dot_y: canvasY - 7,
        dot_x: canvasX - 7,
        tip_x: tipX,
        tip_y: tipY,
        price_y: tipY + 6,
        info_y: tipY + 46,
        price: group(whole) + (part ? `.${part}` : ''),
        price_c: move >= 0 ? UP : DOWN,
        info: `${move >= 0 ? '+' : ''}${move.toFixed(2)}% · ${when}`,
      },
    },
    wakeAt: again,
  };
}
