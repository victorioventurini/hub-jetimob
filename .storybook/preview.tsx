import type { Preview } from "@storybook/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";

import "../src/index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "hsl(210 20% 98%)" },
        { name: "dark", value: "hsl(222 47% 6%)" },
        { name: "card", value: "hsl(0 0% 100%)" },
      ],
    },
    layout: "centered",
    docs: {
      toc: true,
    },
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light">
          <BrowserRouter>
            <div className="font-sans">
              <Story />
              <Toaster />
            </div>
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    ),
  ],
  tags: ["autodocs"],
};

export default preview;
