---
title: Export and test an OGraf package
sidebar_label: Export and test
sidebar_position: 8
description: Export a checked .ograf.zip for playout, and test it before it goes on air.
---

The editable `.ogs` project is for Studio. Playout systems need an OGraf package: a manifest,
`main.js` and its resources, delivered as `.ograf.zip`.

## 1. Check the graphic

In **Preview & Export**:

- Step through the graphic with **Next step ⏭** and **Take Out**.
- Switch between **realtime** and **non-realtime** preview. Frame-based renderers use non-realtime
  playback, where seeking must give the same frame every time.
- Choose **Run broadcast QA**. It checks safe areas at each Step, minimum text size, packaged fonts,
  backing contrast and long replacement text.

## 2. Export

Choose **Export .ograf.zip**. Pick the thumbnail frame, or **First OGraf step**, then export. Studio
checks the package before writing it: the manifest, the package layout, the module and its
lifecycle in both realtime and non-realtime playback. If a check fails, nothing is written and
Studio tells you why.

The ZIP includes a transparent thumbnail referenced from the manifest, and licence files for bundled
third-party code and assets.

## 3. Test in your player

Extract the ZIP and load its `.ograf.json` manifest in your OGraf player, renderer or the OGraf
devtool. Before using a graphic in production, check:

- the target renderer and its GPU, especially for shaders;
- fonts on the playout machine, if any aren't packaged;
- real data, including your longest and non-Latin values.

Studio's automated checks are not EBU certification, and can't guarantee compatibility with every
third-party player.

## Bringing a package back into Studio

**Import OGraf** turns a `.ograf.zip` back into an editable project as far as it can, and reports what
it recovered, defaulted or lost. Always keep the `.ogs` source of your own graphics.
