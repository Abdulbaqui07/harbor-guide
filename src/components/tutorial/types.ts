export type TutorialAction = "click" | "input" | "select" | "observe";

export type Step = {
  sequence: number;
  page: string;
  targetId: string;
  title: string;
  message: string;
  action: TutorialAction;
  expectedValue: string | null;
};

export type Tutorial = {
  id: string;
  slug: string;
  title: string;
  description: string;
  version: number;
  source: string;
  steps: Step[];
};

export type Rect = { top: number; left: number; width: number; height: number };

/** Where each page lives, so a stray user can be sent back to the step. */
export const PAGE_PATHS: Record<string, string> = {
  login: "/login",
  dashboard: "/dashboard",
  search: "/search",
  "container-detail": "/containers/MSKU7482913",
  "new-request": "/requests/new?container=MSKU7482913",
  requests: "/requests",
};

export const PAGE_LABELS: Record<string, string> = {
  login: "the sign-in screen",
  dashboard: "the dashboard",
  search: "the container search",
  "container-detail": "the container details",
  "new-request": "the request form",
  "request-confirmation": "the confirmation screen",
  requests: "your requests",
};
