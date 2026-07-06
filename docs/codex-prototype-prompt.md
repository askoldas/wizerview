# Codex Prototype Prompt

Use this prompt to start building the first WizerView prototype.

```text
You are working in the WizerView repository.

Build the first clickable product prototype for WizerView using Next.js App Router, TypeScript, Tailwind CSS, and shadcn/ui-style components if available.

The goal is not backend completeness yet. The goal is to prototype the core UX flow with realistic mock data and clean component structure.

Product summary:

WizerView is a lightweight client review and approval tool for freelancers and small creative teams. A creator sends one visual review link where a client can compare options, leave pinned comments on visual assets, and approve, request changes, or select a direction without creating an account.

Core principle:

Everything is centered around the asset, not the conversation. Do not build a generic project management dashboard or kanban board.

MVP decisions:

- The main shared object is a Review.
- Projects are only lightweight folders behind reviews.
- Creator starts with "New Review", not "New Project".
- A review contains sections.
- Section types:
  - Review Together: related assets that belong together.
  - Compare Options: options/directions the client can compare and choose from.
- Each option can contain one or more assets.
- MVP asset types are visual only:
  - images
  - screenshots
  - PDFs displayed as page-based visual surfaces
- Do not build text asset review in v1.
- Do not build live website embedding in v1.
- Do not build automatic URL screenshots in v1.
- Do not build billing, teams, integrations, AI, or advanced version comparison in this prototype.
- Include simple pinned comments on visual assets.
- Also include option-level, section-level, and overall feedback fields.
- Reviewer name is required before the first comment, preference, or final decision.
- Optional PIN protection can be represented in the UI but does not need real security yet.

Prototype screens:

1. Dashboard / Reviews List
   - Show WizerView logo/name.
   - Show primary CTA: New Review.
   - Show review cards with title, client/project, status, updated time, comments count, and share link action.
   - Keep it simple. No kanban.

2. New Review / Review Builder
   - Let the creator enter review title, optional client/project name, and instructions.
   - Let the creator add sections.
   - Support two section types:
     - Review Together
     - Compare Options
   - For Review Together, show a list of uploaded/mock assets.
   - For Compare Options, show Option A/B/C cards, each with assets inside.
   - Use mock upload cards; actual file upload can be stubbed for the prototype.
   - Include share settings:
     - reviewer name required (always on)
     - optional PIN protection toggle
     - allow comments
     - allow decisions
   - Include Copy Review Link button.

3. Client Review Page
   - Public-looking page with minimal chrome.
   - Show review title and instructions.
   - Show sections in order.
   - For Review Together:
     - stack assets in natural flow
     - each asset supports simple pin comments
     - show section feedback textarea
   - For Compare Options:
     - desktop: if simple image options, show option cards side by side when space allows
     - mobile: use tabs/segmented control
     - each option shows assets, pin comments, option feedback textarea, and "I prefer this option"
     - section footer includes "Select final direction" and "Suggest combining options"
   - End of page:
     - overall feedback textarea
     - Approve button
     - Request changes button

4. Reviewer Identity Modal
   - Before first feedback/decision, show a modal asking for reviewer name.
   - If PIN protection is enabled in mock data, show a PIN input before the review is visible.
   - This is not account registration.

5. Final Decision State
   - Show clear confirmation after approve/request changes/select direction.
   - Keep existing comments visible.

Pinned comment behavior:

- For visual assets, clicking an asset creates a small numbered pin.
- Open a comment popover or side panel input.
- Save the comment into local component state.
- Pins use x/y percentage coordinates so they remain aligned when the image scales.
- Clicking a comment should highlight or scroll to its pin if practical.
- Keep tools simple: point pins only, no drawing tools.

Mock data:

Use one realistic review:

Review title: Homepage Direction
Client: Acme Studio
Instructions: Please compare the homepage directions, leave notes, and select the strongest direction.

Section 1: Compare Options
- Option A: Calm editorial homepage
  - desktop screenshot placeholder
  - mobile screenshot placeholder
- Option B: Bold conversion homepage
  - desktop screenshot placeholder
  - mobile screenshot placeholder
- Option C: Minimal premium homepage
  - desktop screenshot placeholder

Section 2: Review Together
- Logo horizontal
- Logo square
- Favicon preview

Use generated placeholder panels or simple gradients/shapes only for prototype assets if no real images are available, but make them look like reviewable work surfaces.

Design direction:

- Professional freelancer/SaaS feel.
- Creator app can use a dark-neutral sidebar or header with light work areas.
- Client review page should be light, calm, and extremely easy.
- Avoid enterprise complexity.
- Avoid purple-heavy generic SaaS styling.
- Use compact cards with radius around 8px.
- Do not make the whole page a pile of nested cards.
- Prioritize readable layout and responsive behavior.

Implementation notes:

- Use mock data and local React state.
- Keep components organized:
  - app page routes
  - components for ReviewBuilder, ReviewSection, OptionCard, AssetSurface, PinCommentLayer, FeedbackPanel, DecisionBar
- No backend required in this first prototype.
- Add a README section explaining how to run the prototype.
- Verify the app runs locally.

Expected output:

- A working Next.js prototype.
- Dashboard route.
- Review builder route.
- Client review route.
- Clean responsive UI.
- Simple pinned comments stored in local state.
- Clear final decision interactions.
```
