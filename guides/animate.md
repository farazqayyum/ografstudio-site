---
title: Animate with steps and keyframes
sidebar_label: Steps and keyframes
sidebar_position: 4
description: Use the OGraf lifecycle, the timeline and keyframes to animate a graphic.
---

## How an OGraf graphic moves

An OGraf graphic doesn't just play from start to finish. The operator takes it in, it waits on
air, and later the operator takes it out. Studio models this with markers on the timeline, which are
separate from the keys that animate your objects:

| Marker     | Meaning                                                                                 |
| ---------- | --------------------------------------------------------------------------------------- |
| **Before** | The graphic before it appears                                                           |
| **On air** | A Step, where the graphic waits on air for the operator; a graphic can have several     |
| **After**  | The graphic after it has left                                                           |

The entrance plays up to the first On air cue, so place that cue where the entrance is complete. Each
**Next step** moves on to the following Step, and the exit plays from the last Step to After.

## Play and step through the timeline

- The timeline plays straight through by default. Turn on **Stop at Steps** to rehearse playout, so
  playback waits at each Step for another Play. This doesn't change how the exported graphic plays.
- With the timeline focused, **Space** plays and pauses, **Left/Right Arrow** steps one frame, and
  **Ctrl/Cmd+Left/Right** jumps to the neighbouring keyframe.

## Make keyframes

New objects start with one static pose. To animate a property, click the diamond beside it in
**Properties**, or use **Key transform** in **Timeline** to record the whole transform. You can also
double-click the timeline or use its context menu to insert keys. A filled diamond means the property
has a key at the playhead, and clicking it removes that key.

Once a property is animated, move the playhead and change its value to record a key at that time.
That's the default **At playhead** mode in **Properties → Transform → Edit**. Choose **Whole animation**
to move all of its values together and keep their key times.

**Auto-keyframe**, off by default, also starts animation on static properties as you change them. It
turns off again whenever you open or create a project.

[Your first keyframe animation](/docs/user-guide/animation/first-keyframe-animation) walks through it
step by step.

## Animate one property at a time

Every property has its own track. Expand a layer in **Timeline** and use **+ Property** to add a
track, for example for a shader control. Select a property and use its **Loop** section to repeat
values while the graphic is on air, and preview the loop before you rely on it.

## Quicker motion

Select layers and use **Animate In / Out** to add a Fade, Slide, Fly or Focus entrance and exit. The
presets write ordinary keyframes that you can edit afterwards. Text layers also have their own
[animation presets](/docs/user-guide/animation/text-animation), such as Typewriter and Word reveal.

## Next steps

- [Connect graphics to operator data](/guides/bind-data)
- [Export and test the result](/guides/export)
