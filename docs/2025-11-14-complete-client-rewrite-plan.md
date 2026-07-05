---
title: Interactive Fiction New Client Implementation
date: 2025-11-14
author: Daniel Bodart
type: plan
status: superseded
tags: [client, web-components, rewrite, interactive-fiction]
last_updated: 2026-02-06
---

# Interactive Fiction New Client Implementation Plan

## Overview

Complete the web components-based client rewrite that is currently blocked by an architectural issue where the engine's event streaming is wrapped incorrectly in request/response semantics, preventing proper multi-turn interactions.

## Current State Analysis

The codebase has two parallel client implementations:
- **Old Client** (`/src/client/`): Fully functional with all rendering logic in `UpdateRenderer.tsx`
- **New Client** (`/src/new-client/`): Skeletal web components architecture with broken engine communication

### Key Discoveries:
- The engine calls `GlkOte.update()` multiple times per turn, streaming events asynchronously `/src/client/MiniGlkOte.ts:42-56`
- `InteractiveFictionHandler` incorrectly wraps this in request/response `/src/new-client/InteractiveFictionHandler.ts:19-26`
- The template syntax in `/www/new-client/index.html:9-48` implies data binding that doesn't exist
- Only 2 of ~7 required web components are implemented

## Desired End State

A fully functional web components-based client where:
- The engine streams events properly through message handlers to components
- Web components handle rendering declaratively with template-based data binding
- Components communicate via:
  - DOM events for bubbling up (child → parent)
  - Direct property setting when coupling makes sense (parent → child)
  - Event cascade for decoupled downward communication
  - postMessage only for general broadcasting (not parent-child)
- State lives in the DOM itself (attributes, content, structure)
- All functionality from the old client works in the new architecture

### Verification:
- Start dev server with `./run start`
- Navigate to `/new-client/test.html`
- Game loads and displays initial scene
- User can input commands and see responses
- Multiple turns work correctly (not just first interaction)
- All interactive elements (instructions, images) function

## What We're NOT Doing

- Not creating a complex templating framework - simple regex-based binding only
- Not using external state management libraries
- Not changing the engine or GlkOte interface
- Not modifying the old client (it continues to work during migration)
- Not adding new features beyond parity with old client

## Implementation Approach

Fix the core architectural issue first (engine communication), then build components incrementally while keeping the system testable at each phase. Use DOM-native patterns for state and communication as decided in the architectural research.

### Component Communication Patterns:
- **Child → Parent**: Custom events with `bubbles: true` - children dispatch events that bubble up
- **Parent → Child** (coupled): Direct property/method calls when parent creates/owns child
- **Parent → Child** (decoupled): Event cascade - parent dispatches event, automatically cascades to all children in tree
  - Children listen on **themselves** (not parent)
  - Events flow down naturally through DOM tree
  - No need for children to find parent and attach listeners
- **General broadcast**: Use `window.postMessage()` sparingly, not for parent-child relationships

### Template-Driven Architecture:
The `<template>` tag in `/www/new-client/index.html` contains declarative HTML blueprints for all elements. **Templates can be nested** - each parent component has its own `<template>` for its children:

```html
<interactive-fiction>
    <template>
        <grid-window id="grid-{id}">
            <template>
                <grid-line id="grid-line-{id}"></grid-line>
            </template>
        </grid-window>
        <buffer-window id="window-{id}">
            <template>
                <buffer-section class="{style}">{text}</buffer-section>
            </template>
        </buffer-window>
    </template>
</interactive-fiction>
```

Web components:
1. Listen for engine events on themselves (no parent finding!)
2. Find template within themselves (`this.querySelector('template')`)
3. Clone and bind data from their own template
4. Append to DOM
5. Custom element lifecycle hooks fire automatically

**Key principle**: NO HTML strings in JavaScript - all structure lives in nested HTML templates. Each component is independent with its own template.

**Benefits of nested templates:**
- **Independent components**: Each component finds its template within itself, no searching parents
- **Bottom-up testing**: Test `grid-line` in isolation, then `grid-window`, then `interactive-fiction`
- **Incremental migration**: Migrate components one at a time, each fully functional independently
- **Clear ownership**: Each component owns its children's template structure

### Dependency Injection for Testability:

Components that need external dependencies (HTTP calls, etc.) use the existing DI pattern:

```typescript
export interface InputSuggestionsDependencies extends
    Dependency<'HTMLElement', typeof HTMLElement>,
    Dependency<'http', Http>  // Inject HTTP client
{}

export class InputSuggestions {
    static definition({HTMLElement, http}: InputSuggestionsDependencies) {
        return new CustomElementDefinition('input-suggestions', class extends HTMLElement {
            async loadSuggestions() {
                const src = this.getAttribute('src');
                const response = await http(get(src));  // Use injected http
                const data = await response.json();
                // ... render suggestions
            }
        });
    }
}
```

**In tests:**
```typescript
// Mock HTTP client returns canned JSON
const mockHttp = async (request) => ({
    ok: true,
    json: async () => ({ suggestions: ['north', 'south', 'examine'] })
});

InputSuggestions.definition({ HTMLElement, http: mockHttp }).apply(customElements);
```

**This is why we use DI:**
- Test components in isolation with mock dependencies
- No real HTTP calls in tests
- Fast, predictable test execution
- Same reason for using DOM as state - inspectable and controllable

### Responsibility Model (Based on GlkOte Update Protocol):

**Grid vs Buffer Update Semantics:**

**Grid Windows** (fixed-size viewport, often floating at top):
- Fixed size defined by `gridheight` × `gridwidth`
- Updates **replace** specific line content completely
- No scrolling - acts like a status bar or map display
- Example: Line 3 gets completely replaced with new styled text

**Buffer Windows** (scrollable story text):
- Dynamic size - grows as content added
- Updates mostly **append** new content (flowbreak creates new paragraphs)
- Occasionally `clear: true` wipes everything (scene transitions)
- Natural DOM scrolling behavior
- Aligns perfectly with DOM: just keep appending elements

**Parents manage everything:**
- `interactive-fiction` creates/deletes windows
- `grid-window` creates lines and **replaces** their content
- `buffer-window` **appends** new sections or clears everything
- When update arrives, parent manipulates child content via `.replaceChildren()` or `.append()`

**Children are structural/styling containers:**
- Provide attachment points for CSS styling
- Host event listeners (clicks, etc.)
- Define custom element behavior (like `x-image` reload on ctrl+click)
- Don't need to listen for content updates - parent handles that

Example flows:
```
Grid: "replace line 5 with new content"
  → grid-window.querySelector('#grid-line-5').replaceChildren(...)

Buffer: "append new paragraph"
  → buffer-window.append(new buffer-section with content)

Buffer: "clear and restart"
  → buffer-window.innerHTML = '' then append new content
```

## Phase 1: Fix Engine Communication Architecture

### Overview
Replace the broken request/response pattern with proper event streaming that allows the engine to send multiple updates per interaction.

### Changes Required:

#### 1. Remove HTTP Handler Wrapper
**File**: `/src/new-client/InteractiveFictionHandler.ts`
**Changes**: Delete this file entirely - it's the wrong abstraction

#### 2. Update InteractiveFiction Component
**File**: `/src/new-client/InteractiveFiction.ts`
**Changes**: Manage engine lifecycle directly in the component

```typescript
import type {Dependency} from "../yadic/mod.ts";
import {CustomElementDefinition} from "../client/components/CustomElementDefinition.ts";
import {MiniDialog} from "../client/MiniDialog.ts";
import {MiniGlkOte} from "../client/MiniGlkOte.ts";
import {WindowMessageHandler} from "../client/client.ts";
import type {InitMessage, Metrics, UpdateMessage} from "../client/types.ts";
import type {SupportedGameType} from "../types.ts";
import {engineMapping} from "../client/types.ts";
import {Buffer} from "buffer/";
import {get} from "../http/mod.ts";
import type {Http} from "../http/mod.ts";

export interface InteractiveFictionDependencies extends
    Dependency<'HTMLElement', typeof HTMLElement>,
    Dependency<'Dialog', MiniDialog>,
    Dependency<'GlkOte', MiniGlkOte>,
    Dependency<'metrics', Partial<Metrics>>,
    Dependency<'http', Http>,
    Dependency<'messageHandler', WindowMessageHandler>
{}

export class InteractiveFiction {
    static definition({HTMLElement, Dialog, GlkOte, metrics, http, messageHandler}: InteractiveFictionDependencies) {
        return new CustomElementDefinition('interactive-fiction', class extends HTMLElement {
            private engine: any;

            constructor() {
                super();
                console.log('InteractiveFiction constructor');
            }

            async connectedCallback() {
                console.log('InteractiveFiction connectedCallback');

                // Subscribe to updates from the engine
                messageHandler.onMessage((message: UpdateMessage) => {
                    if (message.type === 'update') return;
                    console.log('InteractiveFiction received update', message);
                    this.handleUpdate(message);
                });

                // Initialize the engine
                await this.initializeEngine();

                // Send initial message to start the game
                messageHandler.postMessage(this.initMessage());
            }

            async initializeEngine() {
                const src = this.getAttribute('src')!;
                const type = this.getAttribute('type') as SupportedGameType;

                const engineName = engineMapping.get(type);
                if (!engineName) throw new Error('Unsupported engine');

                const engine = (await import(`/emglken/src/${engineName}.js`)).default;

                const wasmResponse = await http(get(`/emglken/build/${engineName}-core.wasm`));
                if (!wasmResponse.ok) throw new Error('Unable to fetch engine wasm');

                const storyResponse = await http(get(src));
                if (!storyResponse.ok) throw new Error('Unable to fetch story');

                const options = {
                    Dialog,
                    Glk: {},
                    GlkOte,
                    wasmBinary: Buffer.from(await wasmResponse.arrayBuffer())
                };

                const vm = await new engine();
                vm.init(Buffer.from(await storyResponse.arrayBuffer()), options);
                await vm.start();

                this.engine = vm;
            }

            handleUpdate(message: UpdateMessage) {
                // Dispatch event that cascades down to all children
                // Each child listens on itself, event automatically propagates down
                const event = new CustomEvent('engine-update', {
                    detail: message,
                    bubbles: false,  // Don't bubble up
                    composed: true   // Cross shadow DOM boundaries if needed
                });

                // Dispatch on all child windows - event cascades down their trees
                this.querySelectorAll('grid-window, buffer-window').forEach(window => {
                    window.dispatchEvent(event);
                });
            }

            initMessage(): InitMessage {
                return {
                    type: "init",
                    gen: 0,
                    metrics,
                    supports: ["garglktext", "graphics", "graphicswin", "hyperlinks", "timer"]
                };
            }
        });
    }
}
```

#### 3. Update main.ts Wiring
**File**: `/src/new-client/main.ts`
**Changes**: Remove InteractiveFictionHandler, use WindowMessageHandler

```typescript
// Remove InteractiveFictionHandler import and setup
// Add WindowMessageHandler from old client
.set('messageHandler', () => new WindowMessageHandler())
// Remove ifHandler from InteractiveFiction dependencies
```

### Success Criteria:

#### Pre-commit Verification (Local):
- [x] Type checking passes: `./run check`
- [x] Tests pass: `./run test` (including new InteractiveFiction test)
- [x] Build succeeds: `./run build`
- [x] Dev server starts: `./run start` (start in background)
- [x] Engine initializes: Verified in test - "InteractiveFiction connectedCallback" is logged
- [x] First update received: Verified in test - engine sends update messages

**Implementation Note**: After all pre-commit verification passes, pause and request human approval to commit and push changes.

#### Build Verification:
- [ ] CI/CD build completes successfully: `gh run watch` (wait for build to finish)
- [ ] All build steps pass: Review build logs if any failures occur

#### Post-deployment Verification (Production):
- [ ] Production page loads: Use WebFetch to verify production URL renders
- [ ] Console shows engine initialization in production

---

## Phase 2: Create Core Web Components Structure

### Overview
Create skeletal web components that establish the event listening pattern. These components will listen for engine updates but defer actual rendering to Phase 3 when the template system is ready.

### Changes Required:

#### 1. Buffer Window Component (Skeleton)
**File**: `/src/new-client/BufferWindow.ts` (new file)
**Changes**: Create component that listens for engine updates

```typescript
import {CustomElementDefinition} from "../client/components/CustomElementDefinition.ts";
import type {UpdateMessage} from "../client/types.ts";

export class BufferWindow {
    static definition({HTMLElement}) {
        return new CustomElementDefinition('buffer-window', class extends HTMLElement {
            connectedCallback() {
                // Listen for engine-update event on SELF
                // Parent dispatches to us, event cascades down naturally
                this.addEventListener('engine-update', (e: CustomEvent<UpdateMessage>) => {
                    this.handleUpdate(e.detail);
                });
            }

            handleUpdate(message: UpdateMessage) {
                const fullId = this.getAttribute('id'); // e.g., "window-3"
                if (!message.content) return;

                // Extract the numeric ID for matching against engine content
                const windowId = fullId?.replace('window-', '');
                const content = message.content.find(c => c.id === windowId);
                if (content) {
                    console.log('BufferWindow received update', content);
                    // Phase 3 will add template cloning and rendering
                }
            }
        });
    }
}
```

#### 2. Grid Window Component (Skeleton)
**File**: `/src/new-client/GridWindow.ts`
**Changes**: Update existing stub with event listening

```typescript
import {CustomElementDefinition} from "../client/components/CustomElementDefinition.ts";
import type {UpdateMessage} from "../client/types.ts";

export class GridWindow {
    static definition({HTMLElement}) {
        return new CustomElementDefinition('grid-window', class extends HTMLElement {
            connectedCallback() {
                // Listen for engine-update event on SELF
                // Parent dispatches to us, event cascades down naturally
                this.addEventListener('engine-update', (e: CustomEvent<UpdateMessage>) => {
                    this.handleUpdate(e.detail);
                });
            }

            handleUpdate(message: UpdateMessage) {
                const fullId = this.getAttribute('id'); // e.g., "grid-0"
                if (!message.content) return;

                // Extract the numeric ID for matching against engine content
                const windowId = fullId?.replace('grid-', '');
                const content = message.content.find(c => c.id === windowId);
                if (content) {
                    console.log('GridWindow received update', content);
                    // Phase 3 will add template cloning and rendering
                }
            }
        });
    }
}
```

#### 3. User Input Component
**File**: `/src/new-client/UserInput.ts` (new file)
**Changes**: Create component for handling user input

```typescript
import {CustomElementDefinition} from "../client/components/CustomElementDefinition.ts";
import type {MessageHandler} from "../client/types.ts";

export interface UserInputDependencies {
    HTMLElement: typeof HTMLElement;
    messageHandler: MessageHandler;
}

export class UserInput {
    static definition({HTMLElement, messageHandler}: UserInputDependencies) {
        return new CustomElementDefinition('user-input', class extends HTMLElement {
            constructor() {
                super();
            }

            connectedCallback() {
                this.addEventListener('submit', (e: SubmitEvent) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const input = form.querySelector('input[type="text"]');
                    if (!input) return;

                    const value = input.value;
                    const gen = input.getAttribute('data-gen');
                    const id = input.getAttribute('data-id');

                    // Send input to engine
                    messageHandler.postMessage({
                        type: 'line',
                        gen: parseInt(gen || '0'),
                        window: id,
                        value
                    });

                    // Clear input
                    input.value = '';
                });
            }
        });
    }
}
```

#### 4. Wire Components in main.ts
**File**: `/src/new-client/main.ts`
**Changes**: Register new components

```typescript
import {BufferWindow} from "./BufferWindow.ts";
import {UserInput} from "./UserInput.ts";

// Add to LazyMap
.set('BufferWindow', customElement(BufferWindow))
.set('UserInput', customElement(UserInput))
```

### Success Criteria:

#### Pre-commit Verification (Local):
- [ ] Type checking passes: `./run check`
- [ ] Build succeeds: `./run build`
- [ ] Dev server running: `./run start`
- [ ] Components registered: Check `customElements.get('buffer-window')` in console
- [ ] Update events flow: Console shows component update logs
- [ ] Input events captured: Form submission logs to console

**Implementation Note**: After pre-commit verification passes, pause and request human approval to commit and push changes.

#### Build Verification:
- [ ] CI/CD build completes: `gh run watch`
- [ ] Build steps pass: Review logs if failures

#### Post-deployment Verification (Production):
- [ ] Components load in production
- [ ] Console shows event flow in production

---

## Phase 3: Implement Template System

### Overview
Add simple regex-based data binding to enable declarative rendering from templates.

### Changes Required:

#### 1. Template Extraction and Cloning Utility
**File**: `/src/new-client/template.ts` (new file)
**Changes**: Create template processing functions

```typescript
export interface TemplateData {
    [key: string]: string | number | boolean;
}

/**
 * Get the template from within this component
 * Each component has its own nested template
 */
export function getTemplate(component: Element): HTMLTemplateElement | null {
    return component.querySelector(':scope > template');
}

/**
 * Find a specific element pattern within the template
 * e.g., findInTemplate(template, 'grid-line') returns the grid-line element
 */
export function findInTemplate(template: HTMLTemplateElement, selector: string): Element | null {
    return template.content.querySelector(selector);
}

/**
 * Clone a template element and bind data by replacing {key} patterns
 */
export function cloneAndBind(templateElement: Element, data: TemplateData): Element {
    const clone = templateElement.cloneNode(true) as Element;

    // Bind data in attributes
    Array.from(clone.attributes || []).forEach(attr => {
        attr.value = attr.value.replace(/\{(\w+)\}/g, (match, key) => {
            return String(data[key] ?? match);
        });
    });

    // Bind data in text content and child attributes
    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let node;
    while (node = walker.nextNode()) {
        if (node.nodeType === Node.TEXT_NODE) {
            node.textContent = node.textContent?.replace(/\{(\w+)\}/g, (match, key) => {
                return String(data[key] ?? match);
            }) || null;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const elem = node as Element;
            Array.from(elem.attributes).forEach(attr => {
                attr.value = attr.value.replace(/\{(\w+)\}/g, (match, key) => {
                    return String(data[key] ?? match);
                });
            });
        }
    }

    return clone;
}

/**
 * Example usage - each component uses its own template:
 *
 * // In GridWindow:
 * const template = getTemplate(this);  // Gets template from within grid-window
 * const gridLineTemplate = findInTemplate(template, 'grid-line');
 * const newLine = cloneAndBind(gridLineTemplate, { id: '5' });
 * this.appendChild(newLine);  // Custom element automatically connects
 */
```

#### 2. Update GridWindow to Clone Grid Lines from Template
**File**: `/src/new-client/GridWindow.ts`
**Changes**: Use template cloning to create grid lines

```typescript
import {CustomElementDefinition} from "../client/components/CustomElementDefinition.ts";
import type {UpdateMessage} from "../client/types.ts";
import {getTemplate, findInTemplate, cloneAndBind} from "./template.ts";

export class GridWindow {
    static definition({HTMLElement}) {
        return new CustomElementDefinition('grid-window', class extends HTMLElement {
            connectedCallback() {
                // Listen for engine-update event on SELF
                // Parent dispatches to us, event cascades down naturally
                this.addEventListener('engine-update', (e: CustomEvent<UpdateMessage>) => {
                    this.handleUpdate(e.detail);
                });
            }

            handleUpdate(message: UpdateMessage) {
                const fullId = this.getAttribute('id'); // e.g., "grid-0"
                const windowId = fullId?.replace('grid-', '');

                // PARENT RESPONSIBILITY: Manage grid-line lifecycle
                if (message.windows) {
                    const windowDef = message.windows.find(w => w.id === windowId);
                    if (windowDef && 'gridheight' in windowDef) {
                        this.ensureGridLines(windowDef.gridheight);
                    }
                }

                // PARENT RESPONSIBILITY: Replace grid-line content
                if (message.content) {
                    const content = message.content.find(c => c.id === windowId);
                    if (content && 'lines' in content) {
                        content.lines.forEach(lineData => {
                            const line = this.querySelector(`#grid-line-${lineData.line}`);
                            if (line) {
                                // Parent replaces child's content completely
                                // lineData.content is array of {style, text} objects
                                line.replaceChildren(
                                    ...lineData.content.map(c => {
                                        const span = document.createElement('span');
                                        span.className = c.style;
                                        span.textContent = c.text;
                                        return span;
                                    })
                                );
                            }
                        });
                    }
                }
            }

            ensureGridLines(count: number) {
                const template = getTemplate(this);
                if (!template) return;

                const gridLineTemplate = findInTemplate(template, 'grid-line');
                if (!gridLineTemplate) return;

                // Create missing lines
                for (let i = 0; i < count; i++) {
                    const lineId = `grid-line-${i}`;
                    if (!this.querySelector(`#${lineId}`)) {
                        const line = cloneAndBind(gridLineTemplate, { id: String(i) });
                        this.appendChild(line);  // grid-line connects automatically
                    }
                }

                // Remove extra lines
                const allLines = this.querySelectorAll('grid-line');
                allLines.forEach((line, index) => {
                    if (index >= count) {
                        line.remove();
                    }
                });
            }
        });
    }
}
```

#### 3. Update BufferWindow to Handle Content (Append Pattern)
**File**: `/src/new-client/BufferWindow.ts`
**Changes**: Append content naturally like UpdateRenderer does

```typescript
import {CustomElementDefinition} from "../client/components/CustomElementDefinition.ts";
import type {UpdateMessage} from "../client/types.ts";
import {getTemplate, findInTemplate, cloneAndBind} from "./template.ts";

export class BufferWindow {
    static definition({HTMLElement}) {
        return new CustomElementDefinition('buffer-window', class extends HTMLElement {
            connectedCallback() {
                // Listen for engine-update event on SELF
                // Parent dispatches to us, event cascades down naturally
                this.addEventListener('engine-update', (e: CustomEvent<UpdateMessage>) => {
                    this.handleUpdate(e.detail);
                });
            }

            handleUpdate(message: UpdateMessage) {
                const fullId = this.getAttribute('id'); // e.g., "window-3"
                if (!message.content) return;

                const windowId = fullId?.replace('window-', '');
                const content = message.content.find(c => c.id === windowId);
                if (!content || !('text' in content)) return;

                // Clear if requested (scene transitions, etc.)
                if (content.clear) {
                    this.innerHTML = '';
                }

                // Get template
                const template = getTemplate(this);
                if (!template) return;

                const sectionTemplate = findInTemplate(template, 'buffer-section');
                if (!sectionTemplate) return;

                // APPEND new content (buffer windows grow)
                // Each text item becomes a new section/paragraph
                content.text.forEach(textData => {
                    if (!('content' in textData)) return;

                    // Clone buffer-section from template
                    const section = cloneAndBind(sectionTemplate, {
                        text: textData.content || '',
                        style: textData.style || ''
                    });

                    // Append to buffer (natural DOM scrolling)
                    this.appendChild(section);  // buffer-section connects automatically
                });

                // Handle scrolling to new content (similar to UpdateRenderer:137-147)
                const lastSection = this.querySelector('.card.scroll:last-child');
                if (lastSection) {
                    setTimeout(() => {
                        lastSection.scrollIntoView({ block: 'start', behavior: 'smooth' });
                    }, 100);
                }
            }
        });
    }
}
```

### Success Criteria:

#### Pre-commit Verification (Local):
- [ ] Type checking passes: `./run check`
- [ ] Unit tests for template functions pass: `./run test`
- [ ] Build succeeds: `./run build`
- [ ] Dev server running: `./run start`
- [ ] Template extraction works: Console verify `extractTemplate` returns fragment
- [ ] Data binding works: Verify `{text}` replaced with actual content
- [ ] Content renders: Basic text appears in buffer windows

**Implementation Note**: After pre-commit verification passes, pause and request human approval to commit and push changes.

#### Build Verification:
- [ ] CI/CD build completes: `gh run watch`
- [ ] All build steps pass

#### Post-deployment Verification (Production):
- [ ] Templates render correctly in production
- [ ] Text content displays properly

---

## Phase 4: Migrate Core Rendering Logic

### Overview
Port the essential rendering logic from `UpdateRenderer.tsx` to the web components, starting with the most critical functionality.

### Changes Required:

#### 1. Window Management
**File**: `/src/new-client/InteractiveFiction.ts`
**Changes**: Add window creation/removal logic from UpdateRenderer lines 64-92

```typescript
import {cloneAndBind} from "./template.ts";

handleUpdate(message: UpdateMessage) {
    // Handle window updates first
    if (message.windows) {
        this.updateWindows(message.windows);
    }

    // Then dispatch event cascade to existing windows
    const event = new CustomEvent('engine-update', {
        detail: message,
        bubbles: false  // Event cascade, not bubbling
    });
    this.dispatchEvent(event);
}

updateWindows(windows: WindowUpdate[]) {
    // Remove all windows if empty update
    if (windows.length === 0) {
        this.querySelectorAll('[id^="window-"]').forEach(w => w.remove());
        return;
    }

    // Get template once for efficiency
    const template = this.querySelector('template');
    if (!template) return;

    windows.forEach(win => {
        let element = this.querySelector(`#window-${win.id}`);

        if (!element) {
            // Clone the appropriate window from template
            let windowTemplate: Element | null = null;

            if (win.type === 'grid') {
                windowTemplate = template.content.querySelector('grid-window');
            } else if (win.type === 'buffer') {
                windowTemplate = template.content.querySelector('buffer-window');
            }

            if (windowTemplate) {
                // Clone and bind the window element from template
                element = cloneAndBind(windowTemplate, { id: win.id });
                this.appendChild(element);  // Custom element connects automatically
            }
        }
    });
}
```

#### 2. Input Handling Logic
**File**: `/src/new-client/UserInput.ts`
**Changes**: Add complete input handling from UpdateRenderer lines 216-278

```typescript
// Add input type handling (line vs char)
// Add special key mapping for arrow keys
// Add history tracking
// Implementation details from UpdateRenderer.tsx:243-278
```

#### 3. Text Processing
**File**: `/src/new-client/BufferWindow.ts`
**Changes**: Add text processing logic from UpdateRenderer lines 116-148

```typescript
// Process text into proper cards
// Handle instruction detection
// Group consecutive elements
// Scene detection for images
```

### Success Criteria:

#### Pre-commit Verification (Local):
- [ ] Type checking passes: `./run check`
- [ ] Tests pass: `./run test`
- [ ] Build succeeds: `./run build`
- [ ] Dev server running: `./run start`
- [ ] Windows created dynamically: Verify DOM shows window elements
- [ ] Text renders properly: Content appears formatted correctly
- [ ] Input works: Can type and submit commands
- [ ] Multiple turns work: Can interact beyond first command

**Implementation Note**: After pre-commit verification passes, pause and request human approval to commit and push changes.

#### Build Verification:
- [ ] CI/CD build completes: `gh run watch`
- [ ] All build steps pass

#### Post-deployment Verification (Production):
- [ ] Game fully playable in production
- [ ] All interactions work correctly
- [ ] Performance acceptable: Response time < 500ms

---

## Phase 5: Complete Feature Parity

### Overview
Add remaining features from old client including suggestions, images, instructions, and analytics.

### Changes Required:

#### 1. Implement Remaining Components
- `buffer-section` component
- `input-suggestions` component
- `grid-line` component

#### 2. Port Additional Features
- Suggestion fetching and bin-pack layout (UpdateRenderer lines 183-201)
- Image generation for scenes (lines 149-181)
- Instruction detection and wrapping (misc.tsx:17-28)
- Analytics events

#### 3. Add Component Tests
Create test files following pattern in `/test/client/components/ImageElement.test.ts`

### Success Criteria:

#### Pre-commit Verification (Local):
- [ ] All component tests pass: `./run test`
- [ ] Type checking passes: `./run check`
- [ ] Build succeeds: `./run build`
- [ ] Dev server running: `./run start`
- [ ] Feature parity checklist:
  - [ ] Grid windows display properly
  - [ ] Images load for scenes
  - [ ] Instructions are clickable
  - [ ] Suggestions appear
  - [ ] Input history works
  - [ ] Save/load dialogs function

**Implementation Note**: After pre-commit verification passes, pause and request human approval to commit and push changes.

#### Build Verification:
- [ ] CI/CD build completes: `gh run watch`
- [ ] All build steps pass

#### Post-deployment Verification (Production):
- [ ] Full game experience works in production
- [ ] All features match old client functionality
- [ ] Performance metrics acceptable
- [ ] No console errors in production

---

## Testing Strategy

### Unit Tests (Following `/test/client/components/ImageElement.test.ts` pattern):

Each component gets isolated unit tests using:
- **linkedom** for DOM simulation
- **Dependency injection** for mocking external dependencies
- **Event-driven testing** - dispatch events, assert DOM changes

**Example: Testing grid-line component**
```typescript
test("grid-line renders styled content", () => {
    const window = parseHTML('<body><grid-line id="grid-line-0"></grid-line></body>');
    GridLine.definition({ HTMLElement: window.HTMLElement }).apply(window.customElements);

    const line = window.document.querySelector('grid-line');

    // Dispatch mock event
    line.dispatchEvent(new CustomEvent('engine-update', {
        detail: {
            content: [{
                id: '0',
                lines: [{ line: 0, content: [{style: 'header', text: 'Test'}] }]
            }]
        }
    }));

    // Assert DOM state changed
    expect(line.querySelector('.header')?.textContent).toEqual('Test');
});
```

**Example: Testing input-suggestions with mock HTTP**
```typescript
test("input-suggestions loads and displays results", async () => {
    const mockHttp = async () => ({
        ok: true,
        json: async () => ({ suggestions: ['north', 'south'] })
    });

    const window = parseHTML('<body><input-suggestions src="/api"></input-suggestions></body>');
    InputSuggestions.definition({
        HTMLElement: window.HTMLElement,
        http: mockHttp
    }).apply(window.customElements);

    const element = window.document.querySelector('input-suggestions');
    await element.loadSuggestions();

    // Assert DOM contains suggestions
    expect(element.querySelectorAll('x-instruction').length).toEqual(2);
});
```

**Benefits:**
- No real HTTP calls
- No real engine
- Fast execution
- Test one component at a time
- Bottom-up: test leaves first, then parents

### Integration Tests:
- Complete game turn cycle
- Multi-window scenarios
- Save/load functionality
- Image and suggestion loading

### Local Verification (Pre-commit):
1. Start dev server: `./run start`
2. Navigate to http://localhost:3000/new-client/test.html
3. Verify game loads and initial scene displays
4. Test input: Type "go north" and press enter
5. Verify response appears and new input requested
6. Test instruction clicking
7. Verify images load

### Production Verification (After deployment):
1. Load production URL/new-client/test.html
2. Complete full game interaction test
3. Verify all features work as in local
4. Check performance metrics

## Performance Considerations

- Keep template processing lightweight (simple regex)
- Minimize DOM manipulation by batching updates
- Use event delegation where possible
- Lazy load images with loading="lazy" attribute

## Migration Notes

- Old client remains functional throughout migration
- Each phase produces a working (if limited) system
- Can roll back to old client if issues arise
- Final switch happens only after full parity achieved

## Architecture Summary

### The Template-Driven Pattern:
```
Engine Update (full snapshot) → InteractiveFiction receives
                ↓
                PARENT: Create/delete windows (clones from template)
                ↓
                Dispatches event cascade to windows
                ↓
GridWindow receives event
                ↓
                PARENT: Create/delete grid-lines (clones from template)
                PARENT: Replace grid-line content (line.replaceChildren(...))
                ↓
GridLine (child)
                ↓
                Just exists as styled container
                No update logic needed
```

### Key Principles:
1. **No HTML in JavaScript** - all structure lives in the `<template>` tag
2. **Clone, don't generate** - components clone template fragments and bind data
3. **DOM does the work** - custom elements connect automatically when appended
4. **Simple data binding** - regex replacement of `{key}` patterns
5. **Event cascade for decoupling** - parent dispatches events, children listen
6. **Parents do all the work** - create/delete/update children based on engine messages
7. **Children are styling containers** - provide CSS hooks and event attachment points
8. **GlkOte sends snapshots** - content updates replace rather than merge

## References

- Original research: `thoughts/shared/research/2025-11-14-client-rewrite-status.md`
- UpdateRenderer logic: `/src/client/UpdateRenderer.tsx:39-279`
- Message flow pattern: `/src/client/MiniGlkOte.ts:42-56`
- Test pattern example: `/test/client/components/ImageElement.test.ts:1-35`
- HTML template structure: `/www/new-client/index.html:9-48`
- **GlkOte Protocol Documentation**: https://eblong.com/zarf/glk/glkote/docs.html (especially #windowsupdate section)
- **Type definitions**: `/src/client/types.ts:1-242` (TypeScript definitions for all GlkOte messages and windows)