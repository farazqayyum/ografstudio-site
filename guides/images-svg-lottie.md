---
title: Add images, SVG and Lottie
sidebar_label: Images, SVG and Lottie
sidebar_position: 6
description: Bring artwork into a template and keep it replaceable.
---

## Images

Choose **Add Image** above the canvas, or drop image files straight onto the canvas. Each image
becomes a named layer at its original proportions; large images are fitted to 80% of the canvas.
PNG, JPEG, WebP, GIF, AVIF and standalone SVG files work wherever the browser can decode them.

To swap artwork later, select the image layer and choose **Replace image** near the top of
**Properties**. The layer keeps its size, position, animation, effects and data bindings.

## SVG with companion files

An SVG exported from a design tool often comes with CSS, linked images and fonts. Use
**Resources → Import Image/SVG Bundle** and select the SVG together with those files. Studio embeds
them, so the result is one portable image asset, and lists anything it couldn't resolve.

The SVG arrives as a single image. Its internal shapes don't become separate Studio layers.

## Lottie animations

Choose **+ Lottie JSON** above the canvas. Lottie layers loop while the graphic is on air, and
scrubbing or seeking always shows the exact frame for that time, so renders are repeatable.

Embed images in the JSON as data URIs, and use alpha mattes. External image or font paths,
expressions and luma mattes aren't supported. Try the small [pulse example](/examples/lottie-pulse)
to check your playout environment.

## Make it data-driven

An image layer's source can be bound to an **Image URL** field, so operators can change a photo or
logo at playout. See [Connect graphics to operator data](/guides/bind-data).
