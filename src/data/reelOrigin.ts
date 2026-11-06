import {MODEL, type ExampleOrigin} from './examples';

/** The homepage reel's prompts, in order. Add one when a new prompt changes the reel. */
export const REEL_ORIGIN: ExampleOrigin = {
  model: MODEL,
  generationTime: 'About 1 hour',
  prompts: [
    'Replace the static image at the top of the homepage with a dynamic carousel. Build it with OGraf Studio and make it run in our web player. It should show these features: Transition Logic, shaders, touch-enabled controls, media capabilities, and AI (both in-Studio assistance and MCP).',
    'Give all our web players a checkered background by default, with controls for changing it.',
    'Make the carousel about 80% of its size, so the feature bar under it fits in a 1920×1080 browser without scrolling.',
    "Make these changes:\n• Move the carousel's menu to the left and show its controls on the right.\n• Add the webcam as a background option.\n• Add a good-looking ticker that can be turned on and off from the controls.\n• Add mouse hover effects to the buttons in the touch example, because they are easy to miss.\n• Add sound effects to the media example, and use Big Buck Bunny for its video.",
    'Add a beautiful charts slide. Across the website, limit the background options to dark checker, custom colour, webcam and your own image.',
    'Make these changes:\n• Use the font from ograf.ebu.io across the website.\n• Give the ticker the OGraf Studio logo on a gradient background, and line it up with the lines in the attached image.\n• On the Transition Logic slide, show the webcam inside the small screen, with the transparent signal glitch shader.\n• Remove the "TAP" text from the tabs on the touch slide.\n• Use better colours for the pie chart on the Charts slide.\n• Add a control that folds the carousel menu to the left.\n• Add a shadow to text on the transparent background, so it stays readable on a light background.',
    'Apply the signal glitch shader parameters shown in this screenshot.',
    "Add two slides. One shows OGraf Studio itself, because the website doesn't show the product's interface or the editor's features. The other invites people to join our OGraf Studio LinkedIn group, with the link and a visual message.",
    'On The Editor slide, add the TVBEurope award logo. On the AI and MCP slide, mention the skills that teach models how to use the editor best.',
  ],
};
