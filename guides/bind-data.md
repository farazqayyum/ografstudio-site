---
title: Connect graphics to operator data
sidebar_label: Operator data
sidebar_position: 5
description: Add data fields and bind text, images and colours so operators can fill the graphic at playout.
---

Operators rarely retype a graphic. They fill in fields such as a name, a title or a score, and the
graphic updates. In Studio those are **data fields**, and **bindings** connect them to layer
properties.

## 1. Add a field

Open **Data** and choose **+ Add Field**. Give it:

- a **Key**, the name playout systems use, such as `name`;
- a **Label**, which operators see, such as "Guest name";
- a **Type**, such as Text, Number, Boolean, Color, Image URL or Select;
- a **Default**, shown until the operator sends a value.

Further settings, such as minimum and maximum length or a pattern, limit what operators can send.
**Compiled Schema Preview** shows the resulting OGraf data schema, which playout systems use to
build their operator forms.

## 2. Bind a layer to it

Select the layer, open **Properties → Data Bindings** and choose **+ Add Binding**. Pick the field
and the property it should drive, such as the text of a headline or the colour of a panel.

Text content and typography properties can both be bound. For a **Select** field, **Advanced
mapping** gives each option its own value, so choosing "Sport" could switch a font family or size.

## 3. Test with real values

Change a field's value and watch the canvas update. Try the longest name you expect to receive, and
names in every language you broadcast in. **Run broadcast QA** in **Preview & Export** checks long
replacement text along with safe areas, text size and contrast.

## Go further

- **Lists** in **Data** drive repeated rows, such as a results table, from a list field.
- **Actions** in **Data** (**+ Add Action**) let the operator trigger named actions in the graphic.
- **Connections** in **Data** fill fields from a [data connection](/docs/user-guide/data/connections)
  while the graphic is on air.
- [Visual rules](/docs/user-guide/data/visual-rules) change the graphic by itself when a value changes, or
  when someone clicks, taps or hovers over it.
