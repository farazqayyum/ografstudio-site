// Liquid Chrome - single Image pass, Shadertoy compatible.
//
// A slowly flowing mirror-metal surface reflecting a studio of soft lights, with optional
// oil-slick iridescence. A premium, modern backdrop for music, fashion, product launches, award
// stings and tech openers.
//
// Technique: a domain-warped fbm height field flows over time; its slope gives a surface normal,
// the view ray is reflected off it and looks up a procedural studio environment (a dark-to-light
// sky, two soft-box bands and a horizon line). Fresnel brightens grazing angles; a thin-film
// colour ramp keyed to height and angle adds iridescence.
//
// In OGraf Studio the "#pragma ograf" lines expose the constants below as animatable controls.
// zoom scales the whole design about the object's centre; below 1 it shrinks inside the box.
//
// Original work for the ZD News Package, dedicated to the public domain under CC0-1.0.

#pragma ograf tint color
const vec3 tint = vec3(0.900, 0.930, 1.000);
#pragma ograf iridescence slider min(0) max(1) step(0.01)
const float iridescence = 0.35;
#pragma ograf flowSpeed slider min(0) max(2) step(0.01)
const float flowSpeed = 0.25;
#pragma ograf scale slider min(0.3) max(4) step(0.01)
const float scale = 1.0;
#pragma ograf relief slider min(0.2) max(3) step(0.01)
const float relief = 2.2;
#pragma ograf contrast slider min(0.5) max(2) step(0.01)
const float contrast = 1.1;
#pragma ograf zoom slider min(0.25) max(4) step(0.01)
const float zoom = 1.0;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
             mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p, int octaves) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    if (i >= octaves) break;
    s += a * noise(p);
    p = mat2(1.6, 1.2, -1.2, 1.6) * p;
    a *= 0.5;
  }
  return s;
}

// Smooth, large flowing forms: liquid metal has few, broad bulges, not crumpled detail.
float surface(vec2 p, float t) {
  vec2 q = vec2(fbm(p * 0.6 + vec2(0.0, t), 3), fbm(p * 0.6 + vec2(5.2, 1.3) - vec2(t * 0.7, 0.0), 3));
  return fbm(p * 0.8 + 1.6 * q + vec2(t * 0.2, 0.0), 3);
}

vec3 studio(vec3 d) {
  float up = d.y * 0.5 + 0.5;
  // A bright studio sky over a dark floor: chrome is mostly reflection, so the contrast lives here.
  vec3 col = mix(vec3(0.015, 0.016, 0.02), vec3(0.82, 0.86, 0.92), smoothstep(0.35, 0.95, up));
  col += vec3(1.0) * smoothstep(0.28, 0.05, abs(d.x - 0.3)) * smoothstep(-0.1, 0.5, d.y) * 1.4;
  col += vec3(1.0) * smoothstep(0.2, 0.03, abs(d.x + 0.5)) * smoothstep(0.0, 0.6, d.y) * 1.0;
  col += vec3(0.9, 0.93, 1.0) * smoothstep(0.05, 0.0, abs(d.y - 0.02)) * 0.9;
  col += vec3(0.12, 0.1, 0.09) * smoothstep(0.0, -0.7, d.y);
  return col;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 p = (fragCoord - 0.5 * iResolution.xy) / iResolution.y / zoom * 2.0 * scale;
  float t = iTime * flowSpeed;

  float e = 0.004;
  float h = surface(p, t);
  float hx = surface(p + vec2(e, 0.0), t);
  float hy = surface(p + vec2(0.0, e), t);
  vec3 n = normalize(vec3(-(hx - h) / e * relief * 0.5, -(hy - h) / e * relief * 0.5, 1.0));

  // A camera looking slightly down, so flat areas reflect the studio's mid-tones, not black.
  vec3 view = normalize(vec3(0.0, 0.4, -1.0));
  vec3 refl = reflect(view, n);
  vec3 col = studio(refl);
  float fresnel = pow(1.0 - max(n.z, 0.0), 3.0);
  col = mix(col, studio(vec3(refl.x, abs(refl.y), refl.z)) * 1.2, fresnel * 0.5);

  // Thin-film iridescence, strongest on slopes.
  vec3 film = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + h * 2.2 + (1.0 - n.z) * 3.0));
  col = mix(col, col * film * 1.6, iridescence * (0.4 + 0.6 * smoothstep(0.0, 0.5, 1.0 - n.z)));

  col *= tint;
  col = pow(clamp(col, 0.0, 1.0), vec3(contrast));
  vec2 screen = fragCoord / iResolution.xy - 0.5;
  col *= 1.0 - dot(screen, screen) * 0.5;
  fragColor = vec4(col, 1.0);
}
