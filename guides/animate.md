---
title: Animate with steps and keyframes
sidebar_label: Steps and keyframes
sidebar_position: 4
description: Use the OGraf lifecycle, the timeline and Auto-keyframe to animate a graphic.
---

## How an OGraf graphic moves

An OGraf graphic doesn't just play from start to finish. The operator takes it in, it waits on
air, and later the operator takes it out. Studio models this with three kinds of keyframe:

| Key       | Meaning                                                                               |
| --------- | ------------------------------------------------------------------------------------- |
| **Start** | The graphic before it appears                                                         |
| **Step**  | A moment where the graphic waits on air for the operator; a graphic can have several |
| **End**   | The graphic after it has left                                                         |

The entrance plays from Start to the first Step. Each **Next step** moves on to the following
Step, and the exit plays from the last Step to End.

## Play and step through the timeline

- **Pause at Steps** is on by default, so playback stops at each Step. Turn it off for continuous
  playback.
- With the timeline focused, **Space** plays and pauses, and **Left/Right Arrow** steps one frame.

## Make keyframes

Turn on **Auto-keyframe**, next to **Pause at Steps**, to create keys as you edit. Move the playhead,
then change a property in **Properties** or on the canvas, and Studio adds a key at that frame. You
can also double-click the timeline or use its context menu to insert keys.

With **Auto-keyframe** off, edits to position, size, rotation, opacity, gradient stops, stroke width
and effects apply across a layer's existing keys without adding new ones. Static layers stay
static, and existing motion is offset rather than replaced. Auto-keyframe turns off again whenever
you open or create a project.

## Animate one property at a time

Every property has its own track. Expand a layer in **Timeline** and use **+ Property** to add a
track, for example for a shader control. Select a property and use its **Loop** section to repeat
values while the graphic is on air, and preview the loop before you rely on it.

## Next steps

- [Connect graphics to operator data](/guides/bind-data)
- [Export and test the result](/guides/export)
