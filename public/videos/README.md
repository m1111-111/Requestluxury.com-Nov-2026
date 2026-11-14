# Hero and explainer video

Place the rendered brand films here and redeploy:

| File                             | Used for                                              |
| -------------------------------- | ----------------------------------------------------- |
| `requestluxury-hero.mp4`         | Muted background loop in the home page hero (30 s)    |
| `requestluxury-explainer.mp4`    | "Watch how RequestLuxury works (60s)" modal            |

Both are optional. Until a file exists the hero shows its poster image and the modal
shows an animated storyboard. The files are detected when the site is built, so
commit them and redeploy for them to appear.

Generate both with `blender/generate_requestluxury_video.py`; see
`blender/VOICEOVER_AND_INSTRUCTIONS.md`. Keep each file under about 15 MB for a fast
first load (the script's default settings produce roughly 6–10 MB), or host them on
Cloudinary and set `NEXT_PUBLIC_HERO_VIDEO` / `NEXT_PUBLIC_EXPLAINER_VIDEO` instead.
