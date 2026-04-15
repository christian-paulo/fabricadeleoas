

## Plan: Move Badges to Homepage with Animated Carousel

### What changes

**1. Remove badges section from Evolucao.tsx (lines 425-459)**
- Delete the "Suas Conquistas" card and related badge imports/state

**2. Add badges carousel section to Dashboard.tsx**
- Position: between the "Meta semanal" card (line 141) and "Protocolos" section (line 143)
- Fetch `user_badges` data on Dashboard mount
- New section includes:

**Progress bar header:**
- Text: "2 de 5 conquistas desbloqueadas"
- Thin pink progress bar with animated fill on load

**Horizontal scrollable carousel:**
- 90×90px square cards with horizontal scroll (swipe)
- Badge emoji centered at 40px, name below in small bold text
- Earned: pink-tinted background (`bg-primary/10`), full-color emoji
- Locked: gray background (`bg-muted/40`), grayscale emoji with small Lock icon overlay at bottom-right

**Animations (via Tailwind + inline styles):**
- Earned badges: staggered fade + slide-up (100ms delay between each)
- Locked badges: pulse animation on lock icon every 3s via CSS keyframes
- Recently earned badge (earned today): pop animation (scale 0.8→1.2→1.0) with pink glow shadow
- New custom keyframes added to `tailwind.config.ts`: `badge-pop` and `lock-pulse`

**Interactions:**
- Tap locked badge → show a small popover/tooltip with trigger description (e.g., "Complete 5 treinos para conquistar este badge")
- Tap earned badge → show popover with earned date formatted in pt-BR (e.g., "Conquistado em 15 de abril 🎉")

**3. Update tailwind.config.ts**
- Add `badge-pop` keyframe animation
- Add `lock-pulse` keyframe for the padlock

### Files modified
- `src/pages/Dashboard.tsx` — add badges fetch, carousel section, popover interactions
- `src/pages/Evolucao.tsx` — remove badges section (lines 425-459) and unused badge imports
- `tailwind.config.ts` — add badge-specific animations

### Technical notes
- Use Popover from `@/components/ui/popover` for tap interactions
- Confetti/particles effect skipped in favor of the pop+glow animation for simplicity and performance
- Badge earned "today" detection: compare `earned_at` date with current date

