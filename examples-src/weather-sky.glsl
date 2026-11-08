// Weather sky - see-through rain, drizzle, thunder, snow and fog for the Europe weather example.
//
// Draws only the weather: everything else stays clear, so the map shows through. The forecast says
// which kind falls where. Each city's kind is a digit from 0 to 7, packed six cities to a number:
// city 0 is today_a % 8, city 1 is (today_a / 8) % 8, and so on; cities 6 to 11 use today_b.
//   0 none   1 fog   2 drizzle   3 rain   4 heavy rain   5 thunder   6 light snow   7 snow
// The map shows three days, round the cities: today, next (tomorrow) and after (the day after).
// w_today, w_next and w_after say how much of each day shows, so a change of day cross-fades. As
// stage goes from 0 to 1 the kind in focus fills the whole layer instead, fading in from `edge` (a
// share of the width) so the presenter's side stays dry. `world` is the layer's size in pixels.
//
// Dedicated to the public domain under CC0-1.0.

#pragma ograf today_a slider min(0) max(262143) step(1)
const float today_a = 0.0;
#pragma ograf today_b slider min(0) max(262143) step(1)
const float today_b = 0.0;
#pragma ograf next_a slider min(0) max(262143) step(1)
const float next_a = 0.0;
#pragma ograf next_b slider min(0) max(262143) step(1)
const float next_b = 0.0;
#pragma ograf after_a slider min(0) max(262143) step(1)
const float after_a = 0.0;
#pragma ograf after_b slider min(0) max(262143) step(1)
const float after_b = 0.0;
#pragma ograf w_today slider min(0) max(1) step(0.01)
const float w_today = 1.0;
#pragma ograf w_next slider min(0) max(1) step(0.01)
const float w_next = 0.0;
#pragma ograf w_after slider min(0) max(1) step(0.01)
const float w_after = 0.0;
#pragma ograf stage slider min(0) max(1) step(0.01)
const float stage = 0.0;
#pragma ograf focus slider min(0) max(7) step(1)
const float focus = 0.0;
#pragma ograf edge slider min(0) max(1) step(0.01)
const float edge = 0.26;
#pragma ograf world vector2 min(1) max(4096) step(1)
const vec2 world = vec2(1920.0, 1080.0);

// Where the cities sit on the 1920 x 1080 map, measured from the top left.
const vec2 CITY[12] = vec2[12](
  vec2(718.0, 857.0), vec2(862.0, 832.0), vec2(888.0, 408.0), vec2(996.0, 489.0),
  vec2(1037.0, 581.0), vec2(1268.0, 468.0), vec2(1261.0, 814.0), vec2(1339.0, 604.0),
  vec2(1419.0, 463.0), vec2(1334.0, 241.0), vec2(1553.0, 910.0), vec2(1663.0, 785.0));

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float kindOf(float a, float b, int city) {
  float v = city < 6 ? a : b;
  int digit = city < 6 ? city : city - 6;
  for (int j = 0; j < 6; j++) {
    if (j == digit) break;
    v = floor(v / 8.0);
  }
  return mod(floor(v + 0.5), 8.0);
}

// How much fog, rain, lightning and snow a kind brings.
vec4 amounts(float kind) {
  if (kind < 0.5) return vec4(0.0);
  if (kind < 1.5) return vec4(1.0, 0.0, 0.0, 0.0);
  if (kind < 2.5) return vec4(0.0, 0.45, 0.0, 0.0);
  if (kind < 3.5) return vec4(0.0, 0.75, 0.0, 0.0);
  if (kind < 4.5) return vec4(0.0, 1.0, 0.0, 0.0);
  if (kind < 5.5) return vec4(0.0, 1.0, 1.0, 0.0);
  if (kind < 6.5) return vec4(0.0, 0.0, 0.0, 0.55);
  return vec4(0.0, 0.0, 0.0, 1.0);
}

// The three days in their shares; while the day changes, the two blend.
vec4 amountsAt(int city) {
  return amounts(kindOf(today_a, today_b, city)) * w_today
    + amounts(kindOf(next_a, next_b, city)) * w_next
    + amounts(kindOf(after_a, after_b, city)) * w_after;
}

// Thin slanted streaks falling down and a little to the left, in two depths.
float rain(vec2 p, float amount, float t) {
  if (amount <= 0.0) return 0.0;
  float total = 0.0;
  for (int layer = 0; layer < 2; layer++) {
    float depth = float(layer);
    float scale = 1.0 - 0.35 * depth;
    vec2 q = p;
    q.x -= q.y * 0.25;
    q.y += t * (400.0 - 110.0 * depth);
    vec2 cell = vec2(17.0, 76.0) * scale;
    vec2 id = floor(q / cell) + depth * 37.0;
    vec2 f = fract(q / cell);
    float present = step(1.0 - amount * 0.55, hash(id));
    float x = 0.25 + 0.5 * hash(id + 3.7);
    float top = 0.1 + 0.35 * hash(id + 9.1);
    float len = mix(0.28, 0.5, amount);
    float across = abs(f.x - x) * cell.x;
    float line = 1.0 - smoothstep(0.35, 1.25 * scale, across);
    float along = smoothstep(top, top + 0.08, f.y) * (1.0 - smoothstep(top + len - 0.12, top + len, f.y));
    total += present * line * along * (1.0 - 0.35 * depth);
  }
  return clamp(total, 0.0, 1.0);
}

// Round flakes in three depths, drifting down and swaying.
float snow(vec2 p, float amount, float t) {
  if (amount <= 0.0) return 0.0;
  float total = 0.0;
  for (int layer = 0; layer < 3; layer++) {
    float depth = float(layer);
    float cell = 46.0 - 10.0 * depth;
    vec2 q = p;
    q.y += t * (60.0 - 14.0 * depth);
    q.x += sin(q.y * 0.017 + depth * 2.1 + t * 0.7) * 9.0;
    vec2 id = floor(q / cell) + depth * 19.0;
    vec2 f = fract(q / cell) - 0.5;
    vec2 offset = (vec2(hash(id + 1.3), hash(id + 2.9)) - 0.5) * 0.5;
    float radius = mix(2.8, 5.6, hash(id + 5.5)) * (1.0 - 0.25 * depth);
    float d = length(f - offset) * cell;
    total += step(1.0 - amount * 0.8, hash(id)) * (1.0 - smoothstep(radius * 0.45, radius, d)) * (1.0 - 0.3 * depth);
  }
  return clamp(total, 0.0, 1.0);
}

// Soft bands of haze sliding slowly sideways.
float fog(vec2 p, float t) {
  vec2 q = p * vec2(0.0021, 0.0105) + vec2(t * 0.035, 0.0);
  float n = noise(q) * 0.6 + noise(q * 2.1 + 3.0) * 0.3 + noise(q * 4.3 + 7.0) * 0.1;
  return smoothstep(0.36, 0.82, n);
}

// A short double flash every few seconds; the seed keeps cities out of step.
float lightning(float t, float seed) {
  float x = fract(t / 4.7 + seed) * 4.7;
  return exp(-pow((x - 0.05) / 0.035, 2.0)) + 0.6 * exp(-pow((x - 0.2) / 0.03, 2.0));
}

vec4 over(vec4 below, vec3 colour, float alpha) {
  return vec4(colour * alpha, alpha) + below * (1.0 - alpha);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  vec2 p = uv * world;
  vec2 onMap = vec2(p.x, world.y - p.y);
  // Wrapping time every ten minutes keeps the drops sharp on a long show.
  float t = mod(iTime, 600.0);

  float whole = clamp(stage, 0.0, 1.0);
  float byCity = 1.0 - whole;

  vec4 amount = vec4(0.0);
  float flash = 0.0;
  if (byCity > 0.0) {
    for (int i = 0; i < 12; i++) {
      float near = 1.0 - smoothstep(55.0, 175.0, distance(onMap, CITY[i]));
      if (near <= 0.0) continue;
      vec4 here = amountsAt(i) * near * byCity;
      amount = max(amount, here);
      flash = max(flash, here.z * lightning(t, float(i) * 0.37));
    }
  }
  if (whole > 0.0) {
    float fade = edge > 0.0 ? smoothstep(edge, edge + 0.16, uv.x) : 1.0;
    vec4 wide = amounts(focus) * whole * fade;
    amount = max(amount, wide);
    flash = max(flash, wide.z * lightning(t, 0.11));
  }

  float drops = rain(p, amount.y, t);
  float flakes = snow(p, amount.w, t);
  float haze = amount.x > 0.0 ? fog(p, t) * amount.x : 0.0;

  vec4 colour = vec4(0.0);
  colour = over(colour, vec3(0.43, 0.65, 0.92), 0.16 * max(amount.y, amount.w * 0.6));
  colour = over(colour, vec3(0.84, 0.89, 0.96), 0.3 * haze);
  colour = over(colour, vec3(0.74, 0.87, 1.0), 0.8 * drops);
  colour = over(colour, vec3(1.0), 0.92 * flakes);
  colour = over(colour, vec3(0.93, 0.96, 1.0), 0.34 * clamp(flash, 0.0, 1.0) * max(amount.y, 0.3));
  fragColor = vec4(colour.rgb / max(colour.a, 0.0001), colour.a);
}
