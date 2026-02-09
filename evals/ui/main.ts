interface Score {
    name: string;
    value: number;
    reason?: string;
}

interface ModelOutput {
    model: string;
    output: any;
    latencyMs: number;
    cached: boolean;
}

interface CaseResult {
    case: { name: string; input: any };
    results: ModelOutput[];
    scores: Record<string, Score[]>;
    humanScores?: Record<string, number>;
}

interface EvalRun {
    name: string;
    timestamp: number;
    cases: CaseResult[];
}

type PanelKey = "text" | "images" | "img2img" | "summary";

const runSelect = document.getElementById("run-select") as HTMLSelectElement;
const panels: Record<PanelKey, HTMLElement> = {
    text: document.getElementById("text")!,
    images: document.getElementById("images")!,
    img2img: document.getElementById("img2img")!,
    summary: document.getElementById("summary")!,
};

let allRuns: string[] = [];
const loadedRuns = new Map<string, EvalRun>();
let currentRunFile = "";
let activePanel: PanelKey = "text";

// ── Run type → panel mapping ────────────────────

const runTypeToPanel: Record<string, PanelKey> = {
    suggestions: "text",
    "illustration-prompts": "text",
    images: "images",
    img2img: "img2img",
    "style-transfer": "img2img",
};

function runPrefix(filename: string): string {
    return filename.replace(/-\d+\.json$/, "");
}

function panelForRun(filename: string): PanelKey {
    return runTypeToPanel[runPrefix(filename)] ?? "text";
}

function runsForPanel(panel: PanelKey): string[] {
    return allRuns.filter(r => panelForRun(r) === panel);
}

// ── Tabs ────────────────────────────────────────

document.getElementById("tabs")!.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest(".tab") as HTMLElement | null;
    if (!btn) return;
    const panel = btn.dataset.panel as PanelKey;
    switchTab(panel);
});

function switchTab(panel: PanelKey, updateHash = true) {
    activePanel = panel;
    if (updateHash) history.replaceState(null, "", `#${panel}`);
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    document.querySelector(`[data-panel="${panel}"]`)?.classList.add("active");
    panels[panel].classList.add("active");
    populateRunSelect(panel);
}

const validPanels: PanelKey[] = ["text", "images", "img2img", "summary"];
const hashPanel = location.hash.slice(1) as PanelKey;
if (validPanels.includes(hashPanel)) {
    activePanel = hashPanel;
    switchTab(hashPanel, false);
}

window.addEventListener("hashchange", () => {
    const p = location.hash.slice(1) as PanelKey;
    if (validPanels.includes(p) && p !== activePanel) switchTab(p, false);
});

function populateRunSelect(panel: PanelKey) {
    const runs = panel === "summary" ? allRuns : runsForPanel(panel);
    const prevValue = runSelect.value;
    clear(runSelect);

    if (runs.length === 0) {
        const opt = document.createElement("option");
        opt.textContent = "No runs";
        opt.disabled = true;
        runSelect.appendChild(opt);
        showEmpty(panels[panel]);
        return;
    }

    for (const name of runs) {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = formatRunName(name);
        runSelect.appendChild(opt);
    }

    if (runs.includes(prevValue)) {
        runSelect.value = prevValue;
    } else {
        runSelect.value = runs[0];
    }

    loadRun(runSelect.value);
}

function formatRunName(filename: string): string {
    const prefix = runPrefix(filename);
    const ts = filename.match(/-(\d+)\.json$/)?.[1];
    if (!ts) return filename;
    const date = new Date(parseInt(ts));
    const fmt = date.toLocaleDateString("en-GB", {day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"});
    return `${prefix}  ${fmt}`;
}

// ── Rendering ───────────────────────────────────

function clear(el: HTMLElement) {
    while (el.firstChild) el.removeChild(el.firstChild);
}

function showEmpty(el: HTMLElement) {
    clear(el);
    const div = document.createElement("div");
    div.className = "empty-state";
    div.textContent = "No eval runs for this category yet";
    el.appendChild(div);
}

function shortModel(model: string): string {
    return model.replace(/^@(cf|hf)\//, "");
}

const modelDescriptions: Record<string, string> = {
    '@cf/meta/llama-3.3-70b-instruct-fp8-fast': '70B parameter LLM, fast FP8 quantised inference',
    '@cf/ibm-granite/granite-4.0-h-micro': 'Compact, efficient LLM from IBM',
    '@hf/nousresearch/hermes-2-pro-mistral-7b': '7B LLM fine-tuned for structured output and function calling',
    '@cf/qwen/qwen3-30b-a3b-fp8': '30B MoE LLM (3B active), fast FP8 inference',
    '@cf/bytedance/stable-diffusion-xl-lightning': 'Lightning-fast SDXL, high-quality 1024px images in 2 steps',
    '@cf/leonardo/lucid-origin': 'Leonardo\'s most prompt-adherent model, sharp design and accurate text rendering',
    '@cf/black-forest-labs/flux-1-schnell': '12B rectified flow transformer, fast text-to-image',
    '@cf/leonardo/phoenix-1.0': 'Leonardo\'s ground-up model, excels at text rendering and prompt coherence',
    '@cf/runwayml/stable-diffusion-v1-5-img2img': 'Classic SD 1.5 image-to-image diffusion',
    '@cf/black-forest-labs/flux-2-klein-4b': 'Ultra-fast 4B distilled model, unified generation and editing in 4 steps',
    '@cf/black-forest-labs/flux-2-klein-9b': 'Enhanced 9B distilled model, better quality than 4B, fixed 4-step inference',
    '@cf/meta/llama-3.2-11b-vision-instruct': '11B multimodal vision-language model',
};

async function loadRunList() {
    allRuns = await (await fetch("/api/runs")).json();
    if (allRuns.length > 0) {
        populateRunSelect(activePanel);
    }
}

async function loadRun(name: string) {
    currentRunFile = name;
    if (!loadedRuns.has(name)) {
        const run: EvalRun = await (await fetch(`/api/run/${name}`)).json();
        loadedRuns.set(name, run);
    }
    renderRun(loadedRuns.get(name)!);
}

runSelect.addEventListener("change", () => loadRun(runSelect.value));

function scoreBadgeClass(value: number): string {
    if (value >= 0.8) return "good";
    if (value >= 0.5) return "ok";
    return "bad";
}

function formatOutput(output: any): string {
    if (typeof output === "string") {
        try { return JSON.stringify(JSON.parse(output), null, 2); } catch { return output; }
    }
    if (Array.isArray(output?.choices)) {
        const content = output.choices[0]?.message?.content ?? "";
        try { return JSON.stringify(JSON.parse(content), null, 2); } catch { return content; }
    }
    if (output?.response) {
        try { return JSON.stringify(JSON.parse(output.response), null, 2); } catch { return output.response; }
    }
    return JSON.stringify(output, null, 2);
}

function isImagePath(output: any): boolean {
    return typeof output === "string" && /\.(jpg|png|webp|bin)$/.test(output);
}

function renderModelCard(
    result: ModelOutput,
    scores: Score[],
    humanScore: number | undefined,
    runFile: string,
    caseIndex: number,
    isImage: boolean,
): HTMLElement {
    const card = document.createElement("div");
    card.className = "model-card";
    card.dataset.model = result.model;

    const header = document.createElement("div");
    header.className = "model-card-header";

    const nameEl = document.createElement("div");
    nameEl.className = "model-name";
    nameEl.textContent = shortModel(result.model);
    const desc = modelDescriptions[result.model];
    if (desc) nameEl.title = desc;
    header.appendChild(nameEl);

    const latency = document.createElement("div");
    latency.className = "latency";
    latency.textContent = result.cached ? "cached" : `${result.latencyMs.toFixed(0)}ms`;
    header.appendChild(latency);

    card.appendChild(header);

    if (isImage && isImagePath(result.output)) {
        const img = document.createElement("img");
        img.src = `/api/image/${result.output}`;
        img.alt = `Generated by ${shortModel(result.model)}`;
        img.loading = "lazy";
        card.appendChild(img);
    } else {
        const pre = document.createElement("pre");
        pre.textContent = formatOutput(result.output);
        card.appendChild(pre);
    }

    if (scores.length > 0) {
        const scoresEl = document.createElement("div");
        scoresEl.className = "scores";
        for (const s of scores) {
            const badge = document.createElement("span");
            const cls = scoreBadgeClass(s.value);
            badge.className = `score-badge ${cls}`;
            const dot = document.createElement("span");
            dot.className = "score-dot";
            badge.appendChild(dot);
            badge.appendChild(document.createTextNode(`${s.name} ${s.value.toFixed(2)}`));
            if (s.reason) badge.title = s.reason;
            scoresEl.appendChild(badge);
        }
        card.appendChild(scoresEl);
    }

    const ratingDiv = document.createElement("div");
    ratingDiv.className = "human-rating";

    const label = document.createElement("span");
    label.className = "human-rating-label";
    label.textContent = "Rate";
    ratingDiv.appendChild(label);

    for (let i = 1; i <= 5; i++) {
        const btn = document.createElement("button");
        btn.textContent = String(i);
        if (humanScore === i) btn.classList.add("selected");
        btn.addEventListener("click", async () => {
            await fetch("/api/score", {
                method: "POST",
                headers: {"content-type": "application/json"},
                body: JSON.stringify({runFile, caseIndex, model: result.model, score: i}),
            });
            ratingDiv.querySelectorAll("button").forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");
            const run = loadedRuns.get(runFile);
            if (run) {
                const c = run.cases[caseIndex];
                if (!c.humanScores) c.humanScores = {};
                c.humanScores[result.model] = i;
            }
        });
        ratingDiv.appendChild(btn);
    }
    card.appendChild(ratingDiv);

    return card;
}

function formatPrompt(input: any): string {
    if (input?.scene?.description) {
        const parts = [];
        if (input.story?.title) parts.push(input.story.title);
        parts.push(input.scene.description);
        return parts.join(" — ");
    }
    if (input?.description) return input.description;
    return JSON.stringify(input, null, 2);
}

function renderCases(container: HTMLElement, cases: CaseResult[], isImage: boolean) {
    clear(container);
    cases.forEach((c, caseIndex) => {
        const block = document.createElement("div");
        block.className = "case-block";
        block.dataset.caseIndex = String(caseIndex);

        const header = document.createElement("div");
        header.className = "case-header";
        const title = document.createElement("h3");
        title.textContent = c.case.name;
        header.appendChild(title);
        block.appendChild(header);

        const promptDisplay = document.createElement("div");
        promptDisplay.className = "prompt-display";
        promptDisplay.textContent = formatPrompt(c.case.input);
        promptDisplay.addEventListener("click", () => promptDisplay.classList.toggle("expanded"));
        block.appendChild(promptDisplay);

        const grid = document.createElement("div");
        grid.className = isImage ? "model-grid image-grid" : "model-grid";

        for (const result of c.results) {
            const scores = c.scores[result.model] ?? [];
            const humanScore = c.humanScores?.[result.model];
            grid.appendChild(renderModelCard(result, scores, humanScore, currentRunFile, caseIndex, isImage));
        }

        block.appendChild(grid);
        container.appendChild(block);
    });
}

// Estimated neurons per request — from https://developers.cloudflare.com/workers-ai/platform/pricing/
// Text: ~400 input + ~400 output tokens assumed. Image: 512x512, default steps.
const neuronsPerRequest: Record<string, number> = {
    '@cf/meta/llama-3.3-70b-instruct-fp8-fast': 93,
    '@cf/ibm-granite/granite-4.0-h-micro': 5,
    '@hf/nousresearch/hermes-2-pro-mistral-7b': 11,
    '@cf/qwen/qwen3-30b-a3b-fp8': 14,
    '@cf/black-forest-labs/flux-1-schnell': 43,
    '@cf/leonardo/lucid-origin': 876,
    '@cf/leonardo/phoenix-1.0': 730,
    '@cf/black-forest-labs/flux-2-klein-4b': 110,
    '@cf/black-forest-labs/flux-2-klein-9b': 1545,
    '@cf/meta/llama-3.2-11b-vision-instruct': 26,
};

function estimateCost(model: string): number | undefined {
    const neurons = neuronsPerRequest[model];
    if (neurons === undefined) return undefined;
    return neurons * 0.011 / 1000;
}

interface ModelAgg {
    scores: Map<string, number[]>;
    humanScores: number[];
    latencies: number[];
    requests: number;
}

function renderSummary(container: HTMLElement, runs: EvalRun[]) {
    clear(container);

    for (const run of runs) {
        const section = document.createElement("div");
        section.className = "summary-section";

        const heading = document.createElement("h2");
        heading.textContent = run.name;
        section.appendChild(heading);

        const table = document.createElement("table");
        table.className = "summary-table";

        const scorerNames = new Set<string>();
        for (const c of run.cases) {
            for (const scores of Object.values(c.scores)) {
                for (const s of scores) scorerNames.add(s.name);
            }
        }

        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        for (const col of ["Model", ...scorerNames, "Human", "Avg ms", "Est. $/req"]) {
            const th = document.createElement("th");
            th.textContent = col;
            headerRow.appendChild(th);
        }
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const modelAggs = new Map<string, ModelAgg>();
        for (const c of run.cases) {
            for (const [model, scores] of Object.entries(c.scores)) {
                if (!modelAggs.has(model)) modelAggs.set(model, {scores: new Map(), humanScores: [], latencies: [], requests: 0});
                const agg = modelAggs.get(model)!;
                for (const s of scores) {
                    if (!agg.scores.has(s.name)) agg.scores.set(s.name, []);
                    agg.scores.get(s.name)!.push(s.value);
                }
                const hs = c.humanScores?.[model];
                if (hs !== undefined) agg.humanScores.push(hs);
            }
            for (const r of c.results) {
                if (!modelAggs.has(r.model)) modelAggs.set(r.model, {scores: new Map(), humanScores: [], latencies: [], requests: 0});
                const agg = modelAggs.get(r.model)!;
                if (!r.cached) {
                    agg.latencies.push(r.latencyMs);
                    agg.requests++;
                }
            }
        }

        const tbody = document.createElement("tbody");
        for (const [model, agg] of modelAggs) {
            const row = document.createElement("tr");
            const modelTd = document.createElement("td");
            modelTd.className = "model-cell";
            modelTd.textContent = shortModel(model);
            const modelDesc = modelDescriptions[model];
            if (modelDesc) modelTd.title = modelDesc;
            row.appendChild(modelTd);

            for (const name of scorerNames) {
                const td = document.createElement("td");
                const vals = agg.scores.get(name) ?? [];
                if (vals.length > 0) {
                    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
                    td.textContent = avg.toFixed(3);
                    td.className = scoreBadgeClass(avg);
                } else {
                    td.textContent = "-";
                }
                row.appendChild(td);
            }

            const humanTd = document.createElement("td");
            if (agg.humanScores.length > 0) {
                const avg = agg.humanScores.reduce((a, b) => a + b, 0) / agg.humanScores.length;
                humanTd.textContent = avg.toFixed(1) + "/5";
            } else {
                humanTd.textContent = "-";
            }
            row.appendChild(humanTd);

            const latencyTd = document.createElement("td");
            if (agg.latencies.length > 0) {
                const avg = agg.latencies.reduce((a, b) => a + b, 0) / agg.latencies.length;
                latencyTd.textContent = avg.toFixed(0);
            } else {
                latencyTd.textContent = "-";
            }
            row.appendChild(latencyTd);

            const costTd = document.createElement("td");
            const perReq = estimateCost(model);
            if (perReq !== undefined) {
                const total = perReq * agg.requests;
                costTd.textContent = total < 0.01
                    ? `$${total.toFixed(4)}`
                    : `$${total.toFixed(2)}`;
                costTd.title = `$${perReq.toFixed(5)}/req × ${agg.requests} requests`;
            } else {
                costTd.textContent = "-";
            }
            row.appendChild(costTd);

            tbody.appendChild(row);
        }
        table.appendChild(tbody);
        section.appendChild(table);
        container.appendChild(section);
    }
}

function renderRun(run: EvalRun) {
    const isImage = run.name === "images" || run.name === "img2img" || run.name === "style-transfer";
    const target = panelForRun(currentRunFile) === "summary"
        ? panels.text
        : panels[panelForRun(currentRunFile)];

    renderCases(target, run.cases, isImage);

    if (activePanel === "summary") {
        const allLoaded = [...loadedRuns.values()];
        renderSummary(panels.summary, allLoaded);
    } else {
        renderSummary(panels.summary, [run]);
    }
}

// ── Lightbox ────────────────────────────────────

const lightbox = document.getElementById("lightbox") as HTMLDialogElement;
const lightboxImg = document.getElementById("lightbox-img") as HTMLImageElement;
const lightboxRating = document.getElementById("lightbox-rating") as HTMLElement;
const lightboxPrev = lightbox.querySelector(".lightbox-prev") as HTMLButtonElement;
const lightboxNext = lightbox.querySelector(".lightbox-next") as HTMLButtonElement;

interface LightboxEntry {
    src: string;
    model: string;
    caseIndex: number;
    card: HTMLElement;
}

let lightboxEntries: LightboxEntry[] = [];
let lightboxIndex = 0;

function showLightboxEntry(index: number) {
    lightboxIndex = index;
    const entry = lightboxEntries[index];
    lightboxImg.src = entry.src;

    const run = loadedRuns.get(currentRunFile);
    const humanScore = run?.cases[entry.caseIndex]?.humanScores?.[entry.model];

    clear(lightboxRating);

    const label = document.createElement("span");
    label.className = "human-rating-label";
    label.textContent = "Rate";
    lightboxRating.appendChild(label);

    for (let i = 1; i <= 5; i++) {
        const btn = document.createElement("button");
        btn.textContent = String(i);
        if (humanScore === i) btn.classList.add("selected");
        btn.addEventListener("click", async () => {
            await fetch("/api/score", {
                method: "POST",
                headers: {"content-type": "application/json"},
                body: JSON.stringify({runFile: currentRunFile, caseIndex: entry.caseIndex, model: entry.model, score: i}),
            });
            lightboxRating.querySelectorAll("button").forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");
            if (run) {
                const c = run.cases[entry.caseIndex];
                if (!c.humanScores) c.humanScores = {};
                c.humanScores[entry.model] = i;
            }
            // Sync back to card
            const cardBtns = entry.card.querySelectorAll(".human-rating button");
            cardBtns.forEach(b => b.classList.remove("selected"));
            cardBtns[i - 1]?.classList.add("selected");
        });
        lightboxRating.appendChild(btn);
    }

    // Hide arrows when only one image
    const single = lightboxEntries.length <= 1;
    lightboxPrev.hidden = single;
    lightboxNext.hidden = single;
}

document.addEventListener("click", (e) => {
    const img = (e.target as HTMLElement).closest(".model-card img") as HTMLImageElement | null;
    if (!img) return;

    const card = img.closest(".model-card") as HTMLElement;
    const caseBlock = card.closest(".case-block") as HTMLElement;

    lightboxEntries = [];
    lightboxIndex = 0;
    caseBlock.querySelectorAll(".model-card").forEach(c => {
        const cardImg = c.querySelector("img") as HTMLImageElement | null;
        if (!cardImg) return;
        const idx = lightboxEntries.length;
        lightboxEntries.push({
            src: cardImg.src,
            model: (c as HTMLElement).dataset.model ?? "",
            caseIndex: parseInt(caseBlock.dataset.caseIndex ?? "0"),
            card: c as HTMLElement,
        });
        if (c === card) lightboxIndex = idx;
    });

    showLightboxEntry(lightboxIndex);
    lightbox.showModal();
});

// Backdrop click closes, content clicks don't
lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) lightbox.close();
});

// Arrow navigation
function lightboxNav(delta: number) {
    if (lightboxEntries.length <= 1) return;
    lightboxIndex = (lightboxIndex + delta + lightboxEntries.length) % lightboxEntries.length;
    showLightboxEntry(lightboxIndex);
}

lightboxPrev.addEventListener("click", () => lightboxNav(-1));
lightboxNext.addEventListener("click", () => lightboxNav(1));

// Keyboard navigation
lightbox.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); lightboxNav(-1); }
    if (e.key === "ArrowRight") { e.preventDefault(); lightboxNav(1); }
});

loadRunList();
