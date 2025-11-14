---
date: 2025-11-14T12:32:45+00:00
researcher: Claude (Sonnet 4.5)
git_commit: 4d66d0ea2ab512ea69cabe7f900a7816684be732
branch: master
repository: danielbodart/talebrary
topic: "New Client Rewrite Status and Architecture Analysis"
tags: [research, codebase, client, web-components, architecture, interactive-fiction]
status: complete
last_updated: 2025-11-14
last_updated_by: Claude (Sonnet 4.5)
---

# Research: New Client Rewrite Status and Architecture Analysis

**Date**: 2025-11-14T12:32:45+00:00
**Researcher**: Claude (Sonnet 4.5)
**Git Commit**: 4d66d0ea2ab512ea69cabe7f900a7816684be732
**Branch**: master
**Repository**: danielbodart/talebrary

## Research Question

Analysis of the current state of the client rewrite, examining what exists in both the old and new clients, the architectural approach with web components, and mapping what needs to be completed to replace the old client with the new one.

## Summary

The codebase contains two parallel client implementations:
1. **Old Client** (`/src/client/`, `/www/index.html`) - A functional implementation using `UpdateRenderer.tsx` that handles engine updates via a centralized class
2. **New Client** (`/src/new-client/`, `/www/new-client/index.html`) - A partially implemented web components-based architecture

The new client architecture exists in skeletal form with web component definitions (`InteractiveFiction`, `GridWindow`) but lacks the core rendering logic currently housed in `UpdateRenderer.tsx`. The main architectural issue identified: the `InteractiveFictionHandler.ts` attempts to wrap the engine in request/response semantics, but the interactive fiction engine actually streams multiple update events asynchronously through callbacks.

## Detailed Findings

### Old Client Architecture

The old client follows this architecture:

**Entry Point**: `/src/client/main.ts:1-46`
- Sets up dependency injection container using `LazyMap`
- Initializes `client()` function which creates the emglken VM
- Creates `UpdateRenderer` instance to handle UI updates
- Registers custom elements (`Instruction`, `ImageElement`)

**Engine Integration**: `/src/client/client.ts:31-54`
```typescript
export async function client({story, type, storage, messageHandler, http, logger}: ClientDependencies,
                             prefix: string = '') {
    const engineName = engineMapping.get(type);
    const engine = (await import(`${prefix}/emglken/src/${engineName}.js`)).default;

    const options = {
        Dialog: new MiniDialog({storage}),
        Glk: {},
        GlkOte: new MiniGlkOte({messageHandler, logger}),
        wasmBinary: Buffer.from(await wasmResponse.arrayBuffer())
    }

    const vm = await new engine();
    vm.init(Buffer.from(await storyResponse.arrayBuffer()), options);
    await vm.start();
    return 'Created VM';
}
```

**Message Flow**: `/src/client/MiniGlkOte.ts:1-81`
- `MiniGlkOte` implements the GlkOte interface required by emglken
- The engine calls `GlkOte.update(data: UpdateMessage)` when it has updates
- `MiniGlkOte.update()` posts the `UpdateMessage` to the `MessageHandler`
- Messages are event-driven, not request/response - the engine can send multiple updates

**UI Rendering**: `/src/client/UpdateRenderer.tsx:39-279`
- Constructor sends initial `InitMessage` to engine via `messageHandler.postMessage()`
- Subscribes to messages via `messageHandler.onMessage()`
- `handle()` method processes `UpdateMessage` objects with three update types:
  - `updateWindows()` - Creates/updates grid/buffer/graphics windows (lines 64-92)
  - `updateContent()` - Renders text content, handles images, suggestions (lines 103-207)
  - `updateInput()` - Creates input forms and handles user interaction (lines 216-278)

**Key Pattern**: The engine operates asynchronously and can send multiple `UpdateMessage` events. The old client handles this through:
1. Event-driven message passing via `WindowMessageHandler`
2. Stateless rendering where each `UpdateMessage` contains complete window state
3. `UpdateRenderer` imperatively manipulates DOM based on updates

### New Client Architecture

**Entry Point**: `/src/new-client/main.ts:1-39`
- Similar dependency injection setup
- Registers web components: `ImageElement`, `InteractiveFiction`, `GridWindow`
- Does NOT create `UpdateRenderer` - the intention is for web components to handle rendering

**HTML Structure**: `/www/new-client/index.html:9-48`
```html
<interactive-fiction src="story" type="zcode">
    <template>
        <grid-window id="grid-">
            <grid-line id="grid-line-{id}"></grid-line>
        </grid-window>
        <buffer-window id="window-{id}">
            <buffer-section></buffer-section>
            <buffer-section class="scene">
                <img is="x-image" reloadable class="image" loading="lazy" .../>
                <h1 class="title {style}">{text}</h1>
                <p class="content {style}">{text}</p>
                <input-suggestions reloadable src="suggestions?prompt={prompt}">
                    <x-instruction>{text}</x-instruction>
                </input-suggestions>
            </buffer-section>
            <user-input>
                <form>
                    <input type="text" maxlength="{length}" .../>
                </form>
            </user-input>
        </buffer-window>
    </template>
    <buffer-window>...</buffer-window>
</interactive-fiction>
```

The HTML shows the desired declarative structure with templates for data binding.

**Web Component Definitions**:

`/src/new-client/InteractiveFiction.ts:20-48`
- Uses `CustomElementDefinition` pattern for dependency injection
- `connectedCallback()` sends init message to `InteractiveFictionHandler`
- Currently only handles ONE response, then stops

`/src/new-client/GridWindow.ts:8-21`
- Empty implementation, just logs to console
- No rendering logic

**The Problem**: `/src/new-client/InteractiveFictionHandler.ts:15-54`
```typescript
export class InteractiveFictionHandler implements HttpHandler {
    async handle(request: Request): Promise<Response> {
        return new Promise(async (resolve, reject) => {
            const engine = await this.getEngine(request.url, request.headers.get('accept') as SupportedGameType);
            engine.resolve = (m:object) => resolve(new Response(JSON.stringify(m), {status: 200}));
            engine.reject = (m:object) => reject(new Response(JSON.stringify(m), {status: 500}));
            engine.accept(await request.json());
        });
    }
}
```

This wraps the engine in HTTP-like request/response semantics, but:
- The engine streams events via `GlkOte.update()` calls
- Each user interaction generates multiple `UpdateMessage` events
- Request/response pattern only captures the FIRST update, then the connection is closed
- Subsequent engine updates have nowhere to go

`/src/new-client/InteractiveFictionHandler.ts:57-105` - `ResolveRejectGlkOte` class
- Replaces the streaming `messageHandler.postMessage()` with `this.resolve(data)`
- This resolves the Promise and closes the "connection"
- Multiple updates from the engine cannot be handled

### Dependency Injection Pattern

**Custom Element Definition**: `/src/client/components/CustomElementDefinition.ts:1-11`
```typescript
export class CustomElementDefinition<C extends CustomElementConstructor> {
    constructor(public name: string,
                public construct: C,
                public options?: ElementDefinitionOptions) {}

    apply(registry: CustomElementRegistry): C {
        if (!registry.get(this.name)) registry.define(this.name, this.construct, this.options);
        return this.construct;
    }
}
```

**Usage Pattern** (from `/src/client/components/ImageElement.ts:33-73`):
```typescript
export class ImageElement {
    static definition({HTMLImageElement, clock}: ImageDependencies) {
        return new CustomElementDefinition(ImageTagName, class extends HTMLImageElement {
            constructor() {
                super();
                // Implementation uses injected 'clock' dependency
            }
            // ...
        }, {extends: 'img'});
    }
}
```

**Registration** (from `/src/client/misc.tsx:73-77`):
```typescript
export function customElement<D, C extends CustomElementConstructor>(value: {
    definition: (deps: D) => CustomElementDefinition<C>
}) {
    return (deps: D & { customElements: CustomElementRegistry }) => value.definition(deps).apply(deps.customElements);
}
```

This pattern allows:
1. Static `definition()` method receives dependencies
2. Returns `CustomElementDefinition` with class literal
3. Dependencies are available in closure for the element implementation
4. `customElement()` helper extracts and applies definition to registry

### Component Locations

**Old Client Files**:
- `/src/client/main.ts` - Entry point and DI setup
- `/src/client/client.ts` - Engine initialization and VM creation
- `/src/client/UpdateRenderer.tsx` - **CRITICAL**: All UI rendering logic
- `/src/client/MiniGlkOte.ts` - Engine interface, streams updates to message handler
- `/src/client/MiniDialog.ts` - File/save dialog implementation
- `/src/client/types.ts` - Type definitions for all message types
- `/src/client/misc.tsx` - Helper functions (instructions, grouping, etc.)
- `/src/client/EventBuilder.ts` - Analytics event creation
- `/src/client/Measure.ts` - Screen size calculations
- `/src/client/BinPack.ts` - Layout algorithm for suggestions
- `/src/client/components/Instruction.tsx` - Clickable instruction elements
- `/src/client/components/ImageElement.ts` - Custom image element with reload
- `/src/client/components/CustomElementDefinition.ts` - DI pattern for elements
- `/www/index.html` - Library landing page (not the game client)

**New Client Files**:
- `/src/new-client/main.ts` - Entry point (functional)
- `/src/new-client/InteractiveFiction.ts` - Root component (partial)
- `/src/new-client/GridWindow.ts` - Grid window component (stub)
- `/src/new-client/InteractiveFictionHandler.ts` - **PROBLEMATIC**: Request/response wrapper
- `/www/new-client/index.html` - Declarative template structure
- `/www/new-client/main.js` - Compiled output (minified)
- `/www/new-client/test.html` - Test page

**Shared/Reusable**:
- `/src/client/MiniDialog.ts` - Used by both clients
- `/src/client/components/ImageElement.ts` - Used by both clients
- `/src/client/types.ts` - Message type definitions
- `/src/yadic/mod.ts` - Dependency injection framework

### Missing Components in New Client

Based on the old client's `UpdateRenderer` and the template in `index.html`, the new client needs:

1. **buffer-window** - Custom element to handle buffer window updates
2. **buffer-section** - Custom element for text sections
3. **grid-line** - Custom element for grid window lines
4. **user-input** - Custom element for input handling
5. **input-suggestions** - Custom element for suggestion display

None of these exist yet in `/src/new-client/`.

Additionally, the template syntax `{text}`, `{style}`, `{id}` suggests a data binding system that doesn't exist.

### UpdateRenderer Logic Breakdown

The `UpdateRenderer` has three main responsibilities that need to be distributed to web components:

**1. Window Management** (lines 64-92):
- Creates window divs with IDs like `window-${id}`
- Handles grid windows by creating line divs
- Removes all windows when empty update received

**2. Content Rendering** (lines 103-207):
- Grid content: Updates line divs with styled spans
- Buffer content:
  - Clear window when `clear: true`
  - Process text into cards with proper styling
  - Detect "instruction" phrases and wrap in `<x-instruction>`
  - Group consecutive elements into cards
  - Add images for scenes (when header + normal text detected)
  - Fetch and display suggestions
  - Use binPack layout algorithm for suggestions
  - Send analytics events

**3. Input Handling** (lines 216-278):
- Create input forms with autocomplete
- Handle line input (text) and char input (single key)
- Special key mapping (arrows → 'left', 'right', etc.)
- Android compatibility (input event for 'Unidentified' keys)
- History tracking from previous inputs
- Post input messages back to engine

### Engine Communication Protocol

**Message Types** (from `/src/client/types.ts:164-241`):

1. **InitMessage** (client → engine): Starts the game
   - `type: "init"`
   - `gen: 0`
   - `metrics`: Screen size info
   - `supports`: Feature flags

2. **UpdateMessage** (engine → client): Can contain any combination of:
   - `windows`: Array of window definitions (create/modify windows)
   - `content`: Array of content updates (text, images)
   - `input`: Array of input requests (what inputs to show)
   - `timer`: Timer value for time-based events
   - `specialinput`: File prompts

3. **Input Response Messages** (client → engine):
   - `type: "line"` or `"char"`
   - `gen`: Generation number
   - `window`: Window ID
   - `value`: User input

4. **SpecialResponseMessage** (client → engine):
   - File prompt responses

**Critical Insight**: The engine calls `GlkOte.update()` multiple times per game turn. For example, a single user command might generate:
1. Update clearing the input
2. Update showing the input as text
3. Update showing new room description
4. Update requesting new input

The request/response pattern breaks this flow.

## Code References

- `/src/client/UpdateRenderer.tsx:39-279` - Complete UI rendering logic to be distributed
- `/src/client/MiniGlkOte.ts:42-56` - Streaming update handler pattern
- `/src/new-client/InteractiveFictionHandler.ts:19-26` - Request/response anti-pattern
- `/src/client/components/CustomElementDefinition.ts:1-11` - DI pattern for elements
- `/src/client/components/ImageElement.ts:33-73` - Example of DI pattern usage
- `/src/client/types.ts:208-220` - UpdateMessage structure
- `/www/new-client/index.html:9-48` - Desired declarative component structure

## Current State Analysis

### What Works

**Old Client** (`/src/client/`):
- ✅ Complete functional implementation
- ✅ Engine integration with proper event streaming
- ✅ All rendering logic in `UpdateRenderer`
- ✅ Input handling (line and char)
- ✅ Grid and buffer windows
- ✅ Image generation and display
- ✅ Suggestion system with bin-packing layout
- ✅ Instruction detection and interaction
- ✅ Custom elements: `x-instruction`, `x-image`
- ✅ Analytics event tracking

**New Client** (`/src/new-client/`):
- ✅ Dependency injection setup
- ✅ CustomElementDefinition pattern established
- ✅ Main.ts wiring complete
- ✅ HTML template structure defined
- ⚠️ Can initialize engine (once)
- ⚠️ Can receive first update (then breaks)

### What's Missing

**Architecture Level**:
- ❌ Event streaming mechanism (broken by request/response pattern)
- ❌ Component communication pattern
- ❌ Template/data binding system for `{text}`, `{style}` syntax
- ❌ State management across components

**Web Components**:
- ❌ `buffer-window` - Main text display component
- ❌ `buffer-section` - Text section within buffer
- ❌ `grid-line` - Grid window line rendering
- ❌ `user-input` - Input form component
- ❌ `input-suggestions` - Suggestion display

**Rendering Logic to Migrate** (from UpdateRenderer):
- ❌ Window creation/removal (lines 64-92)
- ❌ Grid content rendering (lines 109-114)
- ❌ Buffer text processing (lines 116-148)
- ❌ Instruction detection (via misc.tsx:17-28)
- ❌ Card grouping (via misc.tsx:48-57)
- ❌ Scene detection and image generation (lines 149-181)
- ❌ Suggestion fetching and layout (lines 183-201)
- ❌ Input form generation (lines 228-241)
- ❌ Input event handlers (lines 243-278)
- ❌ Special key mapping (lines 282-300)

**Integration Points**:
- ❌ Message handler connection to components
- ❌ Engine lifecycle management
- ❌ Multi-turn conversation with engine

### The Core Problem

The `InteractiveFictionHandler` wraps the engine in request/response semantics:

```typescript
// This pattern is incorrect for the emglken engine
async handle(request: Request): Promise<Response> {
    return new Promise((resolve, reject) => {
        engine.resolve = (m) => resolve(Response(m));  // Closes connection!
        engine.accept(request.json());
    });
}
```

The engine expects to call `GlkOte.update()` multiple times, but `ResolveRejectGlkOte` resolves the promise on the first update, closing the "connection". Subsequent updates have no handler.

**What's Needed**: The new client needs to maintain a persistent message stream like the old client's `MiniGlkOte` + `WindowMessageHandler` pattern, where:
1. Engine is initialized once at startup (like old client)
2. Engine streams updates via `GlkOte.update()` → message handler → web components
3. User input → message handler → `GlkOte.accept()` → engine

## Architecture Documentation

### Old Client Pattern (Working)

```
User Interaction
    ↓
UpdateRenderer (DOM manipulation)
    ↓
WindowMessageHandler.postMessage()
    ↓
MiniGlkOte.accept()
    ↓
Engine (emglken VM)
    ↓
MiniGlkOte.update()
    ↓
WindowMessageHandler.postMessage()
    ↓
UpdateRenderer.handle()
    ↓
DOM Updates
```

### New Client Pattern (Intended)

```
User Interaction
    ↓
user-input component
    ↓
MessageHandler.postMessage()
    ↓
Interactive-Fiction component
    ↓
Engine (emglken VM)
    ↓
Interactive-Fiction component
    ↓
MessageHandler.postMessage()
    ↓
buffer-window / grid-window components
    ↓
Declarative rendering via templates
```

### Dependency Injection Flow

```
main.ts: LazyMap.create()
    .set('ImageElement', customElement(ImageElement))
    .set('InteractiveFiction', customElement(InteractiveFiction))
    ↓
customElement() helper
    ↓
ImageElement.definition(deps) → CustomElementDefinition
    ↓
customElements.define(name, class)
    ↓
Class can access deps via closure
```

## Related Research

None - this is initial research on the client rewrite.

## Architecture Decisions

Based on discussions with the project owner, the following architectural decisions have been made:

### 1. Template System
**Decision**: Use simple regex-based extraction for `{text}`, `{style}`, `{id}` template syntax.
**Rationale**: Keep it simple with no external dependencies. Regex is sufficient for the template binding needs.

### 2. Component Communication
**Decision**: Use DOM's natural parent-child relationships via:
- Custom events for bubbling up (child → parent)
- `window.postMessage` for broadcasting down (parent → children)

**Rationale**: Avoids dependency injection complexity and object lifecycle issues. The DOM tree naturally represents the parent-child relationships, so leveraging event bubbling and message passing aligns with web standards and forces correct architectural patterns.

### 3. State Management
**Decision**: State lives primarily in the DOM itself.
- Default: If it can be represented in HTML (attributes, content, structure), it should be
- Additional properties attach directly to DOM objects
- Decentralized approach - each component manages its own state
- Engine instance lives in the top-level `interactive-fiction` component

**Rationale**: Keeps state visible and inspectable. Aligns with web components philosophy. Naturally decentralized like HTML itself.

### 4. Migration Strategy
**Decision**: Incremental refactoring of existing `UpdateRenderer`.
- Migrate logic piece by piece into web components
- Keep system working at each step
- `/www/new-client/index.html` represents the target vision
- Modify HTML as we go with human-in-the-loop validation

**Rationale**: Less risky than big-bang rewrite. Can test each piece as it's migrated. Allows learning and adjusting approach during migration.

### 5. Testing Strategy
**Decision**: Unit tests following the pattern established in `/test/client/components/ImageElement.test.ts:1-35`
- Use `linkedom` for DOM simulation
- Leverage dependency injection for testability
- Test by firing events/interactions and asserting:
  - State changes visible in HTML/DOM attributes
  - Events fired to parent elements
- Each component gets standalone tests

**Rationale**: Already established pattern in the codebase. Tests focus on observable behavior (DOM state, events) rather than implementation details. Dependency injection makes components testable in isolation.

### 6. Engine Lifecycle
**Decision**: The `interactive-fiction` component owns and manages the engine lifecycle.
- Engine initialized in the component (likely `connectedCallback()`)
- Root-level component represents interactive fiction conceptually

**Rationale**: Clear ownership - the element that represents interactive fiction is responsible for the interactive fiction engine. Aligns with component-based architecture.

### 7. Migration Compatibility
**Decision**: Handle incrementally as part of the migration process.
- Modify HTML as components are migrated
- Human-in-the-loop validation at each step
- Detailed compatibility strategy will be part of implementation plan

**Rationale**: Specific compatibility concerns will be addressed as they arise during incremental migration. Implementation plan will detail the specific steps.
