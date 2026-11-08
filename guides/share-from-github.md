---
title: Share projects from GitHub
sidebar_label: Share from GitHub
sidebar_position: 10
description: Open editable .ogs projects straight from a public URL.
---

Studio can open an editable `.ogs` project from any public HTTP or HTTPS address that allows browser
access (CORS). A public GitHub repository works well.

## Open a project from a URL

1. Commit the `.ogs` file to a public repository.
2. Copy its raw-file address, not the normal page address:

   ```text
   https://raw.githubusercontent.com/OWNER/REPOSITORY/main/path/project.ogs
   ```

3. In Studio, choose **File → Open from URL…** and paste it. Studio checks the project before loading it, and
   asks before replacing the one you have open.

Replace `main` with a commit SHA when everyone must open exactly the same revision.

## Keep private material private

A public `.ogs` file contains everything in the project, including embedded images, fonts and field
defaults. Don't publish private content or credentials this way. Private GitHub raw links aren't
supported, although a time-limited signed URL from storage that allows CORS can work.
