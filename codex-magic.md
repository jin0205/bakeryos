# Magic UI Pro Integration Notes

## Goal

Use Magic UI Pro to make BakeryOS feel more polished and premium without making the working app feel like a marketing demo. The landing page can carry more atmosphere and motion. The app should stay dense, scannable, and operational.

## High-Level Recommendation

Magic UI Pro is a good fit, but the integration should be selective:

- Use expressive motion on the marketing landing page.
- Use restrained, task-supporting motion inside the app.
- Keep the existing sidebar navigation.
- Add Magic UI components gradually behind small, reusable local wrappers.
- Treat any Magic UI Pro API key, token, or license credential as a secret and keep it out of source control.

## Best Component Fit

### Landing Page

The landing page is the best place for the more visually expressive Magic UI Pro components.

Recommended components:

- Aurora or particle-style hero background for first impression.
- Animated Beam for the product workflow.
- Shimmer Button for the primary CTA.
- Bento Grid for feature pillars.
- NumberTicker only for truthful, defensible metrics.
- Marquee only when there is real testimonial or feature copy.

Suggested workflow visual:

```text
Formula -> Batch Plan -> Work Order -> Cost Check -> Production Output
```

Avoid unsupported or exaggerated claims such as:

```text
500+ recipes managed
30% average cost reduction
10x faster batch scaling
```

Use grounded copy unless those claims are backed by real data.

### App Dashboard

The dashboard can benefit from a bento-style layout, but it should remain practical.

Recommended panels:

- Today's Schedule as the largest panel.
- Active Work Orders as a prominent operational panel.
- Low Stock Items as a warning/status panel.
- Batch Plan as a planning panel.
- Formula Library count as a compact reference panel.
- Cost or margin summary if the data is already available.

Use NumberTicker sparingly on top-level KPI values only. Avoid animating every number in tables or frequently changing operational data.

### Recipe Library

Do not replace the existing table outright with cards. The table is useful for commercial bakery work because it supports scanning, comparison, and quick action.

Better options:

- Add a table/card view toggle.
- Use Magic Card only for a "recent formulas" or "featured formulas" panel.
- Add subtle hover/focus polish to existing rows.

### Navigation

Do not replace the current sidebar with a Dock. The app has nested navigation and operational workflows that benefit from the sidebar structure.

Good Dock usage:

- Floating quick actions.
- New Formula.
- New Work Order.
- Scale Formula.
- Import Formula.
- Open AI Assistant.

## Suggested Rollout Order

1. Landing page hero and CTA polish.
2. Landing page Animated Beam workflow.
3. Dashboard bento layout.
4. NumberTicker for top KPIs.
5. Floating quick-action dock inside the app.
6. Recipe library polish after deciding table, card, or toggle.
7. Marquee/testimonials after real copy exists.

## Implementation Guardrails

### Keep Motion Accessible

All animated components should respect reduced-motion preferences. If a Magic UI component does not do this by default, wrap it or disable animation when:

```css
@media (prefers-reduced-motion: reduce) {
  /* disable decorative animation */
}
```

### Keep the App Work-Focused

Inside the app:

- Prefer subtle transitions over large animated backgrounds.
- Avoid constantly moving decorative elements.
- Do not put animated effects around dense tables.
- Keep text readable in both light and AMOLED themes.
- Preserve keyboard focus states and accessible labels.

### Match BakeryOS Styling

Use the existing BakeryOS tone:

- Amber for active and brand states.
- Stone neutrals for app chrome.
- Paired light and AMOLED theme classes.
- Compact cards with modest radius.
- Operational density over oversized marketing layout.

### Install Deliberately

Magic UI examples commonly assume local component installation and helper utilities. Before adding components broadly, set up the integration cleanly:

- Add a local `cn` utility if needed.
- Confirm path aliases work with Vite and TypeScript.
- Install only required dependencies.
- Keep Magic UI components local and editable.
- Avoid introducing a second design system.

Likely dependency areas to verify:

- `motion` or equivalent animation dependency.
- `lucide-react` if components use Lucide icons.
- Any Radix icon dependency if copied examples require it.
- Tailwind compatibility with the current Tailwind 4 setup.

### Protect the Magic UI Pro Key

Do not commit the Magic UI Pro API key, license token, npm token, or generated auth config.

If the Pro install flow requires authentication, keep credentials in local environment or package-manager auth files according to Magic UI's instructions. Add ignore rules for any local-only generated auth files if needed.

## Success Criteria

The integration is successful when:

- The landing page feels premium within the first viewport.
- The app remains faster to scan, not harder.
- The dashboard highlights operational priorities clearly.
- Motion has reduced-motion support.
- Light and AMOLED themes both look intentional.
- No credentials are committed.
- `npm run build` and `npm run typecheck` pass after implementation.
