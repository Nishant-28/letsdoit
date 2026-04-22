import posthog from "posthog-js";
import { useEffect } from "react";
import { useLocation } from "react-router";

const POSTHOG_KEY = process.env.VITE_PUBLIC_POSTHOG_KEY ?? "";
const POSTHOG_HOST = process.env.VITE_PUBLIC_POSTHOG_HOST ?? "";

if (POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false, // We handle pageviews manually via usePageView
    capture_pageleave: true,
  });
}

export function usePageView() {
  const location = useLocation();

  useEffect(() => {
    posthog.capture("$pageview", { $current_url: window.location.href });
  }, [location.pathname, location.search]);
}

export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (POSTHOG_KEY) {
    posthog.capture(eventName, properties);
  }
}

export function useIdentifyUser(user: { _id: string; email: string; name: string; role: string; intent?: string } | null | undefined) {
  useEffect(() => {
    if (user && POSTHOG_KEY) {
      posthog.identify(user._id, {
        email: user.email,
        name: user.name,
        role: user.role,
        intent: user.intent,
      });
    } else if (user === null && POSTHOG_KEY) {
      posthog.reset();
    }
  }, [user]);
}
