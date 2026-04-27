# AGENTS.md

This file defines shared project rules for any AI coding agent working in this repository, including Codex, Gemini, Claude, and similar tools.

The goal is agent continuity: any model should be able to resume work with minimal ambiguity and without re-discovering core product constraints.

## 1. Project Mission

Build a single-tenant web application for ordinary users to generate usable AI videos with minimal effort.

Target user workflow:

- Select a video template
- Enter a rough script or story idea
- Upload one to three reference images
- Click once to generate a video

Users are not expected to know:

- Prompt engineering
- Camera language
- Professional video editing
- Low-level model parameters

The system must absorb this complexity through backend orchestration and configurable admin templates.

## 2. Product Direction

This project is not a generic AI playground.

It is a template-driven AI video product with two audiences:

- End users who want simple one-click generation
- Internal operators who configure templates and improve output quality over time

The system should optimize for:

- Low user learning cost
- Stable, repeatable output
- Fast template iteration
- Long-video readiness from day one

## 3. Confirmed Scope

### 3.1 Current Scope

The project is currently planned as:

- Single-tenant
- MVP-first
- No multi-tenant SaaS complexity
- No end-user account system in the first version

### 3.2 MVP Features

Expected MVP feature areas:

- Public video creation page
- Result/status page
- Task history page using temporary client identity
- Admin console for template and config management
- Seedance asynchronous generation integration
- Reference image upload and validation

## 4. Core Architecture Rules

### 4.1 Recommended Stack

- Backend: Node.js + NestJS
- Frontend: React + Tailwind CSS
- Admin frontend: React + Tailwind CSS

### 4.2 Repository Shape

Target structure:

- `apps/server`
- `apps/web`
- `apps/admin`
- `packages/shared`
- `docs/superpowers/specs`

Agents may scaffold differently only if the user explicitly approves a different layout.

### 4.3 Provider Isolation

Do not spread provider-specific logic across the codebase.

Seedance integration must live behind a dedicated provider adapter layer, for example:

- `providers/seedance`

All product modules should work with internal domain models, not raw provider payloads.

## 5. Prompt and Template Rules

### 5.1 Prompt Ownership

Prompt composition belongs to the backend.

Do not expose raw professional prompt fields directly to end users unless the user explicitly requests an advanced mode later.

### 5.2 Templates Are the Main Quality Control Layer

Treat templates as structured generation strategies, not just text snippets.

Each meaningful template adjustment should be versioned.

Every generation should record:

- User input
- Template ID
- Template version ID
- Composed prompt
- Final provider payload
- Provider raw response

### 5.3 User Input Philosophy

Prefer structured user inputs such as:

- Topic
- Subject
- Scene
- Tone
- Selling point
- Audience

Avoid relying on one giant free-form text box as the only input mechanism.

## 6. Long-Video Rules

### 6.1 Do Not Assume One-Shot One-Minute Generation

Current planning assumption:

- Seedance is best suited for short clips around 15 seconds per generation unit

One-minute videos must therefore be treated as orchestrated workflows.

### 6.2 Long-Video Strategy

The approved strategy is:

- `extension-first`
- `storyboard-fallback`

Meaning:

- Use video extension / continue-shooting when continuity is strong
- Use multi-scene storyboard generation when structure and scene changes matter
- Allow hybrid jobs that mix both modes

### 6.3 Required Internal Strategies

The system should be designed around these generation strategies:

- `single`
- `extend`
- `storyboard`

If agents introduce new strategy names, they must update all affected docs and types consistently.

### 6.4 Scene-Level Modeling

Long-video architecture must support scene or segment records even if the first shipped UI only exposes short-video mode.

At minimum, plan for:

- Job-level records
- Scene-level records
- Provider task records
- Final composed video records

## 7. Seedance Integration Rules

### 7.1 Official Documentation First

When implementing or changing Seedance integration, prefer official Volcengine documentation and official examples.

Relevant references already identified during design:

- `https://www.volcengine.com/docs/82379/1520757?lang=zh`
- `https://www.volcengine.com/docs/82379/1521309?lang=zh`
- `https://www.volcengine.com/docs/82379/2222480?lang=zh`

### 7.2 Treat Video Generation as Asynchronous

Always design around:

- Task creation
- Task status polling or callback updates
- Persistent task state transitions

Avoid synchronous request/response assumptions for final video delivery.

### 7.3 Separate Technical Failure from Creative Failure

Technical failure examples:

- Invalid request
- Upload failure
- Temporary provider error
- Rate limiting

Creative failure examples:

- Weak continuity
- Poor style match
- Narrative drift

Only technical failures should trigger automatic retries by default.

## 8. Persistence and Observability Rules

Agents should preserve reproducibility and debug visibility.

Important data that should exist in the system:

- Template versions
- Generation jobs
- Generation scenes
- Generation attempts
- Provider task mappings
- Generated asset metadata

Important metrics that should be supported:

- Success rate by template
- Average duration
- Retry count
- Provider error distribution
- Long-video completion rate
- Extend-mode vs storyboard-mode quality and success signals

## 9. Frontend UX Rules

### 9.1 Keep the User Experience Simple

The default user experience should hide complexity.

Do not expose too many technical switches on the public creation page.

### 9.2 Admin Holds Complexity

If something must be configurable but would confuse ordinary users, place it in the admin console instead of the user-facing flow.

### 9.3 Preserve Intentional Design

Frontend work should not collapse into generic AI-generated UI patterns.

Prefer:

- Clear visual hierarchy
- Strong onboarding hints
- Simple guided forms
- Explicit status feedback for generation tasks

## 10. Documentation Rules

### 10.1 Update Docs with Architectural Changes

If an agent changes the agreed architecture, it must update:

- `AGENTS.md`
- Relevant spec or plan docs under `docs/superpowers`

### 10.2 Keep Specs and Code Aligned

Do not quietly drift away from documented strategy names, module boundaries, or long-video assumptions.

If implementation requires deviation, document the deviation clearly.

## 11. Collaboration Rules for Agents

### 11.1 Do Not Re-Decide Confirmed Constraints

These constraints are already decided unless the user changes them:

- Single-tenant
- Node.js + NestJS backend
- React + Tailwind CSS frontend
- Template-driven generation
- Backend-owned prompt composition
- Seedance provider isolation
- Long-video support planned from day one
- Extension-first, storyboard-fallback for one-minute video planning

### 11.2 Ask Before Major Direction Changes

An agent should ask the user before changing:

- Tech stack
- Repo structure
- Product audience
- Long-video strategy
- Public UX complexity level

### 11.3 Prefer Explicit Tradeoffs

When there are multiple valid implementation choices, explain the tradeoff briefly and choose the option most aligned with:

- MVP speed
- Low user complexity
- Future long-video compatibility

## 12. Current Project Status

As of 2026-04-27:

- The repository contains design documentation but is not yet initialized as a git repository
- The main approved design spec is:
  - `docs/superpowers/specs/2026-04-27-seedance-video-web-design.md`

Agents should read that spec before making major structural decisions.

## 13. Working Principle

When in doubt, optimize for this order:

1. Preserve the agreed product direction
2. Keep the end-user flow simple
3. Keep provider-specific complexity isolated
4. Make outputs reproducible and observable
5. Leave room for one-minute long-video orchestration
