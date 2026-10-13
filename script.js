const fileInput = document.getElementById("audioFile");
const fileError = document.getElementById("fileError");
const results = document.getElementById("results");
const audioPlayer = document.getElementById("audioPlayer");
const waveformCanvas = document.getElementById("waveform");
const ctx = waveformCanvas.getContext("2d");

let currentFile = null;
let currentHash = "";
let currentObjectUrl = "";
let currentObservations = [];
let audioContext = null;

fileInput.addEventListener("change", async () => {
  fileError.textContent = "";
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;
  if (!file.type.startsWith("audio/") && !/\.(wav|mp3|flac|ogg|m4a|aac|webm)$/i.test(file.name)) {
    fileError.textContent = "Please choose a supported audio file.";
    fileInput.value = "";
    return;
  }
  if (file.size > 150 * 1024 * 1024) {
    fileError.textContent = "This mini-project limits files to 150 MB to avoid using too much browser memory.";
    fileInput.value = "";
    return;
  }

  currentFile = file;
  currentHash = "";
  currentObservations = [];
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = URL.createObjectURL(file);
  audioPlayer.src = currentObjectUrl;
  results.classList.remove("hidden");
  document.getElementById("fileNameHeading").textContent = file.name;
  document.getElementById("sizeValue").textContent = formatBytes(file.size);
  document.getElementById("detailName").textContent = file.name;
  document.getElementById("detailType").textContent = file.type || "Unknown / not provided";
  document.getElementById("detailModified").textContent = file.lastModified ? new Date(file.lastModified).toLocaleString() : "Not available";
  document.getElementById("detailAnalyzed").textContent = new Date().toLocaleString();
  document.getElementById("durationValue").textContent = "Loading…";
  document.getElementById("sampleRateValue").textContent = "Loading…";
  document.getElementById("channelsValue").textContent = "Loading…";
  document.getElementById("hashValue").textContent = "Calculating…";
  document.getElementById("observations").innerHTML = "";
  drawEmptyWaveform("Decoding audio…");
  results.scrollIntoView({ behavior: "smooth", block: "start" });

  try {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    currentHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
    document.getElementById("hashValue").textContent = currentHash;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error("Web Audio API is not available in this browser.");
    audioContext = new AudioContextClass();
    const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const duration = decoded.duration;
    document.getElementById("durationValue").textContent = formatDuration(duration);
    document.getElementById("sampleRateValue").textContent = `${decoded.sampleRate.toLocaleString()} Hz`;
    document.getElementById("channelsValue").textContent = decoded.numberOfChannels === 1 ? "Mono (1)" : decoded.numberOfChannels === 2 ? "Stereo (2)" : `${decoded.numberOfChannels} channels`;
    drawWaveform(decoded);
    currentObservations = analyzeSignal(decoded);
    renderObservations(currentObservations);
    if (audioContext && audioContext.state !== "closed") await audioContext.close();
  } catch (error) {
    document.getElementById("durationValue").textContent = "Unavailable";
    document.getElementById("sampleRateValue").textContent = "Unavailable";
    document.getElementById("channelsValue").textContent = "Unavailable";
    drawEmptyWaveform("Preview unavailable for this format");
    currentObservations = [
      { title: "File selected", text: "The file was selected and its hash was calculated, but this browser could not decode the audio for signal analysis.", warning: false },
      { title: "Try WAV or MP3", text: "Some browsers cannot decode every audio format. Convert a copy to WAV or MP3 and try again.", warning: true }
    ];
    renderObservations(currentObservations);
  }
});

document.getElementById("resetBtn").addEventListener("click", () => {
  fileInput.value = "";
  fileError.textContent = "";
  results.classList.add("hidden");
  audioPlayer.pause();
  audioPlayer.removeAttribute("src");
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = "";
  currentFile = null;
  currentHash = "";
  currentObservations = [];
  document.getElementById("overview").scrollIntoView({ behavior: "smooth" });
});

document.getElementById("copyHashBtn").addEventListener("click", async () => {
  if (!currentHash) return;
  const btn = document.getElementById("copyHashBtn");
  try {
    await navigator.clipboard.writeText(currentHash);
    btn.textContent = "Copied!";
    setTimeout(() => btn.textContent = "Copy hash", 1400);
  } catch {
    btn.textContent = "Select hash to copy";
  }
});

document.getElementById("downloadReportBtn").addEventListener("click", () => {
  if (!currentFile) return;
  const observations = currentObservations.map((item, i) => `${i + 1}. ${item.title}\n   ${item.text}`).join("\n\n");
  const report = [
    "AUDIOTRACE — DIGITAL AUDIO FORENSICS REPORT",
    "Educational mini-project report; not a certified forensic examination",
    "=".repeat(55),
    "",
    "FILE INFORMATION",
    `File name: ${currentFile.name}`,
    `File type: ${currentFile.type || "Unknown / not provided"}`,
    `File size: ${formatBytes(currentFile.size)}`,
    `Last modified: ${currentFile.lastModified ? new Date(currentFile.lastModified).toLocaleString() : "Not available"}`,
    `Analysis time: ${new Date().toLocaleString()}`,
    "",
    "AUDIO PROPERTIES",
    `Duration: ${document.getElementById("durationValue").textContent}`,
    `Sample rate: ${document.getElementById("sampleRateValue").textContent}`,
    `Channels: ${document.getElementById("channelsValue").textContent}`,
    "",
    "INTEGRITY",
    `SHA-256: ${currentHash || "Unavailable"}`,
    "",
    "BASIC OBSERVATIONS",
    observations || "No observations available.",
    "",
    "IMPORTANT LIMITATION",
    "Automated indicators are not proof of tampering or authenticity. The SHA-256 hash identifies the file's current contents; it cannot establish whether the audio was edited before this examination.",
    "This report is generated locally in the browser and is intended for educational demonstration.",
    ""
  ].join("\n");
  const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeFileName(currentFile.name)}_forensic_report.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const units = ["Bytes", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}
function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return "Unavailable";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 10);
  return `${mins}:${String(secs).padStart(2, "0")}.${millis}`;
}
function safeFileName(name) {
  return name.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9_-]+/gi, "_").slice(0, 60) || "audio";
}
function drawEmptyWaveform(message) {
  const rect = waveformCanvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  waveformCanvas.width = Math.max(300, Math.floor(rect.width * dpr));
  waveformCanvas.height = Math.floor(150 * dpr);
  ctx.fillStyle = "#0c1424";
  ctx.fillRect(0, 0, waveformCanvas.width, waveformCanvas.height);
  ctx.fillStyle = "#7f92b3";
  ctx.font = `${12 * dpr}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(message, waveformCanvas.width / 2, waveformCanvas.height / 2);
}
function drawWaveform(audioBuffer) {
  const rect = waveformCanvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(300, Math.floor(rect.width * dpr));
  const height = Math.floor(150 * dpr);
  waveformCanvas.width = width;
  waveformCanvas.height = height;
  ctx.fillStyle = "#0c1424";
  ctx.fillRect(0, 0, width, height);
  const middle = height / 2;
  ctx.strokeStyle = "#23344f";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, middle);
  ctx.lineTo(width, middle);
  ctx.stroke();

  const data = audioBuffer.getChannelData(0);
  const samplesPerPixel = Math.max(1, Math.floor(data.length / width));
  const amp = height * 0.42;
  ctx.strokeStyle = "#80aaff";
  ctx.lineWidth = Math.max(1, dpr);
  ctx.beginPath();
  for (let x = 0; x < width; x++) {
    const start = x * samplesPerPixel;
    let min = 1, max = -1;
    for (let j = start; j < Math.min(start + samplesPerPixel, data.length); j++) {
      if (data[j] < min) min = data[j];
      if (data[j] > max) max = data[j];
    }
    ctx.moveTo(x + 0.5, middle + min * amp);
    ctx.lineTo(x + 0.5, middle + max * amp);
  }
  ctx.stroke();
}
function analyzeSignal(buffer) {
  const data = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const windowSize = Math.max(1, Math.floor(sampleRate * 0.1));
  let peak = 0, sumSquares = 0, silentSamples = 0, clippedSamples = 0;
  for (let i = 0; i < data.length; i++) {
    const value = Math.abs(data[i]);
    if (value > peak) peak = value;
    sumSquares += data[i] * data[i];
    if (value < 0.002) silentSamples++;
    if (value >= 0.999) clippedSamples++;
  }
  const rms = Math.sqrt(sumSquares / Math.max(1, data.length));
  const silentPercent = silentSamples / Math.max(1, data.length) * 100;
  const clippedPercent = clippedSamples / Math.max(1, data.length) * 100;
  let abruptWindows = 0;
  let previousRms = null;
  for (let start = 0; start < data.length; start += windowSize) {
    const end = Math.min(start + windowSize, data.length);
    let localSum = 0;
    for (let i = start; i < end; i++) localSum += data[i] * data[i];
    const localRms = Math.sqrt(localSum / Math.max(1, end - start));
    if (previousRms !== null && Math.abs(localRms - previousRms) > 0.35) abruptWindows++;
    previousRms = localRms;
  }
  const observations = [
    { title: "Peak amplitude", text: `${(peak * 100).toFixed(1)}% of the normalized digital range.`, warning: peak > 0.98 },
    { title: "Average signal level (RMS)", text: `${(rms * 100).toFixed(2)}% of normalized full scale.`, warning: false },
    { title: "Very low-level samples", text: `${silentPercent.toFixed(1)}% of samples are near digital silence. This may be normal in pauses or quiet recordings.`, warning: silentPercent > 25 },
    { title: "Possible clipping", text: `${clippedPercent.toFixed(3)}% of samples are at or near the maximum digital level.`, warning: clippedPercent > 0.01 },
    { title: "Abrupt level changes", text: `${abruptWindows} adjacent 100 ms windows showed a large change in RMS level. Listen to these areas; natural speech can also cause such changes.`, warning: abruptWindows > 0 }
  ];
  return observations;
}
function renderObservations(items) {
  const container = document.getElementById("observations");
  container.innerHTML = "";
  items.forEach(item => {
    const card = document.createElement("div");
    card.className = `observation${item.warning ? " warning" : ""}`;
    const mark = document.createElement("div");
    mark.className = "obs-mark";
    mark.textContent = item.warning ? "!" : "✓";
    const body = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = item.title;
    const text = document.createElement("p");
    text.textContent = item.text;
    body.append(title, text);
    card.append(mark, body);
    container.appendChild(card);
  });
}
window.addEventListener("resize", () => {
  if (!results.classList.contains("hidden") && currentFile) {
    // Redraw is handled after re-decoding only; preserve the existing canvas on resize.
  }
});
drawEmptyWaveform("Upload a file to view its waveform");
