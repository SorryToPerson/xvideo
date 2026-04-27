# Seedance Video Web Design

**Date:** 2026-04-27

## 1. Overview

This project is a single-tenant AI video generation web application built for ordinary users. Users should not need professional prompt engineering, editing knowledge, or model parameter understanding. They only need to provide:

- A rough script or story outline
- One to three reference images
- A selected video type template

The system is responsible for transforming that lightweight input into stable, reusable, provider-ready video generation requests using template rules and backend orchestration.

The first version should optimize for:

- Low learning cost for end users
- High controllability for operators
- Fast iteration of prompt and parameter best practices
- A technical foundation that supports both short videos and future one-minute videos

## 2. Product Goals

### 2.1 User Goal

Allow non-expert users to generate usable AI videos with one click after providing a rough idea and optional image references.

### 2.2 Business Goal

Build a template-driven generation platform where output quality improves over time through backend configuration instead of repeated code changes.

### 2.3 Technical Goal

Create a clean provider abstraction around Seedance 2.0 so that:

- Prompt logic stays on the server
- Provider-specific APIs are isolated
- Long-video workflows can evolve without rewriting the MVP

## 3. Scope

### 3.1 MVP Scope

The MVP includes:

- A public-facing creation flow for ordinary users
- A single-tenant admin console for operators
- Template-driven prompt composition
- Reference image upload and validation
- Seedance asynchronous generation task creation and polling
- Task history and result playback
- Basic observability and failure classification

The MVP does not include:

- Multi-tenant support
- End-user account system
- Billing and quota packages
- Complex review workflows
- Fine-grained team permissions
- Fully automated long-video editing timelines with advanced transitions

### 3.2 Long-Video Preparation Scope

Even if the first release primarily exposes short video generation, the underlying architecture must support:

- One-minute generation jobs
- Multi-scene decomposition
- Video extension / continue-shooting workflows
- Final composition from multiple generated assets

## 4. Target Users

### 4.1 End Users

Ordinary users who want AI-generated videos but do not understand:

- Prompt engineering
- Camera language
- Shot continuity
- Video generation parameters

### 4.2 Operators

Internal business or content operators who:

- Maintain generation templates
- Tune prompts and defaults
- Compare output quality by template version
- Monitor generation failures and provider behavior

## 5. Product Structure

### 5.1 Frontend User Site

The user-facing site should include these pages:

#### Create Page

Users:

- Choose a template
- Enter a rough script
- Upload one to three reference images
- Select short-video or long-video mode when available
- Submit with one click

The page should avoid exposing provider parameters directly.

#### Task Result Page

Shows:

- Pending
- Generating
- Succeeded
- Failed

When successful, the page should provide:

- Preview
- Download
- Retry entry point

#### History Page

Shows recent generation tasks tracked by a temporary client identity in MVP.

#### Guidance Section

Helps users understand:

- How to write a useful rough script
- How to choose better reference images
- What kinds of templates work best

### 5.2 Admin Console

#### Template Management

Operators can:

- Create templates
- Edit templates
- Disable templates
- Set default generation strategies

#### Template Version Management

Every meaningful adjustment should create a new template version so the platform can compare output behavior over time.

#### Task Monitoring

Operators can view:

- Task states
- Provider task IDs
- Retry counts
- Duration
- Failure reasons

#### Media Rules

Operators can configure:

- Allowed formats
- Max image count
- Recommended image size
- Validation rules

#### System Configuration

Operators can configure:

- Provider credentials references
- Polling strategy
- Retry strategy
- Cost thresholds
- Feature flags for long-video modes

## 6. Core Product Principles

### 6.1 Users Provide Intent, Not Parameters

Users should provide semantic intent, not low-level generation controls.

Examples of user input:

- What the video is about
- Who or what should appear
- What feeling the video should create
- Which reference images to follow

Examples of system-controlled parameters:

- Prompt structure
- Shot guidance
- Duration selection
- Resolution defaults
- Aspect ratio defaults
- Strategy selection between single generation, extension, or storyboard

### 6.2 Templates Are the Main Quality Lever

Output quality should improve mainly by updating templates and template versions, not by changing code for every use case.

### 6.3 Every Generation Must Be Reproducible

Each generation should persist:

- Original user input
- Selected template
- Template version
- Composed prompt
- Final request payload
- Provider raw response
- Result asset metadata

This is required for debugging and best-practice iteration.

## 7. Technical Architecture

## 7.1 Recommended Stack

- Backend: Node.js + NestJS
- Frontend user site: React + Tailwind CSS
- Frontend admin console: React + Tailwind CSS
- Database: PostgreSQL recommended
- Object storage: S3-compatible storage or provider-supported object storage
- Queue/cache: Redis optional for MVP, recommended for scale
- Media processing: FFmpeg for composition and concatenation

### 7.2 Application Layout

Recommended repository structure:

- `apps/server` for the NestJS backend
- `apps/web` for the user-facing frontend
- `apps/admin` for the admin console
- `packages/shared` for shared types, validation schemas, and utilities
- `docs/superpowers/specs` for design documents

### 7.3 Backend Modules

#### `templates`

Responsibilities:

- Template definitions
- Template versions
- Input schema definitions
- Prompt composition rules
- Strategy defaults

#### `media-assets`

Responsibilities:

- Reference image upload
- File validation
- Asset metadata
- Storage path management

#### `generation-jobs`

Responsibilities:

- Main generation job lifecycle
- Status transitions
- Retry orchestration
- Result persistence

#### `generation-scenes`

Responsibilities:

- Scene-level generation records
- Long-video decomposition
- Extension chain tracking
- Final scene ordering

#### `providers/seedance`

Responsibilities:

- Call Seedance APIs
- Translate internal generation requests to provider payloads
- Normalize provider status values
- Persist raw provider responses

#### `admin-config`

Responsibilities:

- Provider feature flags
- Retry limits
- Polling intervals
- Default generation settings

#### `audit-observability`

Responsibilities:

- Structured logs
- Metrics
- Failure classification
- Template-level reporting

## 8. Seedance 2.0 Integration Model

### 8.1 Integration Boundary

The system should not let product modules call Seedance APIs directly.

Instead:

1. Frontend submits user intent
2. Backend validates input
3. Template engine composes an internal generation request
4. Strategy layer chooses generation mode
5. Seedance adapter maps the internal request to provider API calls
6. Polling or callback updates the internal task state

This keeps provider drift isolated inside one adapter layer.

### 8.2 Confirmed Integration Direction

Based on the official Seedance documentation referenced in this project, the system should be built around:

- Task creation through an asynchronous video generation API
- Task status retrieval through a query API
- Server-side prompt construction following the Seedance prompt guide

Official references used for this design:

- https://www.volcengine.com/docs/82379/1520757?lang=zh
- https://www.volcengine.com/docs/82379/1521309?lang=zh
- https://www.volcengine.com/docs/82379/2222480?lang=zh

The visible official page metadata confirms recent updates in late April 2026. This design therefore assumes the provider capability is current as of 2026-04-27, while still isolating provider details behind an adapter because field-level APIs may evolve.

### 8.3 Provider Best Practices

#### Asynchronous by Default

Video generation should always be treated as asynchronous work.

#### Save Full Request Context

Store all data necessary to reproduce a task.

#### Validate Before Provider Call

Check files, prompt prerequisites, and template configuration before spending provider quota.

#### Distinguish Technical Failure from Creative Failure

Technical failure:

- Invalid payload
- Rate limiting
- Temporary provider fault
- Storage upload issue

Creative failure:

- Output looks weak
- Narrative drift
- Subject inconsistency

Only technical failure should trigger system-level retries automatically.

## 9. Template System Design

Templates should be treated as generation strategies, not just prompt text.

Each template should define:

- Template name
- Business use case
- User-facing description
- Supported generation strategies
- Supported duration range
- Recommended aspect ratios
- Required and optional input fields
- Reference image rules
- Prompt skeleton
- Negative or restrictive guidance if needed
- Long-video decomposition rules
- Retry policy hints

### 9.1 Template Versioning

Every important prompt or parameter change creates a new template version.

Generation jobs must point to a specific version, not just a template ID. This enables:

- Regression checks
- Rollback
- A/B analysis
- Long-term best-practice accumulation

### 9.2 Input Schema

Each template should define a structured input schema for the frontend, for example:

- Topic
- Main character or subject
- Scene
- Product selling point
- Emotional tone
- Audience type

This prevents users from dumping unstructured prompts into a generic text box and improves consistency.

## 10. Long-Video Strategy

## 10.1 Core Constraint

The current planning assumption is that a single Seedance generation is best suited to roughly 15-second clips. Therefore, one-minute videos should be designed as orchestrated long-form jobs rather than assumed to be one giant single-shot request.

### 10.2 Updated Long-Video Principle

The platform should adopt:

`extension-first, storyboard-fallback`

This means long-video generation should support two major paths.

### 10.3 Path A: Extension-First

Use Seedance video extension / continue-shooting capability when the story is:

- Time-continuous
- Scene-continuous
- Subject-continuous
- Motion-continuous

Recommended examples:

- Character following shot
- Product continuous showcase
- Single-scene narrative
- Vlog-style movement

Flow:

1. Generate an initial high-quality seed clip
2. Extend or continue from that clip
3. Optionally extend again
4. Produce a longer continuous narrative asset

Advantages:

- Better continuity
- Less hard-cut feeling
- Stronger motion carry-over

Risks:

- Less suitable for large scene jumps
- Can drift if extension quality degrades over multiple rounds
- May depend on provider API details not identical to base generation

### 10.4 Path B: Storyboard Fallback

Use scene decomposition and composition when the story is:

- Multi-scene
- Structured around selling points
- Logically segmented
- Better expressed with explicit transitions

Recommended examples:

- Marketing promo
- Product seeding video
- City promo
- Educational explainers

Flow:

1. Convert rough script into scenes
2. Generate each scene independently
3. Compose the final timeline
4. Add intro, outro, captions, or transitions as needed

Advantages:

- Better control
- Better suitability for scene changes
- Easier operator tuning

Risks:

- More editing feel
- More continuity work between scenes

### 10.5 Hybrid Long-Video Mode

The best long-video implementation should allow mixed mode composition:

- Scene 1 generated from text and images
- Scene 2 extends Scene 1
- Scene 3 extends Scene 2
- Scene 4 is a fresh scene generation
- Final output is composed from all scenes

This allows the system to choose the best continuity strategy per segment.

## 11. Generation Strategies

The backend should formalize generation mode selection using a strategy enum.

Recommended values:

- `single`
- `extend`
- `storyboard`

### 11.1 `single`

Used for one short standalone clip.

### 11.2 `extend`

Used for continuous narrative growth from a previous generated or uploaded video segment.

### 11.3 `storyboard`

Used for multi-scene long-form generation and composition.

Each job and each scene should store the strategy used.

## 12. Data Model

Recommended core entities:

### `template`

Stores top-level template metadata.

### `template_version`

Stores versioned prompt and generation configuration.

### `template_input_schema`

Stores field definitions shown on the frontend.

### `media_asset`

Stores image metadata, storage paths, hashes, and validation status.

### `generation_job`

Represents the full user request and overall video task.

Suggested fields:

- id
- client identity
- template id
- template version id
- generation strategy
- requested duration target
- status
- final video asset id
- failure reason summary

### `generation_scene`

Represents one scene or one extension segment under a job.

Suggested fields:

- id
- job id
- sequence index
- scene title
- strategy
- parent scene id for extension chains
- scene prompt
- status
- target duration

### `generation_attempt`

Stores each provider invocation attempt.

Suggested fields:

- id
- job id or scene id
- attempt number
- provider name
- request payload
- response payload
- result status

### `provider_task`

Stores provider-side task identifiers and state mapping.

Suggested fields:

- id
- scene id
- provider task id
- provider raw status
- normalized status
- last synced at

### `generated_video`

Stores final or intermediate video asset metadata.

Suggested fields:

- id
- asset path
- duration
- resolution
- aspect ratio
- preview image

## 13. Long-Video-Specific Components

### 13.1 Script Planner

Transforms a rough script into structured scenes.

Responsibilities:

- Scene count estimation
- Scene objective extraction
- Tone and pacing distribution
- Scene-level prompt draft creation

The planner should not be tightly coupled to Seedance. It should output internal scene plans.

### 13.2 Timeline Composer

Builds a final one-minute deliverable from generated scene assets.

Responsibilities:

- Scene ordering
- Intro/outro insertion
- Transition decisions
- Subtitle overlays
- Audio placeholders
- FFmpeg composition pipeline

### 13.3 Continuity Rules

Long-video continuity should be supported through:

- Reuse of reference images
- Stable subject descriptors
- Shared style constraints
- Extension chaining where possible
- Operator-managed scene templates

## 14. Failure Handling

### 14.1 Pre-Provider Validation Failure

Examples:

- Missing required fields
- Invalid image format
- Too many reference images
- Unsupported long-video mode for chosen template

Result:

- Reject before provider call

### 14.2 Provider Technical Failure

Examples:

- Invalid provider payload
- Rate limit
- Timeout
- Temporary internal provider error

Result:

- Retry within configured limits
- Record failure code

### 14.3 Creative Quality Failure

Examples:

- Weak continuity
- Wrong visual style
- Subject drift
- Poor scene transition

Result:

- Do not auto-retry blindly
- Surface to operator tuning workflow

## 15. Observability

The system should capture at least:

- Task success rate
- Scene success rate
- Average generation duration
- Provider failure code distribution
- Retry count distribution
- Template version success rate
- Long-video completion rate
- Extension success rate versus storyboard success rate

This is necessary for systematic best-practice improvement.

## 16. Security and Operations

### 16.1 Credential Handling

Provider credentials must never be exposed to frontend applications. They should live in backend environment variables or a secure secret manager.

### 16.2 Media Safety

User-uploaded images should be validated before entering generation workflows.

### 16.3 Storage Lifecycle

The system should separate:

- Raw uploads
- Provider-ready assets
- Intermediate generated clips
- Final composed videos

This prevents operational confusion once long-video composition is introduced.

## 17. Recommended MVP Rollout

### Phase 1

- Template-driven short-video generation
- Admin template management
- Seedance async task integration
- Result page and history page

### Phase 2

- Introduce `extend` strategy for continuous long-video paths
- Add scene records and extension chains

### Phase 3

- Introduce `storyboard` strategy and timeline composition
- Support one-minute videos with mixed-mode orchestration

This phased approach keeps the MVP lean while avoiding a dead-end architecture.

## 18. Key Decisions

The following decisions are finalized in this design:

- Single-tenant architecture for the first version
- Ordinary-user-first product experience
- Backend-owned prompt composition
- Template versioning as a first-class system feature
- Seedance isolated behind a provider adapter
- Long-video support planned from day one
- One-minute generation designed as orchestration, not assumed single-shot
- Long-video strategy is `extension-first, storyboard-fallback`

## 19. Open Assumptions

These assumptions are explicit and should be validated during implementation:

- Seedance extension / continue-shooting capability is available for target scenarios, but exact API field behavior may differ from base generation APIs
- The official public documentation available at design time clearly supports asynchronous generation and prompt guidance, while extension-specific programmatic details may require implementation-time verification
- FFmpeg-based composition is sufficient for first-generation one-minute assembly
- Temporary client identity is acceptable for MVP history tracking before user accounts are added

## 20. Summary

The recommended system is a template-driven Seedance 2.0 video generation platform for ordinary users with a single-tenant admin backend.

Its central product thesis is:

- Keep the front end simple
- Move complexity into templates and orchestration
- Preserve every generation context for iteration
- Treat long video as a strategy problem, not a bigger single request

The central long-video thesis is:

- Use extension when continuity is naturally strong
- Use storyboard composition when scene structure matters
- Support hybrid orchestration so the platform can evolve toward robust one-minute generation without re-architecture
