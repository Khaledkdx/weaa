---
name: animation-pipeline
description: Run the emilkowalski animation and UI skills in one fixed order for this project, so each step hands a clear result to the next. Use when building, changing, or reviewing motion or polish in the weaa web frontend, or when the user asks how the animation skills should work together. Do not use for Swift or React Native-only work except where noted.
---

# Animation pipeline

The project's animation skills already link to each other. This skill sets the order and the handoff between steps, so the result is checked before it is called done.

Project stack: React + Vite web frontend in `frontend/`. Use the web path unless the work is a native app.

## Routing

| Situation | Start with |
|---|---|
| Find what should move | `find-animation-opportunities` |
| Build a new motion | `animate` |
| Fix an existing motion or a whole-codebase audit | `improve-animations` |
| Check a diff before it ships | `review-animations` |
| Frame drops, jank, stutter | `animation-performance` |
| Remove motion that adds nothing | `remove-animations` |
| Name an effect the user described vaguely | `animation-vocabulary` |
| Toasts | `ask-sonner` |
| Feels like a website, not an app, on a phone | `mobile-native` |
| Stress test with worst-case data | `break-ui` |
| Gesture-driven or sheet UI, Apple-style feel | `apple-design` |
| Pick a library for a task | `pick-ui-library` (only when explicitly invoked) |
| Compare several versions of a UI piece | `prototype` (only when explicitly invoked) |
| React Native / Expo | `animate-expo` instead of `animate` |
| Swift | `write-swift`, outside this project |

## Order for new or changed motion

1. **Decide.** `find-animation-opportunities` proposes places and exact values. Drop anything it rejects. Use `animation-vocabulary` if the request is vague.
2. **Build.** For any UI surface (sheets, gestures, materials, typography), read `apple-design` first for the feel targets. Then `animate` writes the motion. The output must state the purpose, the properties animated, the curve and duration, and how it interrupts and exits.
3. **Check performance.** `animation-performance` confirms only composite-friendly properties move and the frame budget holds. Skip only for static or non-animated changes.
4. **Review.** `review-animations` reads the diff. Its default is to flag. Fix every flagged item, then review again if the fix changed the motion.
5. **Break it.** `break-ui` runs the component with worst-case data. Fix layout breaks before shipping.
6. **Subtract.** `remove-animations` runs last on a finished screen to cut motion that does not earn its place.

Phone-specific work adds `mobile-native` after step 2. Toast work uses `ask-sonner` at step 2.

## Handoff contract

Each step passes these to the next, in plain text:

- **From decide:** list of places, each with the motion and exact values, plus rejected places and why.
- **From build:** changed files, the motion decisions above, and any property the performance step must check.
- **From performance:** pass or the specific cause of the dropped frames.
- **From review:** flagged items with file and line, and the status of each (fixed or not).
- **From break:** breaks found and what was fixed.

Do not call the work done while a review item or a performance failure is still open.

## Rules

- Run the steps in order. Do not start `review-animations` before `animate` has produced its output.
- Do not edit the upstream skill files in `.agents/skills/`. They are pinned in `skills-lock.json`. Put project rules here instead.
- Keep the animation on the web path and the project's own components. Do not add a motion library the project does not already use without asking.
- Respect `prefers-reduced-motion`. The project already handles it in `frontend/src/glass.css`. New motion must follow the same rule.
