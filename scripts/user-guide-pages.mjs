// How the repository's single docs/USER_GUIDE.md becomes the website's User guide section.
//
// The source is cut into chunks: one at every ##, ### and #### heading, plus one at every line in
// CUTS. Each page below lists its chunks by name. The first chunk's heading gives way to the page
// title and later chunks become ## sections, so a page's right-hand contents is only its own topics.
//
// The import warns about a CUT it can't find and a chunk no page lists. Unlisted chunks land on an
// "Other topics" page, so a section added upstream is never lost. Give it a page here when that happens.

/** Line-level cuts in sections that mix several topics. `strip` removes a run-in lead from the line. */
export const CUTS = [
  {at: 'Click the gear on the selected plugin', name: 'Manage plugins'},

  {at: 'The **Templates** pane switches', name: 'Templates pane'},
  {at: '**Scene Outliner** is a separate', name: 'Scene Outliner'},
  {at: 'Expand **Shared controls and asset slots**', name: 'Shared controls and asset slots'},
  {at: '**Export All Templates…** certifies', name: 'Export a whole set'},

  {at: '**File → Save Template** includes', name: 'Save a template'},
  {at: '**File → Export…** opens Preview & Export, expands', name: 'Open the export options'},
  {at: '**Export .ograf.zip** opens a thumbnail', name: 'Choose the thumbnail'},
  {at: 'Coordinated export prepares', name: 'Prepare and save'},
  {at: 'Studio also includes a self-contained preview', name: 'The exported preview page'},
  {at: 'OGraf exports include the Studio playback', name: 'Licences in exports'},
  {at: 'The preview runs executable graphic code', name: 'Trust and browser permissions'},

  {at: 'Studio sends a ticked template again', name: 'Keeping presets up to date'},
  {at: "Studio's server serves what", name: 'What Studio serves'},
  {at: 'Create an ElectroNode and add reusable', name: 'Input slots'},
  {at: 'Use **Data → Operator controls** to choose the fields the page', name: 'Fields and pin types'},
  {at: 'While Studio is connected to Nodos', name: 'Nodos types'},
  {at: 'An exposed data field or live-media tag cannot', name: 'Requirements and limits'},
  {at: 'For DaVinci Resolve, choose', name: 'DaVinci Resolve'},

  {at: 'Use **Animation** in the chart', name: 'Chart animation'},
  {at: 'For plugin motion on individual bars', name: 'Bars and slices animation'},

  {at: 'Select a complete persistent group', name: 'Group effects'},
  {at: '**Shader** adds a true WebGL', name: 'Shader effects'},
  {at: '**Backdrop blur** creates', name: 'Backdrop blur'},
  {at: 'Bypass retains settings', name: 'Bypass and animation'},

  {at: 'For local testing, choose an **Input**', name: 'Test with a webcam'},
  {at: 'For a live video bed', name: 'A webcam as the background'},
  {at: '**Camera Settings** is beside', name: 'Camera settings'},
  {at: 'Media Cues are real-time-only', name: 'Real-time only'},

  {at: 'To build a row like a team', name: 'Examples'},
  {at: 'Each card can be bypassed', name: 'Manage modifiers'},
  {at: 'The same dependency-ordered evaluator', name: 'Limits'},

  {at: '**Conditions.** ', name: 'Conditions', strip: true},
  {at: 'Choose **Mouse X** or', name: 'Mouse position'},
  {at: '**Triggers.** ', name: 'Triggers', strip: true},
  {at: '**Actions.** ', name: 'Actions', strip: true},
  {at: '**Conditional size and position.** ', name: 'Conditional size and position', strip: true},
  {at: '**Playout actions.** ', name: 'Playout actions', strip: true},
  {at: '**State and events.** ', name: 'State and events', strip: true},
  {at: '**Trying rules.** ', name: 'Trying rules', strip: true},

  {at: 'Each lane in a template set chooses', name: 'Lanes that update in place'},

  {at: '**Speed px/s** uses', name: 'Speed, direction and fades'},
  {at: '**Apply updates** defaults', name: 'Applying updates'},
  {at: 'Text supports normal fonts', name: 'Item content'},
  {at: 'For an external feed, bind', name: 'External feeds'},
  {at: 'Playback prepares upcoming content', name: 'Performance'},

  {at: 'Choose a format such as', name: 'Formats'},
  {at: '**Automatic** uses the system clock', name: 'Automatic and manual time'},
  {at: 'Operators can also change how', name: 'Changing settings on air'},
  {at: 'Choose an effect in **Update text FX**', name: 'Animated changes'},

  {at: 'Playout integrations can address', name: 'Custom actions for playout'},
  {at: 'Non-real-time packages accept', name: 'Non-real-time packages'},

  {at: '**Count up** and **Count down** animate', name: 'Counting'},
  {at: '**Roll up** and **Roll down** move', name: 'Rolling digits'},
  {at: 'Set a fixed frame duration', name: 'Duration and replay'},

  {at: '**Resources → Shaders** lists', name: 'The shader library'},
  {at: 'Mark literal global constants', name: 'Exposed controls'},
  {at: 'Exposed shader controls can also own', name: 'Animating controls'},
  {at: 'The original source and values are saved', name: 'Image input and limits'},

  {at: 'AI proposals appear on', name: 'AI proposals'},
  {at: '**Stop at Steps** is enabled', name: 'Playback and keys'},
  {at: 'For vector points and handles', name: 'Editing vector paths'},
  {at: 'To let playout change a text or image', name: 'Editable in playout'},
  {at: 'The **Data** pane has tabs', name: 'The Data pane'},
  {at: 'Manage a selected layer', name: 'Data bindings'},

  {at: 'Data fields appear below the preview', name: 'Data fields in fullscreen'},
  {at: 'When the set has Transition Logic, this panel', name: 'Playout controls'},
  {at: 'Choose **Preview** in the main menu', name: 'Fullscreen and other displays'},

  {at: 'Choose **Fullscreen** for the active', name: 'Fullscreen data panel'},
  {at: 'In the template lifecycle preview, **Left/Right', name: 'Keyboard control'},

  {at: 'Use the controls at the lower-right of the canvas', name: 'Canvas zoom'},
  {at: 'Duration fields show seconds', name: 'Duration display'},
  {at: 'New blank templates use one Step', name: 'Short Out'},
  {at: 'In the Timeline, select keys and use', name: 'Copying motion'},
  {at: 'Open **History** from the Window', name: 'History and review'},
  {at: '**Board** captures', name: 'Board'},
  {at: 'In **Data → Test data**', name: 'Test data'},
  {at: 'In **Resources**, use **Import editable SVG**', name: 'Editable imports'},
  {at: 'For a text layer, **Properties → Browse fonts', name: 'Font library'},
  {at: 'Text FX can include multiple', name: 'Text FX animators'},
  {at: 'Per-layer **Motion blur** is', name: 'Motion blur'},
];

/** Section titles for chunks whose source heading doesn't work on its new page. */
export const TITLES = {
  'Workspace, motion and review': 'The start screen',
  'Template thumbnails': 'Thumbnails',
  'Save and export': 'What each export produces',
};

/** Sentences that point somewhere only a single long page could. */
export const REWORDS = [
  [
    'SVGs with companion files use the\nbundle workflow below.',
    'SVGs with companion files use the\n[bundle workflow](/docs/user-guide/layers/svg-photoshop-figma).',
  ],
  ['For recent changes, see the [release notes](releases/0.21.md).\n', ''],
];

/** Anchors that aren't headings in the source. */
export const ANCHOR_ALIASES = {modifiers: 'Smart layout (modifiers)'};

export const GROUPS = [
  {
    dir: 'get-started',
    label: 'Get started',
    description: 'Create, open and save templates, and know which file is which.',
    pages: [
      {
        slug: 'create-a-template',
        title: 'Create a template',
        chunks: ['Creating templates and sets', 'Workspace, motion and review'],
      },
      {slug: 'broadcast-recipes', title: 'Broadcast recipes', chunks: ['Broadcast recipes']},
      {slug: 'file-types', title: 'File types', chunks: ['File types']},
      {slug: 'open-from-a-url', title: 'Open from a URL', chunks: ['Remote project URLs']},
      {slug: 'save-a-template', title: 'Save a template', chunks: ['Save a template']},
    ],
  },
  {
    dir: 'workspace',
    label: 'Studio workspace',
    description: 'Arrange Studio, find your way around it and keep track of your work.',
    pages: [
      {slug: 'workspaces', title: 'Workspaces', chunks: ['Workspaces']},
      {slug: 'properties', title: 'The Properties pane', chunks: ['Editing and animation']},
      {slug: 'scene-outliner', title: 'Scene Outliner', chunks: ['Scene Outliner']},
      {
        slug: 'canvas-and-durations',
        title: 'Canvas zoom and durations',
        chunks: ['Canvas zoom', 'Duration display'],
      },
      {slug: 'settings', title: 'Settings & Preferences', chunks: ['Settings & Preferences']},
      {slug: 'menus-and-shortcuts', title: 'Menus and shortcuts', chunks: ['Menus and shortcuts']},
      {slug: 'dialog-windows', title: 'Moving dialog windows', chunks: ['Moving dialog windows']},
      {
        slug: 'history-and-review',
        title: 'History and review',
        chunks: ['History and review', 'Board', 'AI proposals'],
      },
    ],
  },
  {
    dir: 'template-sets',
    label: 'Template sets',
    description: 'Keep several templates in one document and share controls, assets and brand between them.',
    pages: [
      {slug: 'overview', title: 'Template sets', label: 'Overview', chunks: ['Template sets']},
      {
        slug: 'templates-pane',
        title: 'The Templates pane',
        chunks: ['Templates pane', 'Template thumbnails'],
      },
      {
        slug: 'shared-controls',
        title: 'Shared controls and asset slots',
        chunks: ['Shared controls and asset slots'],
      },
      {slug: 'brand-kit', title: 'Master Brand Kit', chunks: ['Master Brand Kit']},
      {slug: 'components', title: 'Live components', chunks: ['Live components']},
    ],
  },
  {
    dir: 'layers',
    label: 'Layers and content',
    description: 'What you can put on the canvas, from images and text to charts, tickers and clocks.',
    pages: [
      {slug: 'images', title: 'Images', chunks: ['Adding and replacing images']},
      {
        slug: 'svg-photoshop-figma',
        title: 'SVG, Photoshop and Figma',
        chunks: ['SVG and Photoshop exports', 'Editable imports'],
      },
      {slug: 'vector-paths', title: 'Vector paths', chunks: ['Editing vector paths']},
      {
        slug: 'text',
        title: 'Text styles and fonts',
        chunks: ['Mixed text styles and languages', 'Font library'],
      },
      {slug: 'lottie', title: 'Lottie animations', chunks: ['Lottie animations']},
      {
        slug: 'charts',
        title: 'Charts',
        chunks: ['Charts', 'Chart animation', 'Bars and slices animation'],
      },
      {slug: 'patterns', title: 'Procedural patterns', chunks: ['Procedural patterns']},
      {
        slug: 'ticker',
        title: 'Ticker',
        chunks: [
          'Native ticker',
          'Speed, direction and fades',
          'Applying updates',
          'Item content',
          'External feeds',
          'Performance',
        ],
      },
      {
        slug: 'clocks-and-timers',
        title: 'Clocks and timers',
        chunks: [
          'Clocks and timers',
          'Formats',
          'Automatic and manual time',
          'Changing settings on air',
          'Animated changes',
          'Alarms',
        ],
      },
    ],
  },
  {
    dir: 'paint-and-effects',
    label: 'Paint and effects',
    description: 'Fills, transparency, shaders and the effects stack.',
    pages: [
      {
        slug: 'shader-fills',
        title: 'Shader fills',
        chunks: [
          'Shader fills',
          'The shader library',
          'Exposed controls',
          'Animating controls',
          'Image input and limits',
        ],
      },
      {slug: 'fill-transparency', title: 'Fill transparency', chunks: ['Fill transparency']},
      {
        slug: 'effects',
        title: 'Effects stack',
        chunks: [
          'Blending effects',
          'Group effects',
          'Shader effects',
          'Backdrop blur',
          'Bypass and animation',
        ],
      },
    ],
  },
  {
    dir: 'layout',
    label: 'Layout and cropping',
    description: 'Make layers arrange and resize themselves, and trim what shows.',
    pages: [
      {slug: 'automatic-layout', title: 'Automatic layout', chunks: ['Automatic layout']},
      {
        slug: 'smart-layout',
        title: 'Smart layout (modifiers)',
        chunks: ['Smart layout (modifiers)', 'Examples', 'Manage modifiers', 'Limits'],
      },
      {slug: 'preserved-design', title: 'Preserved design resizing', chunks: ['Preserved design resizing']},
      {slug: 'cropping', title: 'Cropping', chunks: ['Cropping']},
    ],
  },
  {
    dir: 'animation',
    label: 'Animation',
    description: 'Keyframes, curves and ready-made motion for layers and text.',
    pages: [
      {
        slug: 'timeline',
        title: 'Timeline and keys',
        chunks: ['Playback and keys', 'Copying motion', 'Short Out'],
      },
      {slug: 'animate-in-out', title: 'Animate In / Out', chunks: ['Animate In / Out']},
      {slug: 'graph-editor', title: 'Animation graph editor', chunks: ['Animation graph editor']},
      {slug: 'fit-duration', title: 'Fit animation duration', chunks: ['Fit animation duration']},
      {slug: 'motion-paths', title: 'Motion paths', chunks: ['Motion paths']},
      {
        slug: 'text-animation',
        title: 'Text animation',
        chunks: [
          'Text animation presets',
          'Counting',
          'Rolling digits',
          'Duration and replay',
          'Text FX animators',
        ],
      },
      {slug: 'motion-blur', title: 'Motion blur', chunks: ['Motion blur']},
    ],
  },
  {
    dir: 'data',
    label: 'Data and rules',
    description: 'Let operators and data feeds change a graphic, and make it respond by itself.',
    pages: [
      {slug: 'fields', title: 'Data fields', chunks: ['The Data pane', 'Data fields']},
      {slug: 'bindings', title: 'Data bindings', chunks: ['Data bindings', 'Editable in playout']},
      {slug: 'connections', title: 'Data connections', chunks: ['Data connections']},
      {
        slug: 'rankings-and-lists',
        title: 'Rankings and paged lists',
        chunks: ['Rankings and paged collections'],
      },
      {slug: 'test-data', title: 'Test data', chunks: ['Test data']},
      {
        slug: 'update-transitions',
        title: 'Data update transitions',
        chunks: ['Designed data update transitions', 'Lanes that update in place'],
      },
      {
        slug: 'visual-rules',
        title: 'Visual rules',
        chunks: [
          'Visual rules',
          'Conditions',
          'Mouse position',
          'Triggers',
          'Actions',
          'Conditional size and position',
          'Playout actions',
          'State and events',
          'Trying rules',
        ],
      },
    ],
  },
  {
    dir: 'media',
    label: 'Sound and media',
    description: 'Sound effects, video and audio clips, and live sources.',
    pages: [
      {slug: 'sound-events', title: 'Sound Events', chunks: ['Sound Events']},
      {
        slug: 'media-cues',
        title: 'Media Cues',
        chunks: [
          'Media Cues',
          'Test with a webcam',
          'A webcam as the background',
          'Camera settings',
          'Real-time only',
        ],
      },
      {slug: 'live-inputs', title: 'Live inputs on objects', chunks: ['Live inputs on objects']},
    ],
  },
  {
    dir: 'transitions',
    label: 'Transitions',
    description: 'Decide how the templates of a set go on and off air together.',
    pages: [
      {
        slug: 'overview',
        title: 'Transitions',
        label: 'Overview',
        chunks: ['Transitions', 'First run'],
      },
      {slug: 'lane-map', title: 'The lane map', chunks: ['The map']},
      {slug: 'shaping-a-moment', title: 'Shaping a moment on stage', chunks: ['Shaping a moment on stage']},
      {slug: 'together-on-air', title: 'Together on air', chunks: ['Together on air']},
      {
        slug: 'rehearse-and-check',
        title: 'Rehearse and check',
        chunks: ['Play the show', 'Checks', 'Behavior preview'],
      },
      {
        slug: 'coordinated-packages',
        title: 'Coordinated packages',
        chunks: [
          'Coordinated package export',
          'Prepare and save',
          'Custom actions for playout',
          'Non-real-time packages',
        ],
      },
      {
        slug: 'mcp',
        title: 'Transitions through MCP',
        chunks: ['MCP authoring', 'Live playout through MCP'],
      },
      {slug: 'news-example', title: 'News example', chunks: ['News example']},
    ],
  },
  {
    dir: 'preview-and-export',
    label: 'Preview and export',
    description: 'Check a graphic the way playout will show it, then deliver it.',
    pages: [
      {
        slug: 'preview-pane',
        title: 'The Preview & Export pane',
        chunks: [
          'Preview and export',
          'Browse and play templates',
          'Data fields in fullscreen',
          'Playout controls',
          'Fullscreen and other displays',
        ],
      },
      {
        slug: 'lifecycle-preview',
        title: 'Single-template lifecycle preview',
        label: 'Lifecycle preview',
        chunks: ['Single-template lifecycle preview', 'Fullscreen data panel', 'Keyboard control'],
      },
      {slug: 'program-monitor', title: 'Program monitor', chunks: ['Program monitor']},
      {
        slug: 'export-packages',
        title: 'Export packages',
        chunks: [
          'Save and export',
          'Open the export options',
          'Choose the thumbnail',
          'Export a whole set',
          'Licences in exports',
          'DaVinci Resolve',
        ],
      },
      {
        slug: 'exported-preview-page',
        title: 'The exported preview page',
        chunks: ['The exported preview page', 'Trust and browser permissions'],
      },
      {
        slug: 'load-in-nodos',
        title: 'Load an exported graphic in Nodos',
        label: 'Load in Nodos',
        chunks: ['Load an exported graphic in Nodos'],
      },
      {
        slug: 'nodos-presets',
        title: 'Nodos presets',
        chunks: [
          'Nodos presets',
          'Keeping presets up to date',
          'What Studio serves',
          'Input slots',
          'Fields and pin types',
          'Nodos types',
          'Requirements and limits',
        ],
      },
      {
        slug: 'on-a-website',
        title: 'Use an exported graphic on a website',
        label: 'On a website',
        chunks: ['Use an exported graphic in a tutorial website'],
      },
      {slug: 'compatibility', title: 'Compatibility notes', chunks: ['Compatibility notes']},
    ],
  },
  {
    dir: 'plugins',
    label: 'Plugins',
    description: 'Add chart renderers, animation presets and shaders to Studio.',
    pages: [
      {slug: 'plugins-pane', title: 'The Plugins pane', chunks: ['Plugins']},
      {slug: 'manage-plugins', title: 'Install and manage plugins', chunks: ['Manage plugins']},
      {slug: 'animation-packs', title: 'Animation preset packs', chunks: ['Animation preset packs']},
      {slug: 'shader-packs', title: 'Shader packs', chunks: ['Shader packs']},
    ],
  },
];
