# Codex prompt — Animate SmartCards flashcards

Read `SMARTCARDS_FLASHCARD_MOTION_SKILL.md` and `SMARTCARDS_PREMIUM_EDITORIAL_DESIGN_SKILL.md` in full. Use the motion skill as the implementation specification and the premium/editorial skill as the visual authority. Inspect the current frontend and tests before editing; adapt the guide to the actual code instead of assuming the sample JSX is drop-in code.

**Task:** Add refined animations to the existing SmartCards flashcard experience only:

1. Revealing and hiding an answer should perform a smooth, real 3D Y-axis card flip.
2. Moving to the next flashcard should slide/fade the current card left while the next enters from the right; moving to the previous card should reverse the direction.

Prefer `motion` (`npm install motion`, imports from `motion/react`) and native CSS 3D backface geometry. Do not install additional animation libraries unless the preferred approach is incompatible with this repository and you document the reason. Reference current official docs linked in the skill.

**Animation character:** premium, editorial, tactile, and restrained. Recommended timings: flip ~460 ms; directional transition ~240 ms per entering/exiting phase. No bounces, confetti, dramatic spins, gradients, decorations, or UI redesign.

**Implementation requirements:**
- Preserve the current index and revealed-side state model, flashcard data, focus mode, quiz logic and all API/backend behavior.
- Ensure each new flashcard starts question-side unless established behavior dictates otherwise; reset correctly on deck replacement/removal.
- Preserve keyboard left/right navigation, accessible Reveal/Hide controls, dialogs, Escape/focus restoration, mobile usability and current tests.
- Keep directional slide separate from the nested flip transform so the animations do not conflict.
- Handle rapid clicks/keys, reverse direction mid-transition, long content and first/last boundaries without ghost/stale cards.
- Ensure only the visible face is accessible to assistive technology; hidden face must not be focusable or announced at the same time.
- Respect reduced motion: no rotation or movement; switch question/answer instantly or with a tiny opacity fade. Do not accidentally hide the back face under reduced motion.
- Avoid duplicate state, arbitrary `setTimeout` delays, unnecessary rendering of the entire deck and new dependencies beyond Motion.
- Keep unchanged: anonymous access, upload and generation behavior, Groq and Redis settings, original active prompts, rate limits, output schemas and response envelopes.

**Verification:**
- Add deterministic Vitest/React Testing Library tests for flip/reveal state, forward and reverse navigation direction, rapid interaction, card-change reveal reset, keyboard/focus behavior, active-face accessibility and reduced-motion fallback.
- Run frontend tests, build, lint; backend unittest suite; and `git diff --check`.
- If browser tools are available, inspect the animations visually at desktop and mobile sizes and with reduced motion, keyboard use and 200% zoom. Report honestly if browser rendering was not tested.

**Constraints:** Frontend only. No live Groq calls. No backend changes. No commits, pushes, deployments or unrelated roadmap steps.

**Final report:** Summary of behavior, changed files, actual timings/easings, dependency additions, tests and visual checks performed, accessibility and reduced-motion details, remaining caveats, and suggested Conventional Commit message.
