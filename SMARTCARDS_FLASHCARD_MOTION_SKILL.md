---
name: smartcards-flashcard-motion
version: 1.0.0
scope: SmartCards React/Vite frontend flashcard study experience
purpose: Add refined, accessible flip and directional navigation animations without changing study behavior or the premium editorial design system.
---

# SmartCards — Flashcard Motion Design & Engineering Skill

## 1. Mission

Add two **clearly perceptible but refined** animations to SmartCards flashcards:

1. **Reveal / conceal:** a real 3D card **flip around the Y axis** when the user reveals the answer, and a reverse flip when returning to the question.
2. **Next / previous:** a **direction-aware slide + fade** between flashcards, with forward navigation moving in the opposite visual direction from backward navigation.

This skill **extends**, and never replaces, `SMARTCARDS_PREMIUM_EDITORIAL_DESIGN_SKILL.md`. Motion should resemble turning a carefully printed study card or moving between pages of a journal: tactile, precise, unobtrusive. It must **not** become playful, springy, flashy, gamified or distracting.

The existing application is React/Vite with Tailwind. Preserve all business logic, generation requests, quiz behavior, API responses, Groq, Redis, authentication-free access, dialogs, state management semantics and error behavior.

## 2. Preferred implementation stack and references

**Recommended:** [Motion for React](https://motion.dev/docs/react) (previously associated with Framer Motion). Install **only** if not already a direct frontend dependency:

```bash
cd frontend
npm install motion
```

```jsx
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
```

Why: declarative React components, exit/enter handling, custom directional variants and reduced-motion utilities, without introducing a broader UI framework. Use CSS `perspective` and `backface-visibility` for the genuine two-sided 3D geometry; Motion animates the card's rotation and directional page transition.

Authoritative references:
- Install/API: https://motion.dev/docs/react-installation
- Presence and directional custom variants: https://motion.dev/docs/react-animate-presence
- Reduced-motion hook: https://motion.dev/docs/react-use-reduced-motion
- Accessibility guidance: https://motion.dev/docs/react-accessibility
- Transitions/easings: https://motion.dev/docs/react-transitions
- Open-source repository: https://github.com/motiondivision/motion

**Do not copy GitHub demos blindly.** Check actual installed API/version and adapt to SmartCards' current component/state structure. Do not install `framer-motion` alongside `motion` unless existing code genuinely requires it. Do not add GSAP, React Spring, animation utilities or component frameworks for these two effects. A CSS-only solution is acceptable only if it meets the same exit animation, direction, accessibility and testing requirements; prefer Motion for coordinated React state changes.

## 3. Visual and timing specification

| Interaction | Duration | Movement | Easing | Notes |
|---|---|---|---|---|
| Reveal answer | ~420–520 ms | `rotateY: 0 → 180deg` | `easeInOut` or carefully damped cubic bezier | One continuous flip, no bounce |
| Hide answer | ~420–520 ms | `rotateY: 180 → 0deg` | Same | Reverse the same motion |
| Next flashcard | ~220–300 ms out + ~220–300 ms in | Previous exits **left** ~24–40px; next enters from **right** | Smooth ease-out | Muted opacity fade; no scale bounce |
| Previous flashcard | Same | Current exits **right**; prior enters from **left** | Same | Direction must reverse |
| Reduced motion | Immediate or ≤100 ms opacity only | **No 3D rotation, no positional slides** | Linear/ease-out | Content and actions still work |

These are starting ranges, not hardcoded universal laws. Keep transitions perceptible without making a learner wait. Do not chain delays or animate every sub-element. The dominant visual is the **card itself**, not accompanying decoration.

### Visual consistency
- Preserve the premium editorial palette, spacing, card proportions, subtle border and soft shadow.
- Provide an appropriate `perspective` (e.g. 1100–1500px) on a stable parent; `transform-style: preserve-3d` on the rotating inner card.
- Place the front and back on the same footprint and use `backface-visibility: hidden` with vendor fallback if needed.
- Back face starts at `rotateY(180deg)` and appears upright when parent rotation reaches `180deg`.
- Never briefly show mirrored or overlapping text, or have the card collapse in height mid-animation.
- Keep a stable minimum card height or a deliberate content-size strategy for long questions/answers; do not clip study text at mobile widths or 200% zoom.
- Background/palette can differentiate question and answer very subtly, but do not introduce bold colors/glows/confetti.

## 4. Interaction and state model

Before editing, inspect `FlashcardList.jsx`, `StudyNavigation.jsx`, `StudyDialog.jsx`, the dashboard that mounts them, and `study.test.jsx`. Identify the **existing source of truth** for the current card index, revealed-answer state and focus mode. Reuse this instead of inventing a second independent index or reveal flag.

### Required transition behavior

- Initial flashcard appears **without** an unnecessary entrance animation (`initial={false}` or equivalent).
- The card's **question side is visible first**.
- Clicking or activating the existing reveal/hide control flips the card without changing its index.
- If the card itself is clickable, distinguish that from nested controls; avoid double toggles and event bubbling bugs.
- On **Next**, the current card exits left and the next enters from right.
- On **Previous**, the current card exits right and the previous enters from left.
- The **new card starts on the question side**, regardless of the outgoing card's reveal state, unless the existing product explicitly requires remembering each card's revealed state. Document the observed existing behavior before choosing.
- If a user advances while a flip is in progress, resolve deterministically to the next card's question-facing state; never show the old answer on the new card.
- At first/last card, existing disabled/clamp/wrap semantics must remain unchanged. No fabricated motion when the index doesn't change.
- Repeated rapid Next/Previous/Reveal actions should not produce stacked ghost cards, wrong directional exits, blank screens, stale answers or lost focus.
- A dataset change (new generation or removing/replacing document) resets transient animation state and never animates old content into the new deck.
- Focus mode and normal mode should preserve the same flip/navigation logic; avoid duplicated implementations.
- Maintain existing arrow-key navigation and ensure it does not interfere with Escape or buttons/dialogs.

### Recommended component arrangement (adapt to actual code)

```text
FlashcardList (owns or receives index + reveal state)
└── FlashcardViewport (stable layout + perspective)
    └── AnimatePresence (keyed by stable card identity/index; direction via custom)
        └── motion.div (slide/fade for current card)
            └── motion.div (rotateY flip, front + back)
                ├── Question face
                └── Answer face
```

Crucial separation: **the outer wrapper moves between cards**; **the inner wrapper flips a single card**. Don't apply slide and rotateY to the same element if this makes transforms overwrite or compound unpredictably.

### Directional navigation illustration (adapt; not a drop-in replacement)

```jsx
const pageVariants = {
  enter: (direction) => ({ x: direction > 0 ? 32 : -32, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction > 0 ? -32 : 32, opacity: 0 }),
}

<AnimatePresence initial={false} mode="wait" custom={direction}>
  <motion.div
    key={cardIdentity}
    custom={direction}
    variants={pageVariants}
    initial="enter"
    animate="center"
    exit="exit"
    transition={{ duration: 0.24, ease: 'easeOut' }}
  >
    {/* 3D card implementation */}
  </motion.div>
</AnimatePresence>
```

`mode="wait"` is a good starting choice for one card at a time, **but verify rapid reverse navigation**. Motion's `custom` prop on `AnimatePresence` is important for changing the outgoing element's dynamic exit direction. State updates should not rely on fixed `setTimeout` guesses. Prevent stale direction if index updates come from multiple paths (arrow keys, buttons, focus mode).

### Flip geometry illustration (adapt; not a drop-in replacement)

```jsx
<div className="flashcard-perspective">
  <motion.div
    className="flashcard-inner"
    animate={{ rotateY: isRevealed && !reduceMotion ? 180 : 0 }}
    transition={reduceMotion ? { duration: 0 } : { duration: 0.46, ease: 'easeInOut' }}
  >
    <div className="flashcard-face flashcard-front">{/* question */}</div>
    <div className="flashcard-face flashcard-back">{/* answer */}</div>
  </motion.div>
</div>
```

```css
.flashcard-perspective { perspective: 1200px; }
.flashcard-inner { position: relative; transform-style: preserve-3d; }
.flashcard-face { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
.flashcard-back { transform: rotateY(180deg); }
```

**Reduced-motion caveat:** Simply disabling the rotation while leaving the back face hidden will make the answer inaccessible. Under reduced motion, explicitly switch the active face (conditional rendering/visibility) so answers are immediately readable. This is a functional requirement, not optional polish.

## 5. Accessibility and content visibility

- A card flip is **not** a replacement for a meaningful accessible control. Preserve a clearly labeled **Reveal answer / Hide answer** button (or equivalent). If clicking the card flips it, keep keyboard activation and explicit action semantics.
- Only the **currently visible face** should be exposed to the accessibility tree and keyboard tab order. Use conditional `aria-hidden`, `inert` where supported, or a robust equivalent. The offscreen/backface text must not be announced as simultaneously visible.
- Beware of timing: if the screen-reader state switches when the visual card reaches 90 degrees, test readability and focus transitions; if switching at animation start, ensure no mixed content leaks. Prefer a simple accessible source of truth with verified live region behavior.
- When a new card becomes active, its question and progress should be discoverable. Avoid overly verbose repeated announcements for each animation frame.
- Keep keyboard focus stable on Next/Previous controls unless the existing experience intentionally moves it. Never focus an exiting/unmounted card unexpectedly.
- Existing ArrowLeft/ArrowRight interactions, Escape for dialogs, focus-mode controls, and touch interactions must keep working.
- Avoid swiping gestures initially; they can conflict with browser scrolling and are not required by this task.
- Maintain adequate contrast and clear focus indicators under all animations. Animations must not be required to understand the answer.

## 6. Reduced-motion requirements

Use `useReducedMotion()` from `motion/react`, or `MotionConfig reducedMotion="user"` **plus explicit state handling** for the two-sided card. `MotionConfig` alone is not sufficient to decide which backface text is presented when rotation is disabled.

- **Flip:** switch question ↔ answer immediately, without 3D rotation.
- **Navigation:** replace slide with an immediate content switch or very brief opacity fade (no x translation).
- Do not hide the answer behind a permanently back-facing element.
- Test preference on and off; ideally test changing the OS preference during a session.
- The interface must be fully usable with CSS animation disabled or Motion animation bypassed.

## 7. React lifecycle and performance

- Animate `transform` and `opacity` predominantly. Avoid animating `height: auto`, expensive blur, box-shadow or layout where not necessary.
- Use stable keys for individual cards; don't key only on array index if the deck can be replaced with the same length and index.
- Prefer declarative variants over scattered manual DOM manipulation.
- Don't call `setState` from effects merely to mirror props; avoid stale closures and redundant animation states.
- Clean up any subscriptions, observers or timers. Prefer no timers.
- Don't mount *all* flashcards for simultaneous animation. At most one leaving card and one entering card should be temporarily mounted.
- Prevent layout shift or clipped content at 320px widths and 200% zoom.
- Don't add sound, vibration, autoplay, progress gamification, or GPU-heavy particle effects.

## 8. Test plan (required)

Extend existing React Testing Library / Vitest coverage. JSDOM does **not** accurately simulate actual transforms, so use unit tests for behavior and browser tests for visual verification.

**Unit/integration tests:**
1. Question is first; Reveal exposes answer; Hide returns to question.
2. Next goes forward; Previous goes backward; the correct question/answer is shown.
3. Direction state or passed variants correctly encode +1 for Next and −1 for Previous.
4. Revealed card → Next shows next question, not stale answer; Previous likewise.
5. Rapid Next/Previous and reveal toggles preserve valid index and side.
6. First/last card boundaries preserve existing behavior.
7. Keyboard arrows still work; Escape/focus mode and focus restoration remain correct.
8. Only active face is accessible to screen readers; hidden face is not in interactive tab order.
9. Reduced motion reveals answer without depending on 3D geometry and navigates without positional animation.
10. Deck replacement or removal resets transient state without leaked old content.
11. Existing quiz and upload tests still pass.

**Browser verification (Playwright or available browser tool; do not claim it ran if unavailable):**
- Desktop: Chrome/Chromium; mobile-size viewport; reduced-motion emulation.
- Verify a visible full flip without mirrored text and backward/forward directional transitions.
- Test rapid navigation, repeated reveal, focus mode, long answer wrapping, mobile height, dark overlay if present, 200% zoom, and keyboard-only usage.
- Check for ghosting, z-index issues, clipping, sudden card height jumps and unwanted scroll.
- Optional WebKit/Safari validation if tools are available.

## 9. Deliverables and boundaries

Change only frontend components, styles, relevant tests, package manifest/lockfile (for `motion`), and concise frontend documentation. No backend changes. No live Groq calls. No API or schema changes. No new persistence. No commits, pushes or deployments without explicit instruction.

When finished, report: components/files touched, exact animation timings, library/dependency choice, keyboard/accessibility treatment, reduced-motion behavior, test results, browser checks actually performed, unresolved limitations, and proposed Conventional Commit message.

## 10. Definition of done

- [ ] Answer reveal/hide uses a clear 3D Y-axis flip in normal motion.
- [ ] Next/Previous animate in opposite directions with slide + fade.
- [ ] Normal and focus mode work consistently.
- [ ] No mirrored text, ghost cards, stale answers or flicker in browser testing.
- [ ] Controls remain accessible and only the active face is exposed to screen readers.
- [ ] Reduced motion fully works without requiring 3D rotation or translation.
- [ ] Existing navigation, async handling, API contracts and study state are preserved.
- [ ] All frontend/backend tests, build, lint and `git diff --check` pass.
- [ ] Premium/editorial aesthetic remains intact: motion is present but never theatrical.

**Final rule:** Motion should help the learner understand **which side** and **which card** they are viewing. If it draws more attention than the question, reduce it.
