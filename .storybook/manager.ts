import { addons } from "@storybook/manager-api";
import { create } from "@storybook/theming/create";

const jetTheme = create({
  base: "light",
  
  // Brand
  brandTitle: "Hub da Jet - Design System",
  brandUrl: "/",
  brandTarget: "_self",
  
  // Colors
  colorPrimary: "hsl(217 91% 60%)",
  colorSecondary: "hsl(222 47% 11%)",
  
  // UI
  appBg: "hsl(210 20% 98%)",
  appContentBg: "hsl(0 0% 100%)",
  appPreviewBg: "hsl(210 20% 98%)",
  appBorderColor: "hsl(214 32% 91%)",
  appBorderRadius: 12,
  
  // Text colors
  textColor: "hsl(222 47% 11%)",
  textInverseColor: "hsl(210 40% 98%)",
  textMutedColor: "hsl(215 16% 57%)",
  
  // Toolbar
  barTextColor: "hsl(215 16% 57%)",
  barSelectedColor: "hsl(217 91% 60%)",
  barHoverColor: "hsl(222 47% 11%)",
  barBg: "hsl(0 0% 100%)",
  
  // Form colors
  inputBg: "hsl(0 0% 100%)",
  inputBorder: "hsl(214 32% 91%)",
  inputTextColor: "hsl(222 47% 11%)",
  inputBorderRadius: 8,
  
  // Button
  buttonBg: "hsl(217 91% 60%)",
  buttonBorder: "hsl(217 91% 60%)",
  
  // Fonts
  fontBase: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontCode: '"Fira Code", "JetBrains Mono", monospace',
});

addons.setConfig({
  theme: jetTheme,
  sidebar: {
    showRoots: true,
    collapsedRoots: ["other"],
  },
  toolbar: {
    title: { hidden: false },
    zoom: { hidden: false },
    eject: { hidden: false },
    copy: { hidden: false },
    fullscreen: { hidden: false },
  },
});
