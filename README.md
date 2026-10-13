# AudioTrace — Digital Audio Forensics Mini Project

A small browser-based educational tool for examining audio files.

## Features
- Select an audio file from your computer
- Play the selected recording
- Display duration, file size, decoded sample rate, and channel count
- Draw a waveform preview
- Calculate a SHA-256 hash with the Web Crypto API
- Run basic signal checks (peak amplitude, RMS level, near-silence, possible clipping, abrupt level changes)
- Download a plain-text examination report

## Run the project
1. Download and extract the ZIP file.
2. Open the `audio_forensics_miniproject` folder.
3. Double-click `index.html` to open it in Chrome or Edge.
4. Click **Choose audio file** and select a WAV or MP3 file.
5. Review the analysis and click **Download report (.txt)**.

If the browser does not decode a particular format, try a WAV or MP3 file. No server or package installation is required.

## Project files
- `index.html` — page structure
- `style.css` — visual design and responsive layout
- `script.js` — upload, playback, waveform, hashing, checks, and report export

## Important limitations
This is an educational mini-project, not a certified forensic suite. Basic signal indicators are not proof of editing or tampering. A SHA-256 hash helps compare exact file contents, but cannot establish whether audio was altered before it was first hashed. The tool does not perform speaker identification, deepfake detection, or definitive authenticity verification.
