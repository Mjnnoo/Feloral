"use client";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import {
  ReactNode,
  useState,
} from "react";

import {
  CmsEditorProvider,
} from "@/components/cms/cms-editor-provider";

export function AppProviders({
  children,
}: {
  children: ReactNode;
}) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <CmsEditorProvider cms={null}>
        {children}
      </CmsEditorProvider>
    </QueryClientProvider>
  );
}