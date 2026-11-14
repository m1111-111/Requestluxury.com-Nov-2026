# REQUESTLUXURY.COM — AUTOMATED BLENDER 4.x PYTHON VIDEO GENERATOR (`BLENDER_VIDEO_SPEC.md`)

> Source brief for the `blender/` folder. Saved verbatim (formatting restored) from the
> specification supplied by the owner in November 2026.

## OBJECTIVE FOR CLAUDE
Write a complete, standalone, error-free **Blender 4.x Python (`bpy`) script** (`blender/generate_requestluxury_video.py`) plus a synchronized **60-Second Voiceover & Subtitle File (`subtitles.srt`)** that procedurally builds, lights, animates, and renders a 1080p (1920x1080, 30fps, 900 frames / 30 seconds loopable hero + 60s explainer mode) luxury 3D motion-graphics video for `requestluxury.com`.

## STRICT `bpy` COMPATIBILITY RULES
- Must run cleanly in **Blender 4.0 / 4.1 / 4.2+** with zero external asset downloads required (generate all geometry, procedural PBR materials, lighting, text, and camera paths purely in Python).
- Use **EEVEE / EEVEE Next** (with bloom/glare compositing and soft area lights) so the user can render the entire video on a standard laptop in minutes rather than waiting days for Cycles.
- Handle Principled BSDF node input names safely across Blender 4.x (`Base Color`, `Metallic`, `Roughness`, `Coat Weight` / fallback check so no `KeyError` occurs).

## VISUAL & AESTHETIC DIRECTION ("OBSIDIAN & BRUSHED GOLD")
- **World Background:** Deep matte obsidian (`#08080A`) with subtle volumetric/gradient vignette.
- **Materials:**
  1. *Brushed Champagne Gold* (`#C5A467`, Metallic = 0.95, Roughness = 0.22)
  2. *Architectural Matte Alabaster* (`#FAF9F6`, Roughness = 0.4)
  3. *Smoked Dark Glass* (Transmission/Alpha architectural monolith panels)
- **Lighting:** Three-point cinematic rim lighting (warm gold key rim light, cool studio fill, soft top spotlight sweeping across 3D typography).

## SCENE-BY-SCENE PROCEDURAL CHOREOGRAPHY (900 FRAMES @ 30 FPS)
1. **Frames 1–180 (The Monolith & Brand Reveal):**
   - Camera glides smoothly along a Bezier curve (`Track To` constraint on center empty) past floating smoked-glass architectural monoliths.
   - Extruded, beveled 3D gold emblem **"R"** and title **"REQUEST LUXURY"** rise smoothly with eased keyframes; subtitle *"A World Beyond — Global Luxury Marketplace & Private Auctions"*.
2. **Frames 181–420 (Six Pillars Showcase):**
   - Six minimalist 3D geometric plinths arranged in a sleek arc illuminate sequentially with clean extruded 3D labels: **RESIDENCES • SUPERCARS • YACHTS • AVIATION • HOROLOGY • JEWELRY**.
3. **Frames 421–660 (How It Works — Verified & Private):**
   - Three sleek floating UI glass cards animate into view with gold accents:
     - Card 1: *"01. Curated Global Inventory & Private Deal Rooms"*
     - Card 2: *"02. Live Timed Auctions & Instant Multi-Currency Pricing"*
     - Card 3: *"03. Direct Specialist Concierge & Jet Charter"*
4. **Frames 661–900 (Closing Call-to-Action):**
   - Camera pulls back to a majestic wide shot framing **"REQUESTLUXURY.COM"** in brushed champagne gold with *"LONDON • GENEVA • DUBAI • MONACO • NEW YORK"*, looping seamlessly back to black for clean web embedding (`/public/videos/requestluxury-hero.mp4`).

## DELIVERABLES REQUIRED FROM CLAUDE
1. `blender/generate_requestluxury_video.py` — Complete Python script configuring scene cleanup, geometry, materials, lights, keyframes, render output settings (`FFMPEG`, `MPEG4`, `H264`), and safe camera motion.
2. `blender/VOICEOVER_AND_INSTRUCTIONS.md` — Step-by-step instructions to open Blender -> Scripting -> Run Script -> Render Animation (`Ctrl + F12`), plus the exact 60-second luxury British/International narrator script (ready for ElevenLabs or self-recording) and `.srt` captions.
