// City Light Trails - single Image pass, Shadertoy compatible.
//
// A long-exposure city at dusk: a glowing sky over a skyline of lit windows, and a boulevard
// below drawn in streaks of light, red tail lights heading away and white headlights coming in.
// For local and network news opens, traffic and travel, business and evening programmes.
// Inspired by the dusk aerial cityscapes in network evening-news opens (NBC "Nightly News");
// no footage or code from them is used.
//
// Technique: above the horizon, a sky gradient and a skyline of hashed building heights with a
// flickering window grid. Below it, each pixel is projected onto a flat road; lanes are fixed
// world positions across it, and light streaks are bright, broken bands moving along each lane
// at their own speed, fading with distance into the horizon glow.
//
// In OGraf Studio the "#pragma ograf" lines expose the constants below as animatable controls.
// zoom scales the whole design about the object's centre; below 1 it shrinks inside the box.
//
// Original work for the ZD News Package, dedicated to the public domain under CC0-1.0.

#pragma ograf skyTop color
const vec3 skyTop = vec3(0.030, 0.050, 0.180);
#pragma ograf skyHorizon color
const vec3 skyHorizon = vec3(1.000, 0.500, 0.250);
#pragma ograf tailColor color
const vec3 tailColor = vec3(1.000, 0.100, 0.050);
#pragma ograf headColor color
const vec3 headColor = vec3(1.000, 0.900, 0.750);
#pragma ograf windowColor color
const vec3 windowColor = vec3(1.000, 0.750, 0.450);
#pragma ograf trafficSpeed slider min(0) max(3) step(0.01)
const float trafficSpeed = 1.0;
#pragma ograf laneCount slider min(2) max(12) step(1)
const float laneCount = 8.0;
#pragma ograf horizon slider min(0.3) max(0.8) step(0.01)
const float horizon = 0.55;
#pragma ograf skyline slider min(0) max(1) step(0.01)
const float skyline = 0.7;
#pragma ograf bloom slider min(0) max(2) step(0.01)
const float bloom = 1.0;
#pragma ograf zoom slider min(0.25) max(4) step(0.01)
const float zoom = 1.0;

// Sine-free hash: identical whether the compiler folds it or the GPU evaluates it.
float hash11(float x) {
  x = fract(x * 0.1031);
  x *= x + 33.33;
  x *= x + x;
  return fract(x);
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise1(float x) {
  float i = floor(x);
  float f = fract(x);
  return mix(hash11(i), hash11(i + 1.0), f * f * (3.0 - 2.0 * f));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 coord = (fragCoord - 0.5 * iResolution.xy) / zoom + 0.5 * iResolution.xy;
  vec2 uv = coord / iResolution.xy;
  float x = (coord.x - 0.5 * iResolution.x) / iResolution.y;
  float t = iTime * trafficSpeed;
  vec3 col;

  if (uv.y > horizon) {
    float h = (uv.y - horizon) / (1.0 - horizon);
    col = mix(skyHorizon, skyTop, pow(h, 0.5));
    col = mix(col, skyTop * 0.6, smoothstep(0.6, 1.0, h));

    // Skyline: building columns of varied width and height, tallest towards the centre.
    float colW = 0.035;
    float column = floor(x / colW);
    float centreBoost = exp(-x * x * 1.5);
    float height = (0.05 + 0.3 * pow(hash11(column), 1.6) * centreBoost + 0.06 * hash11(column + 9.0)) * skyline;
    float above = uv.y - horizon;
    if (above < height) {
      vec3 building = mix(vec3(0.02, 0.025, 0.05), vec3(0.08, 0.06, 0.08), above / max(height, 0.001));
      vec2 win = vec2(fract(x / colW * 5.0), fract(above * 160.0));
      float cellLit = step(0.55, hash12(vec2(floor(x / colW * 5.0), floor(above * 160.0))));
      float flick = 0.7 + 0.3 * sin(iTime * (0.5 + hash11(column) * 2.0) + column);
      float window = step(0.25, win.x) * step(win.x, 0.75) * step(0.3, win.y) * step(win.y, 0.8);
      building += windowColor * window * cellLit * flick * 0.55;
      col = building;
    }
    col += skyHorizon * exp(-(uv.y - horizon) * 14.0) * 0.35;
  } else {
    // The road: project onto a flat ground plane.
    float below = horizon - uv.y;
    float depth = 0.6 / max(below, 1e-4);
    float worldX = x * depth + sin(depth * 0.02) * 2.5;
    // Lanes sit either side of a central median, half a lane off the camera's line.
    float laneWidth = 0.45;
    float laneCoord = worldX / laneWidth;
    float lane = floor(laneCoord) + 0.5;
    float halfLanes = floor(laneCount) * 0.5;
    float inRoad = step(abs(lane), halfLanes);
    float dl = abs(laneCoord - lane);

    // Away-bound lanes on the right are tail lights; incoming lanes on the left are headlights.
    float outbound = step(0.0, lane);
    float dir = outbound > 0.5 ? 1.0 : -1.0;
    float s = depth * 0.12 - t * dir * (0.8 + 0.4 * hash11(lane + 3.0));
    float traffic = smoothstep(0.35, 0.6, noise1(s + lane * 13.0)) * (0.6 + 0.4 * noise1(s * 4.0 + lane));
    float core = exp(-pow(dl / 0.05, 2.0));
    float halo = exp(-pow(dl / 0.18, 2.0)) * 0.35 * bloom;
    vec3 lightCol = outbound > 0.5 ? tailColor : headColor;
    float fade = exp(-depth * 0.012) * smoothstep(0.0, 0.08, uv.y);

    col = mix(vec3(0.01, 0.01, 0.02), vec3(0.05, 0.03, 0.05), smoothstep(0.0, 0.25, below));
    col += lightCol * traffic * (core + halo) * inRoad * fade * 1.6;
    // Wet asphalt picks up a faint glow from the stream of lights.
    col += mix(tailColor, headColor, 0.5) * 0.04 * inRoad * fade * bloom;
    col += skyHorizon * exp(-below * 30.0) * 0.4;
  }
  col = col / (1.0 + col * 0.25);
  col *= 1.0 - dot(uv - 0.5, uv - 0.5) * 0.6;
  fragColor = vec4(col, 1.0);
}
