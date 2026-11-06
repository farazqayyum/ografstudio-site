// The jury vote behind the Rankings example: Studio's Functions pane shows this same source.
//
// It runs in a sandbox inside the graphic. It reads the contestants and the juries, keeps the
// score, and writes `board` (one row per contestant) and the jury panel's fields. Layers only
// display those fields; the collection sorts the rows by `slot` and slides them to their places.
({ state, data, event, nowMs }) => {
  // The beats of the show, in milliseconds.
  const RANK_AFTER = 260; // a score lands on its row, then the rows move
  const LIT_FOR = 900; // how long that row stays lit
  const CHIP_FOR = 3500; // how long a score given by hand stays on its row
  const NEXT_AFTER = 1000; // between scores, when the low points run by themselves
  const BURST_GAP = 110; // between scores, when the low points land together
  const SUSPENSE = 1500; // "And the top score..." before the name
  const FINAL_AFTER = 1900; // from the last score to the winner

  const s = state; // Each call gets its own copy, and what it returns is the next call's state.
  const contestants = (Array.isArray(data.contestants) ? data.contestants : []).filter(
    (item) => item && item.id !== undefined && item.id !== '',
  );
  const juries = Array.isArray(data.juries) ? data.juries : [];
  const byId = Object.fromEntries(contestants.map((item) => [item.id, item]));
  const scale = String(data.points_scale ?? '')
    .split(/[^0-9]+/)
    .filter(Boolean)
    .map(Number)
    .sort((a, b) => a - b);

  // A jury ranks the contestants, best first; the best gets the top of the scale. Lowest first.
  const awardsOf = (jury) => {
    const ranking = String(jury?.ranking ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter((id) => byId[id]);
    const highest = [...scale].reverse();
    return ranking
      .slice(0, highest.length)
      .map((to, index) => ({ to, points: highest[index] }))
      .reverse();
  };
  const total = (item) => (Number(item.points) || 0) + (s.awarded[item.id] ?? 0);

  // Most points first. On equal points, whoever got there first stays ahead.
  const sorted = () => {
    const place = (id) => {
      const index = s.order.indexOf(id);
      return index < 0 ? s.order.length : index;
    };
    return contestants
      .map((item, index) => ({ item, index }))
      .sort(
        (a, b) =>
          total(b.item) - total(a.item) || place(a.item.id) - place(b.item.id) || a.index - b.index,
      )
      .map(({ item }) => item.id);
  };

  const push = (beat) => {
    s.queue.push(beat);
    s.queue.sort((a, b) => a.at - b.at);
  };
  const giveLater = (at, award, extra = {}) => {
    push({ at, do: 'land', ...award, ...extra });
    push({ at: at + LIT_FOR, do: 'cool', to: award.to });
  };

  const press = () => {
    if (s.phase === 'final') return;
    // The top score is already on its way; nothing may overtake it.
    if (s.queue.some((beat) => beat.top || beat.do === 'final')) return;
    // Impatient? The scores still running land at once.
    if (s.queue.some((beat) => beat.do === 'land')) {
      for (const beat of s.queue) {
        if (beat.do === 'land' || beat.do === 'rank') beat.at = nowMs;
        if (beat.do === 'cool') beat.at = Math.min(beat.at, nowMs + LIT_FOR);
      }
      s.queue.sort((a, b) => a.at - b.at);
      return;
    }
    if (s.jury < 0 || s.landed >= awardsOf(juries[s.jury]).length) {
      if (s.jury + 1 >= juries.length) return;
      s.jury += 1;
      s.landed = 0;
      s.chips = {};
      s.topChips = {};
      s.top = 'wait';
      s.topTo = null;
      s.phase = 'voting';
      s.baseline = s.order; // The arrows show the change since this jury began.
      s.moves = {};
    }
    const awards = awardsOf(juries[s.jury]);
    const low = awards.slice(s.landed, -1);
    if (low.length === 0) {
      const top = awards.at(-1);
      if (!top) return;
      s.top = 'spot';
      const at = nowMs + SUSPENSE;
      giveLater(at, top, { top: true, ladder: true });
      push({ at: at + RANK_AFTER, do: 'rank' });
      if (s.jury === juries.length - 1) push({ at: at + FINAL_AFTER, do: 'final' });
    } else if (data.reveal === 'manual') {
      giveLater(nowMs, low[0], { ladder: true });
      push({ at: nowMs + RANK_AFTER, do: 'rank' });
    } else if (data.reveal === 'together') {
      low.forEach((award, index) =>
        giveLater(nowMs + index * BURST_GAP, award, { ladder: true }),
      );
      push({ at: nowMs + (low.length - 1) * BURST_GAP + RANK_AFTER, do: 'rank' });
    } else {
      low.forEach((award, index) => {
        giveLater(nowMs + index * NEXT_AFTER, award, { ladder: true });
        push({ at: nowMs + index * NEXT_AFTER + RANK_AFTER, do: 'rank' });
      });
    }
  };

  const giveByHand = () => {
    const to = event.payload?.to ?? data.give_to;
    const points = Number(event.payload?.points ?? data.give_points);
    if (!byId[to] || !(points > 0)) return;
    if (s.phase !== 'voting') {
      // Outside a jury, the chips and arrows on the board are about this score alone.
      s.baseline = s.order;
      s.moves = {};
      s.chips = {};
      s.topChips = {};
    }
    giveLater(nowMs, { to, points }, { byHand: true });
    push({ at: nowMs + RANK_AFTER, do: 'rank' });
    push({ at: nowMs + CHIP_FOR, do: 'chip-off', to });
  };

  const startOver = () => {
    s.awarded = {};
    s.queue = [];
    s.jury = -1;
    s.landed = 0;
    s.chips = {};
    s.topChips = {};
    s.lit = {};
    s.moves = {};
    s.baseline = [];
    s.top = 'wait';
    s.topTo = null;
    s.phase = 'ready';
    s.order = contestants.map((item) => item.id);
    s.order = sorted();
  };

  if (event.type === 'load') s.order = sorted();
  if (event.type === 'custom-action') {
    if (event.actionId === 'vote.next') press();
    if (event.actionId === 'vote.give') giveByHand();
    if (event.actionId === 'vote.reset') startOver();
  }

  // Everything due now, in order. The rows move once, however many scores landed.
  let ranked = event.type === 'data' && Boolean(event.changed?.contestants);
  while (s.queue.length && s.queue[0].at <= nowMs) {
    const beat = s.queue.shift();
    if (beat.do === 'land' && byId[beat.to]) {
      s.awarded[beat.to] = (s.awarded[beat.to] ?? 0) + beat.points;
      s.chips[beat.to] = beat.byHand ? beat.points : (s.chips[beat.to] ?? 0) + beat.points;
      s.topChips[beat.to] = Boolean(beat.top);
      s.lit[beat.to] = true;
      if (beat.ladder) s.landed += 1;
      if (beat.top) {
        s.top = 'done';
        s.topTo = beat.to;
        s.phase = 'between';
      }
    }
    if (beat.do === 'cool') delete s.lit[beat.to];
    if (beat.do === 'chip-off' && !s.queue.some((next) => next.do === 'chip-off' && next.to === beat.to))
      delete s.chips[beat.to];
    if (beat.do === 'rank') ranked = true;
    if (beat.do === 'final') {
      s.phase = 'final';
      s.top = 'winner';
    }
  }
  if (ranked) {
    s.order = sorted();
    s.moves = {};
    s.order.forEach((id, slot) => {
      const was = s.baseline.indexOf(id);
      if (was >= 0 && was !== slot) s.moves[id] = was - slot;
    });
  }

  // What the layers display.
  let rank = 0;
  let previous = null;
  const rows = {};
  s.order.forEach((id, slot) => {
    const item = byId[id];
    if (!item) return;
    const points = total(item);
    if (points !== previous) {
      rank = slot + 1;
      previous = points;
    }
    const move = points > 0 ? (s.moves[id] ?? 0) : 0;
    rows[id] = {
      id,
      slot,
      name: String(item.name ?? id),
      initials: String(item.name ?? id)
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word.charAt(0))
        .join('')
        .toUpperCase(),
      colour: item.colour || '#5b6bff',
      points,
      rank: points > 0 ? rank : 0,
      place: points > 0 ? String(rank) : '–',
      award: s.chips[id] ? `+${s.chips[id]}` : '',
      top: Boolean(s.chips[id] && s.topChips[id]),
      lit: Boolean(s.lit[id]) || (s.phase === 'final' && slot === 0),
      move: move > 0 ? 'up' : move < 0 ? 'down' : 'same',
      moved: move ? String(Math.abs(move)) : '',
    };
  });

  const jury = juries[s.jury];
  const awards = s.jury >= 0 ? awardsOf(jury) : [];
  const nameOf = (id) => String(byId[id]?.name ?? '');
  const lows =
    s.jury >= 0
      ? awards.slice(0, -1).map((award) => ({ points: award.points, to: award.to }))
      : scale.slice(0, -1).map((points) => ({ points, to: null }));
  const topPoints = awards.at(-1)?.points ?? scale.at(-1) ?? 0;
  const winner = byId[s.order[0]];

  const header = {
    ready: ['JURY VOTE', 'Ready to vote'],
    voting: ['NOW VOTING', String(jury?.name ?? '')],
    between: ['VOTES IN', String(jury?.name ?? '')],
    final: ['FINAL RESULT', 'All votes in'],
  }[s.phase];

  return {
    state: s,
    wakeAt: s.queue.length ? s.queue[0].at : null,
    data: {
      board: contestants.map((item) => rows[item.id]).filter(Boolean),
      ladder: lows.slice(-9).map((award, index) => {
        const position = index + Math.max(0, lows.length - 9);
        const done = s.jury >= 0 && position < s.landed;
        return {
          key: String(award.points),
          points: String(award.points),
          name: done ? nameOf(award.to) : '',
          state: done ? 'done' : s.jury >= 0 && position === s.landed ? 'next' : 'wait',
        };
      }),
      pips: juries.slice(0, 8).map((_, index) => ({
        key: String(index),
        state: index < s.jury || s.phase === 'final' ? 'done' : index === s.jury ? 'now' : 'wait',
      })),
      jury_status: header[0],
      jury_name: header[1],
      jury_count:
        s.jury >= 0 && s.phase !== 'final'
          ? `JURY ${s.jury + 1} OF ${juries.length}`
          : `${juries.length} JURIES`,
      top_state: s.top,
      top_value: `${s.top === 'winner' ? total(winner ?? {}) : topPoints} POINTS`,
      top_caption: {
        wait: 'THE TOP SCORE',
        spot: 'AND THE TOP SCORE…',
        done: 'THE TOP SCORE',
        winner: 'THE WINNER',
      }[s.top],
      top_name:
        s.top === 'winner' ? nameOf(s.order[0]) : s.top === 'done' ? nameOf(s.topTo) : '',
      voting_started: s.phase !== 'ready',
    },
  };
};
