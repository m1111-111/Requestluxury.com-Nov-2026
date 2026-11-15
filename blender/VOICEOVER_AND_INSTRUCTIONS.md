# RequestLuxury brand film — instructions and voiceover

`generate_requestluxury_video.py` builds the whole film inside Blender from code: the
obsidian stage, the brushed-gold lettering, the lighting, the camera move and the render
settings. Nothing is downloaded and no 3D skills are needed.

It makes two versions of the same four-scene film:

| Version | Length | Save as | Used on the website for |
| ------- | ------ | ------- | ----------------------- |
| **HERO** | 30 seconds, 900 frames, loops seamlessly | `requestluxury-hero.mp4` | The silent background loop behind the home page headline |
| **EXPLAINER** | 60 seconds, 1,800 frames | `requestluxury-explainer.mp4` | The "Watch how RequestLuxury works (60s)" window, with the voiceover below |

Both are 1920 × 1080 at 30 frames per second, H.264 in an MP4 file.

| Scene | HERO frames | EXPLAINER time | What happens |
| ----- | ----------- | -------------- | ------------ |
| 1. The monolith reveal | 1–180 | 0:00–0:12 | Fade up from black. Smoked-glass monoliths, the gold **R**, the title **REQUEST LUXURY** and its subtitle rise into place |
| 2. The six pillars | 181–420 | 0:12–0:28 | The camera glides past six alabaster plinths that light up in turn: Residences, Supercars, Yachts, Aviation, Horology, Jewelry |
| 3. How it works | 421–660 | 0:28–0:44 | Three glass cards: curated inventory and deal rooms, live auctions and multi-currency pricing, concierge and jet charter |
| 4. Call to action | 661–900 | 0:44–1:00 | A wide shot of **REQUESTLUXURY.COM** above the five cities, then a fade to black |

---

## Part 1 — Make the 30-second hero film

1. Install **Blender 4.2 LTS or newer** from [blender.org/download](https://www.blender.org/download/)
   (free). Blender 4.0, 4.1 and 5.x also work.
2. Open Blender. Choose **File → Save As** and save the empty file anywhere, for
   example `requestluxury.blend` in a new folder. The video will be written beside it.
3. Click the **Scripting** tab at the top of the window.
4. In the text editor that appears, click **Open** and choose
   `generate_requestluxury_video.py`.
5. Click **Run Script** (the ▶ button, or `Alt + P`). After a few seconds the scene
   appears. Press `Numpad 0` to look through the camera and `Space` to play it.
6. Choose **Render → Render Animation** (`Ctrl + F12`).
7. When it finishes, the film is in a folder called **`renders`** next to your
   `.blend` file, named `requestluxury-hero.mp4` (Blender adds the frame range to the
   name, for example `requestluxury-hero0001-0900.mp4`; rename it).

How long the render takes depends on your graphics card. To see a quick result first,
change `RESOLUTION_PERCENT = 100` to `50` near the top of the script and run it again:
the test render is a quarter of the work.

> The first and last frames are black on purpose: the film fades in and out so the
> website can loop it without a visible cut. To preview a still, move the timeline to
> about frame 120 and press `F12`.

## Part 2 — Make the 60-second explainer

1. In the script, change the line `MODE = "HERO"` to `MODE = "EXPLAINER"`.
2. Click **Run Script** again (it clears the scene and rebuilds it at half speed).
3. **Render → Render Animation** (`Ctrl + F12`).
4. The result is `requestluxury-explainer…mp4` in the same `renders` folder.

## Part 3 — Put the films on the website

1. Rename the two files to exactly `requestluxury-hero.mp4` and
   `requestluxury-explainer.mp4`.
2. Copy them into the repository folder **`public/videos/`**.
3. Commit and push. Vercel redeploys, and the site starts using them: it checks for
   the two files each time it is built.

Until the files exist the home page shows its still poster image and the explainer
window shows an animated storyboard, so the site is complete without them.

English captions for the explainer are already in place
(`public/videos/requestluxury-explainer.vtt`, the same text as `subtitles.srt`) and
are offered by the player automatically.

---

## The 60-second voiceover

**Voice:** calm, low and unhurried; British or international English. Think of a
private-bank film rather than an advertisement: no emphasis on prices or urgency, a
slight smile on "Request Luxury", and a full breath between scenes.

**Pace:** about 83 words in 57 seconds. If a take runs long, slow the film rather than
rush the voice.

| Time | Scene | Narration |
| ---- | ----- | --------- |
| 0:01 | 1 | There is a world beyond the ordinary. |
| 0:05 | 1 | This is Request Luxury. |
| 0:07 | 1 | A global marketplace and private auction house. |
| 0:12 | 2 | Six collections. One address. |
| 0:14 | 2 | Waterfront residences. |
| 0:16 | 2 | Collector supercars. |
| 0:18 | 2 | Ocean-going yachts. |
| 0:20 | 2 | Private aviation. |
| 0:22 | 2 | Fine horology. |
| 0:24 | 2 | And exceptional jewelry. |
| 0:28 | 3 | Every listing is curated, with its own private deal room. |
| 0:33 | 3 | Bid in live, timed auctions, priced in your currency. |
| 0:37 | 3 | And a specialist concierge is one message away, from a private viewing to a jet charter. |
| 0:46 | 4 | Request Luxury dot com. |
| 0:49 | 4 | London. Geneva. Dubai. Monaco. New York. |
| 0:54 | 4 | A world beyond. |

The six category lines are two seconds apart so that each is spoken as its plinth
lights up.

### Script to paste into ElevenLabs (or to read aloud)

The ellipses and line breaks produce natural pauses.

```text
There is a world... beyond the ordinary.

This is Request Luxury. A global marketplace, and private auction house.

Six collections. One address.

Waterfront residences.
Collector supercars.
Ocean-going yachts.
Private aviation.
Fine horology.
And exceptional jewelry.

Every listing is curated, with its own private deal room.

Bid in live, timed auctions, priced in your currency.

And a specialist concierge is one message away... from a private viewing, to a jet charter.

Request Luxury, dot com.

London. Geneva. Dubai. Monaco. New York.

A world beyond.
```

In ElevenLabs choose a mature British or "transatlantic" narration voice, generate the
audio, and download it as `voiceover.mp3`. If the take is not close to 57 seconds,
regenerate with a slower or faster speed setting, or adjust the pauses.

### Captions

[`subtitles.srt`](subtitles.srt) holds the same words with timings matched to the
EXPLAINER film. Upload it with the video on YouTube, Vimeo, LinkedIn or Instagram, or
burn it into the picture (below).

### Join the voice to the film

**In Blender** (no other software needed):

1. Open a new Blender file and switch to the **Video Editing** workspace
   (**File → New → Video Editing**).
2. **Add → Movie** and choose `requestluxury-explainer.mp4`;
   **Add → Sound** and choose `voiceover.mp3`. Start both at frame 1.
3. In **Output** properties set the frame rate to 30, the end frame to 1800, the file
   format to **FFmpeg Video**, the container to **MPEG-4**, the video codec to
   **H.264** and the audio codec to **AAC**.
4. **Render → Render Animation**.

**With FFmpeg**, if you have it installed:

```bash
# add the voiceover
ffmpeg -i requestluxury-explainer.mp4 -i voiceover.mp3 -c:v copy -c:a aac -b:a 192k -shortest explainer-with-voice.mp4

# optional: also burn the captions into the picture
ffmpeg -i explainer-with-voice.mp4 -vf "subtitles=subtitles.srt" -c:a copy explainer-captioned.mp4
```

Save the finished file as `public/videos/requestluxury-explainer.mp4`.

---

## Changing the film

Everything you are likely to change is at the top of the script:

| Setting | What it does |
| ------- | ------------ |
| `MODE` | `"HERO"` (30 s loop) or `"EXPLAINER"` (60 s) |
| `RESOLUTION`, `RESOLUTION_PERCENT` | Picture size. `50` percent makes a fast half-size test |
| `RENDER_SAMPLES` | Quality per frame. `16` is faster, `64` is smoother |
| `OUTPUT_DIR` | Where the video is saved. `//renders/` means "next to the `.blend` file" |
| `AUTO_RENDER` | `True` starts rendering as soon as the scene is built |
| `OBSIDIAN`, `GOLD`, `ALABASTER` | The brand colours |

The words on screen are plain text inside the four `scene_…` functions, so a category
name, a city or the web address can be edited directly. After any change, press
**Run Script** again: the script always clears the scene and rebuilds it.

The gold lettering uses an elegant serif already on your computer (Georgia on Windows
and macOS, Liberation Serif or DejaVu Serif on Linux). To use your own, add the path of
a `.ttf` or `.otf` file to the start of the `SERIF_CANDIDATES` list.

## Rendering without opening Blender

```bash
blender -b -P generate_requestluxury_video.py -- --render                      # hero film
blender -b -P generate_requestluxury_video.py -- --mode EXPLAINER --render     # explainer
blender -b -P generate_requestluxury_video.py -- --still 120                   # one PNG preview
blender -b -P generate_requestluxury_video.py -- --frames 1 90 --render        # first three seconds
```

Other options: `--percent 50`, `--samples 16`, `--output /path/to/folder/`. Run this
way, with no saved `.blend`, the files are written to a `requestluxury-renders` folder
in your home folder unless you pass `--output`.

## If something goes wrong

| What you see | What to do |
| ------------ | ---------- |
| The render is completely black | You are looking at frame 1 or the last frame, which are black by design. Preview frame 120 |
| Rendering is very slow | Set `RESOLUTION_PERCENT = 50` and `RENDER_SAMPLES = 16` for tests. In **Edit → Preferences → System** make sure your graphics card is selected |
| The output is hundreds of PNG images instead of an MP4 | That copy of Blender was built without FFmpeg, so the script saved frames instead. Install Blender from blender.org, or join the frames with any video editor |
| The Blender console says "Bloom skipped" | A cosmetic glow could not be added in that Blender version. The film renders correctly without it |
| The lettering looks different from the stills | A different serif font was found on your computer. Set your own in `SERIF_CANDIDATES` |
| The video file is too large for the website | Aim for under about 15 MB. Change `"HIGH"` to `"MEDIUM"` on the `constant_rate_factor` line in the script, or host the files on Cloudinary and set `NEXT_PUBLIC_HERO_VIDEO` / `NEXT_PUBLIC_EXPLAINER_VIDEO` to their addresses |
