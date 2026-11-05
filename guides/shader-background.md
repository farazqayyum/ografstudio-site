---
title: Create a shader background
sidebar_label: Shader backgrounds
sidebar_position: 7
description: Fill shapes, text and images with GLSL shaders, and expose their settings to operators.
---

Shader fills render a GLSL program on the GPU, which suits moving backgrounds, light sweeps and
textured text. Studio uses the Shadertoy `mainImage` format, so many existing Image shaders can be
adapted.

## 1. Add a shader fill

1. Draw a **Rectangle** the size of the composition.
2. In **Properties**, set **Fill** to **Shader**.
3. Edit the source in Properties, or load a `.glsl` file.

Shapes, text, images, image sequences, Lottie and patterns all accept shader fills. The shader
follows the object's shape, so a shader-filled headline stays editable text. Text also has a
separate **Outline** paint, which can be a second shader.

## 2. Expose controls

Mark constants with `#pragma ograf` to turn them into controls in Properties, and into data fields
for operators:

```glsl
#pragma ograf speed slider min(0) max(4) step(0.1)
const float speed = 1.0;
#pragma ograf tint color
const vec3 tint = vec3(0.14, 0.32, 0.76);
#pragma ograf glow toggle
const bool glow = true;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  float band = 0.5 + 0.5 * sin(uv.x * 6.0 + uv.y * 3.0 - iTime * speed);
  vec3 colour = tint * (0.4 + 0.6 * band);
  if (glow) colour += 0.15 * band * band;
  fragColor = vec4(colour, 1.0);
}
```

| Pragma    | Works with                                                  |
| --------- | ----------------------------------------------------------- |
| `slider`  | `float` and `int`, with optional `min()`, `max()`, `step()` |
| `color`   | `vec3` and `vec4`                                           |
| `toggle`  | `bool`                                                      |
| `vector2` | `vec2`                                                      |

## 3. Animate a control

Expand the object in **Timeline**, turn on **Auto-keyframe**, and use **+ Property → Fill shader** to
pick a control. Move the playhead and change the control in Properties to add keys. The shader's
own `iTime` clock keeps running independently.

## What's supported

Shaders get `iTime`, `iResolution` and, optionally, one embedded PNG or JPEG as `iChannel0`, set
under **Rendering → Image input**. Extra channels, video, buffer passes, audio and mouse input
aren't supported. The playout renderer must support WebGL 2.

A shader can also run as an effect in **Properties → Effects stack**, where `iChannel0` is the layer
itself. The [user guide](/docs/user-guide#shader-fills) covers both modes in detail.
