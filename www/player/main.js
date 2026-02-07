// node_modules/@bodar/wasiglk/src/blorb.js
var FORM = 1179603533;
var IFRS = 1229345363;
var RIdx = 1380541560;
var PNG_ = 1347307296;
var JPEG = 1246774599;
function fourccToString(val) {
  return String.fromCharCode(val >> 24 & 255, val >> 16 & 255, val >> 8 & 255, val & 255);
}

class BlorbParser {
  data;
  view;
  chunks = [];
  resources = [];
  imageCache = new Map;
  blobUrlCache = new Map;
  constructor(data) {
    this.data = data;
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    this.parse();
  }
  static isBlorb(data) {
    if (data.length < 12)
      return false;
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const form = view.getUint32(0, false);
    const ifrs = view.getUint32(8, false);
    return form === FORM && ifrs === IFRS;
  }
  getExecutable() {
    const execResource = this.resources.find((r) => r.usage === "Exec" && r.number === 0);
    if (!execResource)
      return null;
    const chunk = this.chunks[execResource.chunkIndex];
    if (!chunk)
      return null;
    return {
      type: fourccToString(this.view.getUint32(chunk.offset - 8, false)),
      data: chunk.data
    };
  }
  getImage(imageNum) {
    if (this.imageCache.has(imageNum)) {
      return this.imageCache.get(imageNum);
    }
    const resource = this.resources.find((r) => r.usage === "Pict" && r.number === imageNum);
    if (!resource)
      return null;
    const chunk = this.chunks[resource.chunkIndex];
    if (!chunk)
      return null;
    const chunkType = this.view.getUint32(chunk.offset - 8, false);
    let format;
    if (chunkType === PNG_) {
      format = "png";
    } else if (chunkType === JPEG) {
      format = "jpeg";
    } else {
      return null;
    }
    const dimensions = format === "png" ? this.getPngDimensions(chunk.data) : this.getJpegDimensions(chunk.data);
    if (!dimensions)
      return null;
    const image = {
      number: imageNum,
      format,
      data: chunk.data,
      width: dimensions.width,
      height: dimensions.height
    };
    this.imageCache.set(imageNum, image);
    return image;
  }
  getImageNumbers() {
    return this.resources.filter((r) => r.usage === "Pict").map((r) => r.number);
  }
  getImageUrl(imageNum) {
    if (this.blobUrlCache.has(imageNum)) {
      return this.blobUrlCache.get(imageNum);
    }
    const image = this.getImage(imageNum);
    if (!image)
      return;
    const mimeType = image.format === "png" ? "image/png" : "image/jpeg";
    const blob = new Blob([
      new Uint8Array(image.data)
    ], {
      type: mimeType
    });
    const url = URL.createObjectURL(blob);
    this.blobUrlCache.set(imageNum, url);
    return url;
  }
  getImageInfo(imageNum) {
    const image = this.getImage(imageNum);
    if (!image)
      return null;
    return {
      width: image.width,
      height: image.height
    };
  }
  dispose() {
    for (const url of this.blobUrlCache.values()) {
      URL.revokeObjectURL(url);
    }
    this.blobUrlCache.clear();
    this.imageCache.clear();
  }
  parse() {
    if (this.data.length < 12) {
      throw new Error("Blorb file too small");
    }
    const formId = this.view.getUint32(0, false);
    if (formId !== FORM) {
      throw new Error("Not a valid IFF file (missing FORM)");
    }
    const totalLength = this.view.getUint32(4, false) + 8;
    const typeId = this.view.getUint32(8, false);
    if (typeId !== IFRS) {
      throw new Error("Not a Blorb file (missing IFRS)");
    }
    let ridxData = null;
    let pos = 12;
    while (pos < totalLength && pos < this.data.length) {
      if (pos + 8 > this.data.length)
        break;
      const chunkType = this.view.getUint32(pos, false);
      const chunkLen = this.view.getUint32(pos + 4, false);
      const dataStart = pos + 8;
      if (dataStart + chunkLen > this.data.length)
        break;
      const chunkData = this.data.subarray(dataStart, dataStart + chunkLen);
      this.chunks.push({
        type: fourccToString(chunkType),
        data: chunkData,
        offset: dataStart
      });
      if (chunkType === RIdx) {
        ridxData = chunkData;
      }
      pos = dataStart + chunkLen;
      if (pos & 1)
        pos++;
    }
    if (ridxData) {
      this.parseResourceIndex(ridxData);
    }
  }
  parseResourceIndex(data) {
    if (data.length < 4)
      return;
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const numResources = view.getUint32(0, false);
    for (let i = 0;i < numResources && 4 + i * 12 + 12 <= data.length; i++) {
      const offset = 4 + i * 12;
      const usage = view.getUint32(offset, false);
      const resNum = view.getUint32(offset + 4, false);
      const startPos = view.getUint32(offset + 8, false);
      const chunkIndex = this.chunks.findIndex((c) => c.offset === startPos + 8 || c.offset - 8 === startPos);
      if (chunkIndex >= 0) {
        this.resources.push({
          usage: fourccToString(usage),
          number: resNum,
          chunkIndex
        });
      }
    }
  }
  getPngDimensions(data) {
    if (data.length < 24)
      return null;
    if (data[0] !== 137 || data[1] !== 80 || data[2] !== 78 || data[3] !== 71) {
      return null;
    }
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const width = view.getUint32(16, false);
    const height = view.getUint32(20, false);
    return {
      width,
      height
    };
  }
  getJpegDimensions(data) {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let pos = 0;
    while (pos < data.length) {
      if (data[pos] !== 255) {
        pos++;
        continue;
      }
      while (pos < data.length && data[pos] === 255) {
        pos++;
      }
      if (pos >= data.length)
        break;
      const marker = data[pos];
      pos++;
      if (marker >= 192 && marker <= 207 && marker !== 196 && marker !== 200 && marker !== 204) {
        if (pos + 7 > data.length)
          break;
        const height = view.getUint16(pos + 3, false);
        const width = view.getUint16(pos + 5, false);
        return {
          width,
          height
        };
      }
      if (marker === 1 || marker >= 208 && marker <= 217) {
        continue;
      }
      if (pos + 2 > data.length)
        break;
      const len = view.getUint16(pos, false);
      pos += len;
    }
    return null;
  }
}

// node_modules/@bodar/wasiglk/src/format.js
var EXTENSION_MAP = {
  ".ulx": {
    format: "glulx",
    interpreter: "glulxe",
    isBlorb: false
  },
  ".gblorb": {
    format: "glulx",
    interpreter: "glulxe",
    isBlorb: true
  },
  ".blb": {
    format: "glulx",
    interpreter: "glulxe",
    isBlorb: true
  },
  ".z1": {
    format: "zcode",
    interpreter: "fizmo",
    isBlorb: false
  },
  ".z2": {
    format: "zcode",
    interpreter: "fizmo",
    isBlorb: false
  },
  ".z3": {
    format: "zcode",
    interpreter: "fizmo",
    isBlorb: false
  },
  ".z4": {
    format: "zcode",
    interpreter: "fizmo",
    isBlorb: false
  },
  ".z5": {
    format: "zcode",
    interpreter: "fizmo",
    isBlorb: false
  },
  ".z6": {
    format: "zcode",
    interpreter: "fizmo",
    isBlorb: false
  },
  ".z7": {
    format: "zcode",
    interpreter: "fizmo",
    isBlorb: false
  },
  ".z8": {
    format: "zcode",
    interpreter: "fizmo",
    isBlorb: false
  },
  ".zblorb": {
    format: "zcode",
    interpreter: "fizmo",
    isBlorb: true
  },
  ".hex": {
    format: "hugo",
    interpreter: "hugo",
    isBlorb: false
  },
  ".gam": {
    format: "tads2",
    interpreter: "tads2",
    isBlorb: false
  },
  ".t3": {
    format: "tads3",
    interpreter: "tads3",
    isBlorb: false
  },
  ".acd": {
    format: "alan3",
    interpreter: "alan3",
    isBlorb: false
  },
  ".a3c": {
    format: "alan3",
    interpreter: "alan3",
    isBlorb: false
  },
  ".taf": {
    format: "adrift",
    interpreter: "scare",
    isBlorb: false
  },
  ".agx": {
    format: "agt",
    interpreter: "agility",
    isBlorb: false
  },
  ".dat": {
    format: "advsys",
    interpreter: "advsys",
    isBlorb: false
  },
  ".l9": {
    format: "level9",
    interpreter: "level9",
    isBlorb: false
  },
  ".sna": {
    format: "level9",
    interpreter: "level9",
    isBlorb: false
  },
  ".mag": {
    format: "magnetic",
    interpreter: "magnetic",
    isBlorb: false
  },
  ".saga": {
    format: "scott",
    interpreter: "scott",
    isBlorb: false
  },
  ".sagaplus": {
    format: "sagaplus",
    interpreter: "plus",
    isBlorb: false
  },
  ".taylor": {
    format: "taylor",
    interpreter: "taylor",
    isBlorb: false
  }
};
var MAGIC_SIGNATURES = [
  {
    bytes: [
      71,
      108,
      117,
      108
    ],
    offset: 0,
    format: "glulx",
    interpreter: "glulxe"
  },
  {
    bytes: [
      1
    ],
    offset: 0,
    format: "zcode",
    interpreter: "fizmo"
  },
  {
    bytes: [
      2
    ],
    offset: 0,
    format: "zcode",
    interpreter: "fizmo"
  },
  {
    bytes: [
      3
    ],
    offset: 0,
    format: "zcode",
    interpreter: "fizmo"
  },
  {
    bytes: [
      4
    ],
    offset: 0,
    format: "zcode",
    interpreter: "fizmo"
  },
  {
    bytes: [
      5
    ],
    offset: 0,
    format: "zcode",
    interpreter: "fizmo"
  },
  {
    bytes: [
      6
    ],
    offset: 0,
    format: "zcode",
    interpreter: "fizmo"
  },
  {
    bytes: [
      7
    ],
    offset: 0,
    format: "zcode",
    interpreter: "fizmo"
  },
  {
    bytes: [
      8
    ],
    offset: 0,
    format: "zcode",
    interpreter: "fizmo"
  },
  {
    bytes: [
      72,
      85,
      71,
      79
    ],
    offset: 0,
    format: "hugo",
    interpreter: "hugo"
  },
  {
    bytes: [
      84,
      65,
      68,
      83
    ],
    offset: 0,
    format: "tads2",
    interpreter: "tads2"
  },
  {
    bytes: [
      84,
      51,
      45,
      105
    ],
    offset: 0,
    format: "tads3",
    interpreter: "tads3"
  }
];
function detectFormatFromUrl(url) {
  const urlObj = new URL(url, "file://");
  const pathname = urlObj.pathname.toLowerCase();
  for (const [ext, info] of Object.entries(EXTENSION_MAP)) {
    if (pathname.endsWith(ext)) {
      return info;
    }
  }
  if (pathname.endsWith(".blorb")) {
    return {
      format: "unknown",
      interpreter: "glulxe",
      isBlorb: true
    };
  }
  return null;
}
function detectFormatFromData(data) {
  if (data.length >= 12) {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const form = view.getUint32(0, false);
    const ifrs = view.getUint32(8, false);
    if (form === 1179603533 && ifrs === 1229345363) {
      const execInfo = detectBlorbExecutableType(data);
      if (execInfo) {
        return {
          ...execInfo,
          isBlorb: true
        };
      }
      return {
        format: "unknown",
        interpreter: "glulxe",
        isBlorb: true
      };
    }
  }
  for (const sig of MAGIC_SIGNATURES) {
    if (matchesSignature(data, sig.bytes, sig.offset)) {
      return {
        format: sig.format,
        interpreter: sig.interpreter,
        isBlorb: false
      };
    }
  }
  return null;
}
function detectFormat(url, data) {
  if (url) {
    const fromUrl = detectFormatFromUrl(url);
    if (fromUrl)
      return fromUrl;
  }
  const fromData = detectFormatFromData(data);
  if (fromData)
    return fromData;
  return {
    format: "unknown",
    interpreter: "glulxe",
    isBlorb: false
  };
}
function matchesSignature(data, signature, offset) {
  if (data.length < offset + signature.length)
    return false;
  for (let i = 0;i < signature.length; i++) {
    if (data[offset + i] !== signature[i])
      return false;
  }
  return true;
}
function detectBlorbExecutableType(data) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let pos = 12;
  const totalLength = Math.min(view.getUint32(4, false) + 8, data.length);
  while (pos < totalLength) {
    if (pos + 8 > data.length)
      break;
    const chunkType = view.getUint32(pos, false);
    const chunkLen = view.getUint32(pos + 4, false);
    if (chunkType === 1196184908) {
      return {
        format: "glulx",
        interpreter: "glulxe"
      };
    }
    if (chunkType === 1514360644) {
      return {
        format: "zcode",
        interpreter: "fizmo"
      };
    }
    pos = pos + 8 + chunkLen;
    if (pos & 1)
      pos++;
  }
  return null;
}

// node_modules/@bodar/wasiglk/src/protocol.js
var IMAGE_ALIGNMENT_VALUES = {
  1: "inlineup",
  2: "inlinedown",
  3: "inlinecenter",
  4: "marginleft",
  5: "marginright"
};
function parseRemGlkUpdate(update, resolveImageUrl) {
  const clientUpdates = [];
  if (update.type === "error") {
    clientUpdates.push({
      type: "error",
      message: update.message ?? "Unknown error"
    });
  }
  if (update.windows && update.windows.length > 0) {
    clientUpdates.push({
      type: "window",
      windows: update.windows
    });
  }
  if (update.content) {
    for (const content of update.content) {
      if (content.draw) {
        clientUpdates.push({
          type: "content",
          windowId: content.id,
          clear: content.clear ?? false,
          content: processDrawOperations(content.draw, resolveImageUrl)
        });
      } else if (content.lines) {
        clientUpdates.push({
          type: "content",
          windowId: content.id,
          clear: content.clear ?? false,
          content: processGridLines(content.lines, resolveImageUrl)
        });
      } else if (content.text) {
        clientUpdates.push({
          type: "content",
          windowId: content.id,
          clear: content.clear ?? false,
          content: processBufferText(content.text, resolveImageUrl)
        });
      } else {
        clientUpdates.push({
          type: "content",
          windowId: content.id,
          clear: content.clear ?? false,
          content: []
        });
      }
    }
  }
  if (update.input) {
    for (const input of update.input) {
      clientUpdates.push({
        type: "input-request",
        windowId: input.id,
        inputType: input.type,
        maxLength: input.maxlen,
        initial: input.initial,
        mouse: input.mouse,
        hyperlink: input.hyperlink,
        xpos: input.xpos,
        ypos: input.ypos,
        terminators: input.terminators
      });
    }
  }
  if (update.timer !== undefined) {
    clientUpdates.push({
      type: "timer",
      interval: update.timer
    });
  }
  if (update.disable !== undefined) {
    clientUpdates.push({
      type: "disable",
      disabled: update.disable
    });
  }
  if (update.exit) {
    clientUpdates.push({
      type: "exit"
    });
  }
  if (update.debugoutput && update.debugoutput.length > 0) {
    clientUpdates.push({
      type: "debug-output",
      messages: update.debugoutput
    });
  }
  if (update.specialinput) {
    clientUpdates.push({
      type: "special-input",
      inputType: update.specialinput.type,
      filemode: update.specialinput.filemode,
      filetype: update.specialinput.filetype,
      gameid: update.specialinput.gameid
    });
  }
  return clientUpdates;
}
function processContentSpan(span, resolveImageUrl) {
  if (typeof span === "string") {
    return {
      type: "text",
      text: span
    };
  }
  if ("text" in span) {
    return {
      type: "text",
      text: span.text,
      style: span.style,
      hyperlink: span.hyperlink
    };
  }
  if ("special" in span) {
    const special = span.special;
    if (special.type === "image" && special.image !== undefined) {
      return {
        type: "image",
        imageNumber: special.image,
        imageUrl: resolveImageUrl(special.image) ?? special.url,
        alignment: typeof special.alignment === "number" ? IMAGE_ALIGNMENT_VALUES[special.alignment] : special.alignment,
        width: special.width,
        height: special.height,
        alttext: special.alttext
      };
    }
    if (special.type === "flowbreak") {
      return {
        type: "flowbreak"
      };
    }
  }
  return null;
}
function processContentSpans(spans, resolveImageUrl) {
  return spans.map((span) => processContentSpan(span, resolveImageUrl)).filter((span) => span !== null);
}
function processDrawOperation(draw, resolveImageUrl) {
  switch (draw.special) {
    case "image":
      if (draw.image !== undefined) {
        return {
          type: "image",
          imageNumber: draw.image,
          imageUrl: resolveImageUrl(draw.image) ?? draw.url,
          width: draw.width,
          height: draw.height,
          x: draw.x,
          y: draw.y
        };
      }
      return null;
    case "fill":
      return {
        type: "fill",
        color: draw.color,
        x: draw.x,
        y: draw.y,
        width: draw.width,
        height: draw.height
      };
    case "setcolor":
      return {
        type: "setcolor",
        color: draw.color
      };
    default:
      return null;
  }
}
function processDrawOperations(draws, resolveImageUrl) {
  return draws.map((draw) => processDrawOperation(draw, resolveImageUrl)).filter((span) => span !== null);
}
function processBufferText(paragraphs, resolveImageUrl) {
  if (!Array.isArray(paragraphs)) {
    console.warn("processBufferText: expected array, got", typeof paragraphs, paragraphs);
    if (typeof paragraphs === "string") {
      return [
        {
          type: "text",
          text: paragraphs
        }
      ];
    }
    return [];
  }
  return paragraphs.flatMap((para) => {
    const spans = [];
    if (para.flowbreak) {
      spans.push({
        type: "flowbreak"
      });
    }
    if (para.content) {
      spans.push(...processContentSpans(para.content, resolveImageUrl));
    }
    return spans;
  });
}
function processGridLines(lines, resolveImageUrl) {
  return lines.flatMap((line) => line.content ? processContentSpans(line.content, resolveImageUrl) : []);
}

// node_modules/@bodar/wasiglk/src/client.js
class WasiGlkClient {
  storyData;
  interpreterData;
  formatInfo;
  blorb = null;
  worker = null;
  running = false;
  pendingUpdates = [];
  updateResolve = null;
  workerUrl;
  storyId;
  filesystem;
  constructor(storyData, interpreterData, formatInfo, blorb, workerUrl, storyId, filesystem) {
    this.storyData = storyData;
    this.interpreterData = interpreterData;
    this.formatInfo = formatInfo;
    this.blorb = blorb;
    this.workerUrl = workerUrl;
    this.storyId = storyId;
    this.filesystem = filesystem;
  }
  static async create(config) {
    let storyData;
    let storyUrl = null;
    if (config.storyData) {
      storyData = config.storyData;
    } else if (config.storyUrl) {
      storyUrl = config.storyUrl;
      const response = await fetch(config.storyUrl);
      if (!response.ok)
        throw new Error(`Failed to load story: ${response.status}`);
      storyData = new Uint8Array(await response.arrayBuffer());
    } else {
      throw new Error("Either storyUrl or storyData must be provided");
    }
    const formatInfo = config.format ? {
      format: config.format,
      interpreter: getInterpreterName(config.format),
      isBlorb: false
    } : detectFormat(storyUrl, storyData);
    let blorb = null;
    let executableData = storyData;
    if (formatInfo.isBlorb || BlorbParser.isBlorb(storyData)) {
      blorb = new BlorbParser(storyData);
      const exec = blorb.getExecutable();
      if (exec) {
        executableData = exec.data;
        if (exec.type === "GLUL") {
          formatInfo.format = "glulx";
          formatInfo.interpreter = "glulxe";
        } else if (exec.type === "ZCOD") {
          formatInfo.format = "zcode";
          formatInfo.interpreter = "fizmo";
        }
      }
    }
    let interpreterData;
    if (config.interpreterData) {
      interpreterData = config.interpreterData;
    } else {
      const interpreterUrl = config.interpreterUrl ?? `/${formatInfo.interpreter}.wasm`;
      const response = await fetch(interpreterUrl);
      if (!response.ok)
        throw new Error(`Failed to load interpreter: ${response.status}`);
      interpreterData = await response.arrayBuffer();
    }
    const gameName = storyUrl ? storyUrl.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "unknown" : "story";
    const versionHash = hashBytes(storyData).toString(16).padStart(8, "0");
    const storyId = `${gameName}/${versionHash}`;
    return new WasiGlkClient(executableData, interpreterData, formatInfo, blorb, config.workerUrl, storyId, config.filesystem ?? "auto");
  }
  get format() {
    return this.formatInfo;
  }
  getBlorb() {
    return this.blorb;
  }
  getImageUrl(imageNum) {
    return this.blorb?.getImageUrl(imageNum);
  }
  sendInput(value) {
    this.worker?.postMessage({
      type: "input",
      value
    });
  }
  sendChar(char) {
    this.sendInput(char);
  }
  sendArrange(metrics) {
    this.worker?.postMessage({
      type: "arrange",
      metrics: {
        width: metrics.width,
        height: metrics.height,
        charWidth: metrics.charWidth,
        charHeight: metrics.charHeight
      }
    });
  }
  sendMouse(windowId, x, y) {
    this.worker?.postMessage({
      type: "mouse",
      windowId,
      x,
      y
    });
  }
  sendHyperlink(windowId, linkValue) {
    this.worker?.postMessage({
      type: "hyperlink",
      windowId,
      linkValue
    });
  }
  sendRedraw(windowId) {
    this.worker?.postMessage({
      type: "redraw",
      windowId
    });
  }
  sendRefresh() {
    this.worker?.postMessage({
      type: "refresh"
    });
  }
  stop() {
    this.running = false;
    this.blorb?.dispose();
    if (this.worker) {
      this.worker.postMessage({
        type: "stop"
      });
      this.worker.terminate();
      this.worker = null;
    }
    if (this.updateResolve) {
      this.updateResolve({
        value: undefined,
        done: true
      });
      this.updateResolve = null;
    }
  }
  async* updates(config) {
    if (this.running)
      throw new Error("Client is already running");
    this.running = true;
    try {
      this.worker = new Worker(this.workerUrl, {
        type: "module"
      });
      this.worker.onmessage = (e) => {
        this.handleWorkerMessage(e.data);
      };
      this.worker.onerror = (e) => {
        this.pendingUpdates.push({
          type: "error",
          message: e.message || "Worker error"
        });
        this.resolveNextUpdate();
      };
      const initMessage = {
        type: "init",
        interpreter: this.interpreterData,
        story: this.storyData,
        args: [
          this.formatInfo.interpreter,
          "/sys/story.ulx"
        ],
        metrics: config,
        storyId: this.storyId,
        filesystem: this.filesystem
      };
      this.worker.postMessage(initMessage, [
        this.interpreterData
      ]);
      while (this.running) {
        if (this.pendingUpdates.length > 0) {
          yield this.pendingUpdates.shift();
        } else {
          const result = await new Promise((resolve) => {
            this.updateResolve = resolve;
            if (!this.running)
              resolve({
                value: undefined,
                done: true
              });
          });
          if (result.done)
            break;
          yield result.value;
        }
      }
    } finally {
      this.running = false;
      this.worker?.terminate();
      this.worker = null;
    }
  }
  handleWorkerMessage(msg) {
    switch (msg.type) {
      case "update":
        for (const update of parseRemGlkUpdate(msg.data, (n) => this.blorb?.getImageUrl(n))) {
          this.pendingUpdates.push(update);
        }
        this.resolveNextUpdate();
        break;
      case "error":
        this.pendingUpdates.push({
          type: "error",
          message: msg.message
        });
        this.resolveNextUpdate();
        break;
      case "exit":
        this.running = false;
        this.resolveNextUpdate();
        break;
      case "fileDialogRequest":
        this.handleFileDialogRequest(msg.filemode, msg.filetype);
        break;
    }
  }
  async handleFileDialogRequest(filemode, filetype) {
    if (!("showOpenFilePicker" in window) || !("showSaveFilePicker" in window)) {
      console.warn("[client] File System Access API not available");
      this.worker?.postMessage({
        type: "fileDialogResult",
        filename: null
      });
      return;
    }
    const { extension, description } = getFileTypeInfo(filetype);
    try {
      let handle;
      if (filemode === "read") {
        const [pickedHandle] = await window.showOpenFilePicker({
          types: [
            {
              description,
              accept: {
                "application/octet-stream": [
                  `.${extension}`
                ]
              }
            }
          ],
          multiple: false
        });
        handle = pickedHandle;
      } else {
        handle = await window.showSaveFilePicker({
          suggestedName: `file.${extension}`,
          types: [
            {
              description,
              accept: {
                "application/octet-stream": [
                  `.${extension}`
                ]
              }
            }
          ]
        });
      }
      this.worker?.postMessage({
        type: "fileDialogResult",
        filename: handle.name,
        handle
      });
    } catch (e) {
      if (e.name !== "AbortError") {
        console.error("[client] File dialog error:", e);
      }
      this.worker?.postMessage({
        type: "fileDialogResult",
        filename: null
      });
    }
  }
  resolveNextUpdate() {
    if (!this.updateResolve)
      return;
    const resolve = this.updateResolve;
    this.updateResolve = null;
    if (this.pendingUpdates.length > 0) {
      resolve({
        value: this.pendingUpdates.shift(),
        done: false
      });
    } else if (!this.running) {
      resolve({
        value: undefined,
        done: true
      });
    }
  }
}
function getInterpreterName(format) {
  const names = {
    glulx: "glulxe",
    zcode: "fizmo",
    hugo: "hugo",
    tads2: "tads2",
    tads3: "tads3",
    alan2: "alan2",
    alan3: "alan3",
    adrift: "scare",
    agt: "agility",
    advsys: "advsys",
    level9: "level9",
    magnetic: "magnetic",
    scott: "scott",
    taylor: "taylor",
    sagaplus: "plus"
  };
  return names[format] ?? "glulxe";
}
function hashBytes(data) {
  let hash = 0;
  for (let i = 0;i < Math.min(data.length, 1024); i++) {
    hash = (hash << 5) - hash + data[i] | 0;
  }
  return hash >>> 0;
}
function getFileTypeInfo(filetype) {
  switch (filetype) {
    case "save":
      return {
        extension: "glksave",
        description: "Saved Games"
      };
    case "transcript":
      return {
        extension: "txt",
        description: "Transcripts"
      };
    case "command":
      return {
        extension: "txt",
        description: "Command Scripts"
      };
    case "data":
    default:
      return {
        extension: "glkdata",
        description: "Data Files"
      };
  }
}
async function createClient(config) {
  return WasiGlkClient.create(config);
}
// src/player/InteractiveFiction.ts
class InteractiveFiction extends HTMLElement {
  client = null;
  windows = new Map;
  async run(client) {
    this.client = client;
    for await (const update of client.updates({ width: 80, height: 24 })) {
      this.handle(update);
    }
  }
  handle(update) {
    switch (update.type) {
      case "window":
        this.updateWindows(update.windows);
        break;
      case "content":
        this.updateContent(update.windowId, update.clear, update.content);
        break;
      case "input-request":
        this.updateInput(update);
        break;
      case "error":
        console.error("[IF] Error:", update.message);
        break;
    }
  }
  updateWindows(windows) {
    if (windows.length === 0) {
      this.windows.forEach((w) => w.remove());
      this.windows.clear();
      return;
    }
    for (const win of windows) {
      let el = this.windows.get(win.id);
      if (!el) {
        if (win.type === "grid") {
          el = document.createElement("grid-window");
        } else {
          el = document.createElement("buffer-window");
        }
        el.id = `window-${win.id}`;
        el.dataset.windowId = String(win.id);
        this.windows.set(win.id, el);
        if (win.type === "grid") {
          const firstBuffer = this.querySelector("buffer-window");
          if (firstBuffer) {
            this.insertBefore(el, firstBuffer);
          } else {
            this.appendChild(el);
          }
        } else {
          this.appendChild(el);
        }
      }
      if (win.type === "grid" && "setGridSize" in el) {
        el.setGridSize(win.gridheight ?? 0);
      }
    }
  }
  updateContent(windowId, clear, content) {
    const el = this.windows.get(windowId);
    if (!el)
      return;
    if ("updateContent" in el) {
      el.updateContent(content, clear);
    } else if ("updateGridContent" in el) {
      el.updateGridContent(content);
    }
  }
  updateInput(update) {
    this.querySelectorAll("user-input").forEach((el2) => el2.remove());
    const el = this.windows.get(update.windowId);
    if (!el)
      return;
    const input = document.createElement("user-input");
    input.configure(update, (value) => {
      this.client?.sendInput(value);
    });
    if ("detectScene" in el) {
      el.detectScene();
    }
    el.appendChild(input);
    input.focus();
  }
}

// src/system/Arrays.ts
class Arrays {
  static shuffle(array) {
    return array.map((value) => ({ value, order: Math.random() })).sort((a, b) => a.order - b.order).map(({ value }) => value);
  }
  static unique(array) {
    return Array.from(new Set(array));
  }
  static zip(...arrays) {
    if (arrays.length === 0)
      return [];
    const minLength = Math.min(...arrays.map((arr) => arr.length));
    const result = [];
    for (let i = 0;i < minLength; i++) {
      result.push(arrays.map((arr) => arr[i]));
    }
    return result;
  }
}

// src/player/PrefixTree.ts
function collapseSuggestions(suggestions) {
  const groups = new Map;
  const singles = [];
  for (const suggestion of suggestions) {
    const spaceIndex = suggestion.indexOf(" ");
    if (spaceIndex === -1) {
      singles.push(suggestion);
      continue;
    }
    const prefix = suggestion.substring(0, spaceIndex);
    const rest = suggestion.substring(spaceIndex + 1);
    const existing = groups.get(prefix);
    if (existing) {
      existing.push(rest);
    } else {
      groups.set(prefix, [rest]);
    }
  }
  const result = [];
  for (const [prefix, completions] of groups) {
    if (completions.length === 1) {
      result.push({ text: `${prefix} ${completions[0]}`, completions: [] });
    } else {
      result.push({ text: `${prefix}...`, completions });
    }
  }
  for (const single of singles) {
    if (!groups.has(single)) {
      result.push({ text: single, completions: [] });
    }
  }
  return result;
}

// src/player/SceneDetector.ts
class SceneDetector {
  models = ["llama+stable-diffusion"];
  detect(card) {
    const hasHeader = card.querySelector(".header, .subheader");
    const hasNormal = card.querySelector(".normal");
    const hasImage = card.querySelector(".image");
    const hasInput = card.querySelector("user-input");
    if (!hasHeader || !hasNormal || hasImage || hasInput)
      return;
    const path = window.location.pathname;
    const [, , id] = path.split("/");
    if (!id)
      return;
    const current = this.extractScene(card);
    const data = {
      story: {
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.getAttribute("content") ?? ""
      },
      scene: current
    };
    for (const model of this.models) {
      const image = `/content/${id}/art?prompt=${encodeURIComponent(JSON.stringify(data))}&model=${encodeURIComponent(model)}`;
      const img = document.createElement("img", { is: "x-image" });
      img.setAttribute("is", "x-image");
      img.setAttribute("reloadable", "");
      img.className = "image";
      img.loading = "lazy";
      img.src = image;
      img.alt = "";
      img.setAttribute("aria-hidden", "true");
      card.insertBefore(img, card.firstChild);
    }
    card.classList.add("scene");
    fetch(`/content/${id}/suggestions?prompt=${encodeURIComponent(JSON.stringify(current))}`).then((response) => {
      if (!response.ok)
        return;
      response.json().then((json) => {
        const unique = Arrays.unique([...json.commands, ...json.nouns, ...json.actions]);
        const collapsed = collapseSuggestions(unique);
        const suggestions = document.createElement("x-suggestions");
        for (const { text, completions } of collapsed) {
          const instruction = document.createElement("x-instruction");
          instruction.textContent = text;
          if (completions.length > 0) {
            instruction.dataset.completions = JSON.stringify(completions);
          }
          suggestions.appendChild(instruction);
        }
        card.appendChild(suggestions);
      });
    });
    const event = { title: current.title, description: current.description };
    navigator.sendBeacon("/events", JSON.stringify(event));
  }
  extractScene(card) {
    const titleEl = card.querySelector(".header, .subheader");
    const normalEls = Array.from(card.querySelectorAll(":scope > .normal"));
    return {
      title: titleEl?.innerText ?? "",
      description: normalEls.map((e) => e.innerText).join(" ")
    };
  }
}

// src/system/Strings.ts
var wordsPattern = /(\p{L}+\p{M}*|\p{N}+)/gu;
function words(value) {
  return value?.match(wordsPattern) || [];
}
function wordCount(value) {
  return words(value).length;
}
var capitalWords = /\b\p{Lu}+\b(?:\s+\b\p{Lu}+\b)*/gu;

// src/player/BufferWindow.ts
class BufferWindow extends HTMLElement {
  sceneDetector = new SceneDetector;
  updateContent(content, clear) {
    document.querySelector("main.story")?.remove();
    if (clear)
      this.replaceChildren();
    const lines = this.groupIntoLines(content);
    if (lines.length === 0)
      return;
    const cards = this.groupIntoCards(lines);
    const lastSection = this.querySelector("section.card:last-of-type");
    if (lastSection && cards.length > 0) {
      const firstNewCard = cards[0];
      const firstIsHeader = firstNewCard[0]?.[0]?.style === "header" || firstNewCard[0]?.[0]?.style === "subheader";
      const lastHasNormal = lastSection.querySelector(".normal") !== null;
      if (!firstIsHeader || !lastHasNormal) {
        for (const line of firstNewCard) {
          this.appendLine(lastSection, line);
        }
        lastSection.classList.add("scroll");
        cards.shift();
      }
    }
    for (const card of cards) {
      const section = document.createElement("section");
      section.classList.add("card", "scroll");
      for (const line of card) {
        this.appendLine(section, line);
      }
      this.appendChild(section);
    }
    this.scrollToLatest();
  }
  appendLine(section, line) {
    if (line.length === 1) {
      const span = line[0];
      const div = document.createElement("div");
      div.className = span.style ?? "normal";
      if (span.style === "normal" || !span.style) {
        div.append(...this.createInstructions(span.text ?? ""));
      } else {
        div.textContent = span.text ?? "";
      }
      section.appendChild(div);
    } else {
      const div = document.createElement("div");
      div.className = "normal";
      for (const span of line) {
        const el = document.createElement("span");
        el.className = span.style ?? "normal";
        if (span.style === "normal" || !span.style) {
          el.append(...this.createInstructions(span.text ?? ""));
        } else {
          el.textContent = span.text ?? "";
        }
        div.appendChild(el);
      }
      section.appendChild(div);
    }
  }
  groupIntoLines(content) {
    const lines = [];
    let current = [];
    for (const span of content) {
      if (span.type !== "text")
        continue;
      const text = span.text ?? "";
      if (!text.includes(`
`)) {
        if (text.trim() && text.trim() !== ">")
          current.push(span);
        continue;
      }
      const parts = text.split(`
`);
      for (let i = 0;i < parts.length; i++) {
        if (i > 0 && current.length > 0) {
          lines.push(current);
          current = [];
        }
        const part = parts[i];
        if (part.trim() && part.trim() !== ">") {
          current.push({ ...span, text: part });
        }
      }
    }
    if (current.length > 0)
      lines.push(current);
    return lines;
  }
  groupIntoCards(lines) {
    const cards = [];
    let current = [];
    for (const line of lines) {
      const isHeader = line[0]?.style === "header" || line[0]?.style === "subheader";
      if (isHeader && current.length > 0) {
        const prevHasNormal = current.some((l) => l.some((s) => s.style === "normal" || s.style === "input" || !s.style));
        if (prevHasNormal) {
          cards.push(current);
          current = [];
        }
      }
      current.push(line);
    }
    if (current.length > 0)
      cards.push(current);
    return cards;
  }
  createInstructions(text) {
    const result = [];
    let position = 0;
    let match;
    capitalWords.lastIndex = 0;
    while ((match = capitalWords.exec(text)) != null) {
      if (match.index > position) {
        result.push(text.substring(position, match.index));
      }
      const word = match[0];
      if (word.length >= 3 && wordCount(word) <= 4) {
        const el = document.createElement("x-instruction");
        el.textContent = word;
        result.push(el);
      } else {
        result.push(word);
      }
      position = capitalWords.lastIndex;
    }
    if (position < text.length) {
      result.push(text.substring(position));
    }
    return result;
  }
  detectScene() {
    const lastCard = this.querySelector("section.card:last-of-type");
    if (!lastCard)
      return;
    this.sceneDetector.detect(lastCard);
  }
  scrollToLatest() {
    const scrollElements = Array.from(this.querySelectorAll("section.card.scroll"));
    const scroll = scrollElements[0];
    if (scroll) {
      setTimeout(() => {
        scroll.scrollIntoView({ block: "start", behavior: "smooth" });
        scrollElements.forEach((e) => e.classList.remove("scroll"));
      }, 100);
    }
  }
}

// src/player/GridWindow.ts
class GridWindow extends HTMLElement {
  lineElements = [];
  setGridSize(height) {
    const section = this.querySelector("section") ?? (() => {
      const s = document.createElement("section");
      s.classList.add("card");
      this.appendChild(s);
      return s;
    })();
    this.lineElements = [];
    section.replaceChildren();
    for (let i = 0;i < height; i++) {
      const line = document.createElement("div");
      line.className = "line";
      line.id = `grid-line-${i}`;
      section.appendChild(line);
      this.lineElements.push(line);
    }
  }
  updateGridContent(content) {
    const elements = [];
    for (const span of content) {
      if (span.type === "text") {
        const el = document.createElement("span");
        el.className = span.style ?? "";
        el.textContent = span.text ?? "";
        elements.push(el);
      }
    }
    if (elements.length > 0 && this.lineElements[0]) {
      this.lineElements[0].replaceChildren(...elements);
    }
  }
}

// src/player/KeyMapping.ts
var AdjustKeys = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
  Enter: "return",
  F1: "func1",
  F2: "func2",
  F3: "func3",
  F4: "func4",
  F5: "func5",
  F6: "func6",
  F7: "func7",
  F8: "func8",
  F9: "func9",
  F10: "func10",
  F11: "func11",
  F12: "func12"
};

// src/player/UserInput.ts
class UserInput extends HTMLElement {
  inputEl = null;
  sendInput = null;
  completionsEl = null;
  configure(update, sendInput) {
    this.sendInput = sendInput;
    this.classList.add("card", "input-control");
    const form = document.createElement("form");
    form.className = "input";
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = update.maxLength ?? (update.inputType === "char" ? 1 : 256);
    input.value = update.initial ?? "";
    input.placeholder = update.inputType === "char" ? "press key" : "";
    form.appendChild(input);
    this.appendChild(form);
    this.inputEl = input;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.submit(input.value);
      input.value = "";
      this.clearCompletions();
    });
    input.addEventListener("input", (e) => {
      if (update.inputType !== "char")
        return;
      e.preventDefault();
      this.submit(input.value);
      input.value = "";
    });
    input.addEventListener("keydown", (e) => {
      if (update.inputType !== "char" || e.key === "Unidentified")
        return;
      e.preventDefault();
      this.submit(AdjustKeys[e.key] ?? e.key);
    });
  }
  submit(value) {
    this.sendInput?.(value);
  }
  appendText(text) {
    if (this.inputEl) {
      this.inputEl.value = `${this.inputEl.value} ${text}`.trim();
      this.inputEl.form?.dispatchEvent(new SubmitEvent("submit"));
    }
  }
  setPrefix(text, completions = []) {
    if (this.inputEl) {
      this.inputEl.value = `${text} `;
      this.inputEl.focus({ preventScroll: true });
    }
    if (completions.length > 0) {
      this.showCompletions(completions);
    } else {
      this.clearCompletions();
    }
  }
  showCompletions(completions) {
    this.clearCompletions();
    const container = document.createElement("div");
    container.className = "completions";
    for (const word of completions) {
      const el = document.createElement("x-instruction");
      el.textContent = word;
      container.appendChild(el);
    }
    this.insertBefore(container, this.firstChild);
    this.completionsEl = container;
  }
  clearCompletions() {
    this.completionsEl?.remove();
    this.completionsEl = null;
  }
  focus() {
    this.inputEl?.focus({ preventScroll: true });
  }
}

// src/player/BinPack.ts
function binPack(parent) {
  const children = Array.from(parent.children);
  children.sort((a, b) => b.offsetWidth - a.offsetWidth);
  children.forEach((child) => parent.appendChild(child));
  checkFits(parent.children[0]);
}
function sameLine(a, b) {
  return a.offsetTop === b.offsetTop;
}
function checkFits(current) {
  if (!current)
    return;
  const next = current.nextElementSibling;
  if (!next)
    return;
  if (!sameLine(current, next))
    findNextBestFit(current, next);
  return checkFits(next);
}
function findNextBestFit(current, doesNotFit) {
  const mightFit = doesNotFit.nextElementSibling;
  if (!mightFit)
    return;
  current.after(mightFit);
  if (sameLine(current, mightFit))
    return checkFits(mightFit);
  doesNotFit.after(mightFit);
  return findNextBestFit(current, mightFit);
}

// src/player/Suggestions.ts
class Suggestions extends HTMLElement {
  connectedCallback() {
    this.classList.add("suggestions");
    const hideOverflow = () => Array.from(this.children).forEach((child) => {
      const el = child;
      el.classList.toggle("hidden", el.offsetTop + el.offsetHeight > this.clientHeight);
    });
    new ResizeObserver(() => requestAnimationFrame(() => {
      binPack(this);
      hideOverflow();
    })).observe(this);
  }
}

// src/http/Uri.ts
class Uri {
  static RFC_3986 = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;
  scheme;
  authority;
  path;
  query;
  fragment;
  constructor(value) {
    const match = Uri.RFC_3986.exec(value);
    if (!match)
      throw new Error(`Invalid Uri: ${value}`);
    const [, , scheme, , authority, path, , query, , fragment] = match;
    this.scheme = scheme;
    this.authority = authority;
    this.path = path;
    this.query = query;
    this.fragment = fragment;
  }
  toString() {
    const result = [];
    if (typeof this.scheme != "undefined")
      result.push(this.scheme, ":");
    if (typeof this.authority != "undefined")
      result.push("//", this.authority);
    result.push(this.path);
    if (typeof this.query != "undefined")
      result.push("?", this.query);
    if (typeof this.fragment != "undefined")
      result.push("#", this.fragment);
    return result.join("");
  }
  toJSON() {
    return this.toString();
  }
}

// src/player/ImageElement.ts
class ImageElement extends HTMLImageElement {
  constructor() {
    super();
    this.addEventListener("load", () => this.updateState());
    this.addEventListener("error", () => this.updateState());
    this.addEventListener("click", (e) => {
      if ((document.body.classList.contains("ctrl") || document.body.classList.contains("meta")) && this.hasAttribute("reloadable")) {
        e.stopPropagation();
        this.reload();
      }
    });
  }
  connectedCallback() {
    this.updateState();
  }
  reload() {
    const url = new Uri(this.src);
    const params = new URLSearchParams(url.query);
    params.set("reload", String(Date.now()));
    url.query = params.toString();
    this.src = url.toString();
    this.updateState();
  }
  updateState() {
    if (this.complete) {
      this.setAttribute("state", this.naturalWidth === 0 ? "failed" : "loaded");
    } else {
      this.setAttribute("state", "loading");
    }
  }
  static observedAttributes = ["src"];
  attributeChangedCallback() {
    this.updateState();
  }
}

// src/player/Instruction.ts
var InstructionEventName = "instruction";

class Instruction extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("click", () => {
      const raw = this.textContent ?? "";
      const partial = raw.endsWith("...");
      const text = partial ? raw.slice(0, -3).trim() : raw;
      const completions = JSON.parse(this.dataset.completions ?? "[]");
      this.dispatchEvent(new CustomEvent(InstructionEventName, {
        bubbles: true,
        detail: { text, partial, completions }
      }));
    });
  }
}

// src/player/controlKeys.ts
function controlKeys(document2) {
  for (const event of ["keydown", "keyup"]) {
    document2.addEventListener(event, (e) => {
      document2.body.classList.toggle("ctrl", e.ctrlKey);
      document2.body.classList.toggle("alt", e.altKey);
      document2.body.classList.toggle("shift", e.shiftKey);
      document2.body.classList.toggle("meta", e.metaKey);
    });
  }
}

// src/player/main.ts
var story = document.querySelector("#story");
if (!story)
  throw new Error("Could not find story");
var storyUrl = story.href;
var storyResponse = await fetch(storyUrl);
if (!storyResponse.ok)
  throw new Error(`Failed to load story: ${storyResponse.status}`);
var storyData = new Uint8Array(await storyResponse.arrayBuffer());
var interpreter = interpreterFor(story.dataset.type) ?? detectFormat(storyUrl, storyData).interpreter;
console.log("[player] Interpreter:", interpreter, "type:", story.dataset.type);
customElements.define("x-image", ImageElement, { extends: "img" });
customElements.define("x-instruction", Instruction);
customElements.define("x-suggestions", Suggestions);
customElements.define("user-input", UserInput);
customElements.define("grid-window", GridWindow);
customElements.define("buffer-window", BufferWindow);
customElements.define("interactive-fiction", InteractiveFiction);
var ifEl = document.querySelector("interactive-fiction") ?? document.createElement("interactive-fiction");
if (!ifEl.parentElement)
  document.body.appendChild(ifEl);
document.addEventListener(InstructionEventName, (ev) => {
  const { text, partial, completions } = ev.detail;
  const input = document.querySelector("user-input");
  if (!input)
    return;
  if (partial) {
    input.setPrefix(text, completions);
  } else {
    input.appendText(text);
  }
});
controlKeys(document);
var client = await createClient({
  storyData,
  workerUrl: "/wasiglk/worker.js",
  interpreterUrl: `/wasiglk/${interpreter}.wasm`,
  filesystem: "auto"
});
ifEl.run(client);
function interpreterFor(type) {
  const map = {
    zcode: "fizmo",
    "blorb/zcode": "fizmo",
    glulx: "glulxe",
    "blorb/glulx": "glulxe",
    hugo: "hugo",
    adrift: "scare",
    alan2: "alan2",
    alan3: "alan3",
    agt: "agility",
    advsys: "advsys",
    tads2: "tads2",
    tads3: "tads3"
  };
  return type ? map[type] : undefined;
}
