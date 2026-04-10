"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  forcedTheme,
}: {
  children: React.ReactNode;
  forcedTheme?: "light" | "dark";
}) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={forcedTheme ?? "light"}
      forcedTheme={forcedTheme}
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
