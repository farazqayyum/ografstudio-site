// Wave Bands - an OGraf Studio shader fill example.
//
// Diagonal streaks of light drifting across a tinted background, with an optional glow. In
// OGraf Studio the "#pragma ograf" lines turn the constants below into controls and operator
// data fields.
//
// Dedicated to the public domain under CC0-1.0.

#pragma ograf speed slider min(0) max(4) step(0.1)
const float speed = 1.0;
#pragma ograf tint color
const vec3 tint = vec3(0.14, 0.32, 0.76);
#pragma ograf glow toggle
const bool glow = true;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  float diagonal = uv.x * 1.6 + uv.y;

  // A deep gradient in the tint colour.
  vec3 colour = mix(tint * 0.12, tint * 0.75, uv.y * 0.7 + 0.15);

  // Broad, soft streaks and finer bright ones moving at different speeds.
  float broad = pow(0.5 + 0.5 * sin(diagonal * 9.0 - iTime * speed), 10.0);
  float fine = pow(0.5 + 0.5 * sin(diagonal * 23.0 - iTime * speed * 1.7 + 1.3), 28.0);
  colour += tint * broad * 0.9 + vec3(0.85, 0.92, 1.0) * fine * 0.3;

  if (glow) colour += tint * 0.6 * exp(-7.0 * length(uv - vec2(0.75, 0.7)));

  // Darken towards the edges so text over the middle stays readable.
  colour *= 1.0 - 0.55 * dot(uv - 0.5, uv - 0.5);
  fragColor = vec4(colour, 1.0);
}
