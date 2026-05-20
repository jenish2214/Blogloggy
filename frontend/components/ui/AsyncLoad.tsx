"use client";

import { PageState, type PageStateSkeleton } from "@/components/ui/PageState";

type AsyncLoadProps = {
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  children: React.ReactNode;
  label?: string;
  loadingMessages?: string[];
  variant?: "page" | "section" | "inline";
  skeletonCount?: number;
  isEmpty?: boolean;
  empty?: React.ReactNode;
};

function variantToSkeleton(variant: AsyncLoadProps["variant"]): PageStateSkeleton {
  if (variant === "page") return "page";
  if (variant === "inline") return "grid";
  return "grid";
}

export function AsyncLoad({
  loading,
  error,
  onRetry,
  children,
  label = "Loading data…",
  loadingMessages,
  variant = "section",
  skeletonCount = 6,
  isEmpty,
  empty,
}: AsyncLoadProps) {
  if (variant === "inline" && loading) {
    return (
      <PageState
        loading
        loadingLabel={label}
        loadingMessages={loadingMessages}
        skeleton="grid"
        skeletonCount={3}
      >
        {null}
      </PageState>
    );
  }

  return (
    <PageState
      loading={loading}
      error={error}
      onRetry={onRetry}
      loadingLabel={label}
      loadingMessages={loadingMessages}
      skeleton={variantToSkeleton(variant)}
      skeletonCount={skeletonCount}
      isEmpty={isEmpty}
      empty={empty}
    >
      {children}
    </PageState>
  );
}
