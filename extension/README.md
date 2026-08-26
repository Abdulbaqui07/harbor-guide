# Harbor Finder

A Chrome extension that highlights the Harbor Terminal Portal in real search
results, so a first-time user can tell which link is the one they sign in to.

## Why this exists as an extension

The portal's own onboarding covers everything from the moment a user arrives.
It cannot cover the step before that. A web page cannot read or restyle a search
engine's results - the browser's same-origin policy forbids it, and rightly so,
because any site could otherwise rewrite what a search looks like.

Highlighting a real result therefore requires code running with an explicit
permission for that host, which means an extension. `/guide/search` in the app
recreates the same moment for anyone who has not installed this.

## Install

1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. **Load unpacked**, and choose this `extension/` folder
4. Search for something that surfaces the portal, for example
   `harbor terminal portal container gate release`

The matched result gets a ring and a note, the others dim, and the page scrolls
to it. If the domain is not on that page of results, a small toast says so
rather than leaving you guessing.

Click the toolbar icon to change the domain - it is configuration, not a
hardcoded string, so the same extension works for any deployment.

## Permissions, and why each one

| Permission | Reason |
|---|---|
| `storage` | Remembers the configured domain and the on/off switch |
| `https://www.google.com/*`, `https://www.bing.com/*`, `https://duckduckgo.com/*` | The only pages the content script runs on |

There is no `tabs` permission, no `<all_urls>`, no background service worker and
no network access. The extension cannot see your browsing history and cannot
talk to any server, including Harbor's. It reads the result links on the page it
is already on and changes how they look.

## How the matching works

Search engines rewrite their markup often, so the script does not depend on one
selector. It finds anchors whose hostname matches the configured domain -
including destinations wrapped in a redirect parameter, which is how these
engines usually emit links - then walks up to the smallest ancestor that looks
like a whole result block, trying engine-specific selectors first and falling
back to a structural heuristic.

Results are also injected after first paint, so a `MutationObserver` watches for
six seconds instead of reading the DOM once.
