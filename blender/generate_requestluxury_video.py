"""
REQUESTLUXURY.COM - procedural brand film for Blender 4.x
================================================================================
Builds, lights, animates and prepares to render the RequestLuxury motion-graphics
film entirely from Python: no external models, textures or downloads.

HOW TO USE (inside Blender)
    1. Open Blender 4.0 or newer and save an empty file somewhere (File > Save As).
    2. Open the "Scripting" workspace, click "Open", choose this file.
    3. Press "Run Script" (the play button). The scene is built in a few seconds.
    4. Render > Render Animation (Ctrl + F12).
    5. The finished video is written to a "renders" folder next to your .blend.

HOW TO USE (command line, no interface)
    blender -b -P generate_requestluxury_video.py -- --render
    blender -b -P generate_requestluxury_video.py -- --mode EXPLAINER --render
    blender -b -P generate_requestluxury_video.py -- --still 120        (one PNG preview)

TWO MODES
    HERO        900 frames, 30 seconds, starts and ends on black so it loops
                seamlessly. Save as  public/videos/requestluxury-hero.mp4
    EXPLAINER   the same film at half speed: 1800 frames, 60 seconds, timed to the
                voiceover in VOICEOVER_AND_INSTRUCTIONS.md and subtitles.srt.
                Save as  public/videos/requestluxury-explainer.mp4

Tested with Blender 4.2 LTS. Written to run on 4.0, 4.1 and 4.2+ (EEVEE and
EEVEE Next): every version-specific setting is guarded, so an option that does not
exist in your version is skipped instead of raising an error.
"""

import math
import os
import sys

import bpy

# ------------------------------------------------------------------------------
# SETTINGS - change these, then press "Run Script" again
# ------------------------------------------------------------------------------
MODE = "HERO"                 # "HERO" (30 s loop) or "EXPLAINER" (60 s)
RESOLUTION = (1920, 1080)     # 1080p
RESOLUTION_PERCENT = 100      # 50 gives a fast half-size test render
FPS = 30
RENDER_SAMPLES = 32           # EEVEE samples per frame; 16 is faster, 64 is cleaner
OUTPUT_DIR = "//renders/"     # "//" means "next to the saved .blend file"
AUTO_RENDER = False           # True renders the animation as soon as the scene is built

# Brand palette (sRGB hex)
OBSIDIAN = "#08080A"
GOLD = "#C5A467"
ALABASTER = "#FAF9F6"

HERO_FRAMES = 900

# ------------------------------------------------------------------------------
# Command-line options (everything after "--")
# ------------------------------------------------------------------------------
STILL_FRAME = None
if "--" in sys.argv:
    _args = sys.argv[sys.argv.index("--") + 1:]
    for _i, _arg in enumerate(_args):
        _next = _args[_i + 1] if _i + 1 < len(_args) else ""
        if _arg == "--mode" and _next:
            MODE = _next.upper()
        elif _arg == "--render":
            AUTO_RENDER = True
        elif _arg == "--still" and _next:
            STILL_FRAME = int(_next)
        elif _arg == "--output" and _next:
            OUTPUT_DIR = _next
        elif _arg == "--percent" and _next:
            RESOLUTION_PERCENT = int(_next)
        elif _arg == "--samples" and _next:
            RENDER_SAMPLES = int(_next)

MODE = "EXPLAINER" if MODE == "EXPLAINER" else "HERO"
TIME_SCALE = 2 if MODE == "EXPLAINER" else 1
TOTAL_FRAMES = HERO_FRAMES * TIME_SCALE


def F(frame):
    """Converts a frame of the 900-frame choreography to the frame of the chosen mode."""
    return int(round(1 + (frame - 1) * TIME_SCALE))


# ------------------------------------------------------------------------------
# Small helpers
# ------------------------------------------------------------------------------
def srgb_to_linear(channel):
    return channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4


def color(hex_code, alpha=1.0):
    """'#C5A467' -> linear RGBA tuple, which is what Blender shader inputs expect."""
    hex_code = hex_code.lstrip("#")
    r, g, b = (int(hex_code[i:i + 2], 16) / 255.0 for i in (0, 2, 4))
    return (srgb_to_linear(r), srgb_to_linear(g), srgb_to_linear(b), alpha)


def set_input(node, names, value):
    """Sets the first input that exists. Principled BSDF sockets were renamed between
    Blender versions (for example 'Clearcoat' became 'Coat Weight'), so every lookup
    goes through here and a missing socket never raises KeyError."""
    for name in names:
        socket = node.inputs.get(name)
        if socket is not None:
            try:
                socket.default_value = value
            except (TypeError, ValueError):
                continue
            return socket
    return None


def try_set(target, attribute, value):
    """Sets a property only if this Blender version has it and accepts the value."""
    if target is None or not hasattr(target, attribute):
        return False
    try:
        setattr(target, attribute, value)
        return True
    except (TypeError, ValueError, AttributeError):
        return False


def clean_scene():
    """Removes everything so the script can be run again and again."""
    if bpy.context.object is not None and bpy.context.object.mode != "OBJECT":
        try:
            bpy.ops.object.mode_set(mode="OBJECT")
        except RuntimeError:
            pass
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for collection in (
        bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.lights,
        bpy.data.cameras, bpy.data.actions, bpy.data.worlds,
    ):
        for block in list(collection):
            if block.users == 0:
                collection.remove(block)


def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


def key(obj, path, frame, value=None, index=-1):
    """Sets a value and inserts a keyframe. New keys are Bezier, so motion eases in and out."""
    if value is not None:
        if index >= 0:
            getattr(obj, path)[index] = value
        else:
            setattr(obj, path, value)
    obj.keyframe_insert(data_path=path, frame=frame, index=index)


def presence(obj, start, end, rise=1.0, duration=40):
    """Brings an object on stage at `start` and takes it off at `end` (hero-timeline frames):
    it rises into place while scaling up, holds, then sinks and scales away."""
    x, y, z = obj.location
    hidden = (0.0001, 0.0001, 0.0001)
    key(obj, "scale", F(start), hidden)
    key(obj, "location", F(start), (x, y, z - rise))
    key(obj, "scale", F(start + duration), (1.0, 1.0, 1.0))
    key(obj, "location", F(start + duration), (x, y, z))
    key(obj, "scale", F(end - duration * 0.6), (1.0, 1.0, 1.0))
    key(obj, "location", F(end - duration * 0.6), (x, y, z))
    key(obj, "scale", F(end), hidden)
    key(obj, "location", F(end), (x, y, z - rise * 0.6))


# ------------------------------------------------------------------------------
# Materials
# ------------------------------------------------------------------------------
def principled(name):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    node = material.node_tree.nodes.get("Principled BSDF")
    if node is None:
        node = material.node_tree.nodes.new("ShaderNodeBsdfPrincipled")
        output = material.node_tree.nodes.get("Material Output") or material.node_tree.nodes.new("ShaderNodeOutputMaterial")
        material.node_tree.links.new(node.outputs["BSDF"], output.inputs["Surface"])
    return material, node


def make_transparent(material):
    """Alpha blending, across the EEVEE (4.0/4.1) and EEVEE Next (4.2+) material settings."""
    try_set(material, "blend_method", "BLEND")
    try_set(material, "shadow_method", "NONE")
    try_set(material, "surface_render_method", "BLENDED")
    try_set(material, "use_transparency_overlap", False)
    try_set(material, "show_transparent_back", False)


def material_gold():
    material, node = principled("RL Brushed Champagne Gold")
    set_input(node, ["Base Color"], color(GOLD))
    set_input(node, ["Metallic"], 0.95)
    set_input(node, ["Roughness"], 0.22)
    set_input(node, ["Coat Weight", "Clearcoat"], 0.15)
    set_input(node, ["Coat Roughness", "Clearcoat Roughness"], 0.1)
    set_input(node, ["Anisotropic"], 0.35)
    return material


def material_alabaster():
    material, node = principled("RL Architectural Matte Alabaster")
    set_input(node, ["Base Color"], color(ALABASTER))
    set_input(node, ["Metallic"], 0.0)
    set_input(node, ["Roughness"], 0.4)
    return material


def material_glass():
    material, node = principled("RL Smoked Dark Glass")
    set_input(node, ["Base Color"], (0.012, 0.013, 0.016, 1.0))
    set_input(node, ["Metallic"], 0.0)
    set_input(node, ["Roughness"], 0.06)
    set_input(node, ["IOR"], 1.45)
    set_input(node, ["Transmission Weight", "Transmission"], 0.35)
    set_input(node, ["Alpha"], 0.42)
    set_input(node, ["Coat Weight", "Clearcoat"], 0.6)
    make_transparent(material)
    return material


def material_floor():
    material, node = principled("RL Obsidian Floor")
    set_input(node, ["Base Color"], color("#050506"))
    set_input(node, ["Metallic"], 0.0)
    set_input(node, ["Roughness"], 0.16)
    set_input(node, ["Specular IOR Level", "Specular"], 0.6)
    return material


def material_glow(name, hex_code, strength):
    """A self-lit surface: small type stays readable and bright accents bloom."""
    material, node = principled(name)
    set_input(node, ["Base Color"], color(hex_code))
    set_input(node, ["Roughness"], 0.5)
    set_input(node, ["Emission Color", "Emission"], color(hex_code))
    set_input(node, ["Emission Strength"], strength)
    return material


def material_fade_card():
    material, node = principled("RL Fade To Black")
    set_input(node, ["Base Color"], (0.0, 0.0, 0.0, 1.0))
    set_input(node, ["Roughness"], 1.0)
    set_input(node, ["Specular IOR Level", "Specular"], 0.0)
    set_input(node, ["Alpha"], 1.0)
    make_transparent(material)
    return material, node


# ------------------------------------------------------------------------------
# Geometry
# ------------------------------------------------------------------------------
def make_box(name, size, location, material, bevel=0.0, rotation=(0.0, 0.0, 0.0)):
    """A box built from raw mesh data (no bpy.ops), optionally with a bevel modifier."""
    sx, sy, sz = (value / 2.0 for value in size)
    verts = [(-sx, -sy, -sz), (sx, -sy, -sz), (sx, sy, -sz), (-sx, sy, -sz),
             (-sx, -sy, sz), (sx, -sy, sz), (sx, sy, sz), (-sx, sy, sz)]
    faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = link(bpy.data.objects.new(name, mesh))
    obj.location = location
    obj.rotation_euler = rotation
    obj.data.materials.append(material)
    if bevel > 0.0:
        modifier = obj.modifiers.new("Bevel", "BEVEL")
        modifier.width = bevel
        modifier.segments = 3
        try_set(modifier, "limit_method", "ANGLE")
    return obj


SERIF_CANDIDATES = [
    "C:/Windows/Fonts/georgia.ttf", "C:/Windows/Fonts/times.ttf",
    "/System/Library/Fonts/Supplemental/Georgia.ttf", "/Library/Fonts/Georgia.ttf",
    "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
    "/usr/share/fonts/liberation-serif/LiberationSerif-Regular.ttf",
]


def load_serif():
    """Uses an elegant serif already on the computer, or Blender's built-in font."""
    for path in SERIF_CANDIDATES:
        if os.path.exists(path):
            try:
                return bpy.data.fonts.load(path, check_existing=True)
            except RuntimeError:
                continue
    return None


def make_text(name, body, size, material, location, extrude=0.04, bevel=0.006, font=None,
              rotation=(math.radians(90), 0.0, 0.0), spacing=1.0, align="CENTER"):
    """Extruded, bevelled 3D type standing upright and facing the camera."""
    curve = bpy.data.curves.new(name, "FONT")
    curve.body = body
    curve.size = size
    curve.extrude = extrude
    curve.bevel_depth = bevel
    curve.bevel_resolution = 2
    curve.align_x = align
    curve.align_y = "CENTER"
    curve.space_character = spacing
    try_set(curve, "resolution_u", 6)
    if font is not None:
        curve.font = font
    obj = link(bpy.data.objects.new(name, curve))
    obj.location = location
    obj.rotation_euler = rotation
    obj.data.materials.append(material)
    return obj


# ------------------------------------------------------------------------------
# World, camera, lights
# ------------------------------------------------------------------------------
def build_world():
    """Deep matte obsidian with a soft vignette: slightly lifted at the centre of frame."""
    world = bpy.data.worlds.new("RL Obsidian World")
    bpy.context.scene.world = world
    world.use_nodes = True
    nodes, links = world.node_tree.nodes, world.node_tree.links
    nodes.clear()
    coordinates = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    gradient = nodes.new("ShaderNodeTexGradient")
    ramp = nodes.new("ShaderNodeValToRGB")
    background = nodes.new("ShaderNodeBackground")
    output = nodes.new("ShaderNodeOutputWorld")

    gradient.gradient_type = "SPHERICAL"
    set_input(mapping, ["Location"], (-0.5, -0.5, 0.0))
    set_input(mapping, ["Scale"], (1.6, 1.6, 1.6))
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = color("#030304")
    ramp.color_ramp.elements[1].position = 1.0
    ramp.color_ramp.elements[1].color = color("#121216")
    set_input(background, ["Strength"], 1.0)

    links.new(coordinates.outputs["Window"], mapping.inputs["Vector"])
    links.new(mapping.outputs["Vector"], gradient.inputs["Vector"])
    links.new(gradient.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], background.inputs["Color"])
    links.new(background.outputs["Background"], output.inputs["Surface"])


def build_camera():
    """The camera rides a Bezier curve (Follow Path) and always looks at a focus empty (Track To)."""
    scene = bpy.context.scene

    focus = link(bpy.data.objects.new("RL Focus", None))
    focus.empty_display_size = 0.4
    for frame, target in ((1, (0.0, 0.0, 2.1)), (180, (0.0, 0.0, 2.0)), (300, (0.0, 0.0, 1.5)),
                          (420, (0.0, 0.0, 1.5)), (540, (0.0, 0.0, 1.9)), (660, (0.0, 0.0, 1.9)),
                          (780, (0.0, 0.0, 1.7)), (900, (0.0, 0.0, 1.7))):
        key(focus, "location", F(frame), target)

    path_data = bpy.data.curves.new("RL Camera Path", "CURVE")
    path_data.dimensions = "3D"
    path_data.resolution_u = 32
    try_set(path_data, "use_path", True)
    spline = path_data.splines.new("BEZIER")
    waypoints = [(-9.5, -15.0, 2.0), (-3.5, -12.0, 2.5), (4.5, -12.5, 3.1), (0.0, -10.5, 2.3), (0.0, -19.5, 4.4)]
    spline.bezier_points.add(len(waypoints) - 1)
    for point, position in zip(spline.bezier_points, waypoints):
        point.co = position
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    path = link(bpy.data.objects.new("RL Camera Path", path_data))

    camera_data = bpy.data.cameras.new("RL Camera")
    camera_data.lens = 38
    camera_data.clip_start = 0.05
    camera_data.clip_end = 300
    camera_data.sensor_width = 36
    camera = link(bpy.data.objects.new("RL Camera", camera_data))
    scene.camera = camera

    follow = camera.constraints.new("FOLLOW_PATH")
    follow.target = path
    follow.use_fixed_location = True
    follow.use_curve_follow = False
    # Position along the path at each scene boundary; Bezier keys keep the glide smooth.
    for frame, factor in ((1, 0.0), (180, 0.24), (420, 0.50), (660, 0.74), (900, 1.0)):
        follow.offset_factor = factor
        follow.keyframe_insert("offset_factor", frame=F(frame))

    track = camera.constraints.new("TRACK_TO")
    track.target = focus
    track.track_axis = "TRACK_NEGATIVE_Z"
    track.up_axis = "UP_Y"
    return camera, focus


def build_fade(camera):
    """A black card just in front of the lens. Its opacity opens the film from black and
    closes it to black, which is what makes the 30-second version loop without a visible cut."""
    material, node = material_fade_card()
    mesh = bpy.data.meshes.new("RL Fade Card")
    mesh.from_pydata([(-1, -1, 0), (1, -1, 0), (1, 1, 0), (-1, 1, 0)], [], [(0, 1, 2, 3)])
    card = link(bpy.data.objects.new("RL Fade Card", mesh))
    card.data.materials.append(material)
    card.parent = camera
    card.location = (0.0, 0.0, -0.2)
    try_set(card, "visible_shadow", False)
    alpha = node.inputs.get("Alpha")
    if alpha is not None:
        for frame, value in ((1, 1.0), (26, 0.0), (868, 0.0), (900, 1.0)):
            alpha.default_value = value
            alpha.keyframe_insert("default_value", frame=F(frame))


def aim(light, target):
    constraint = light.constraints.new("TRACK_TO")
    constraint.target = target
    constraint.track_axis = "TRACK_NEGATIVE_Z"
    constraint.up_axis = "UP_Y"


def build_lights(focus):
    """Three-point cinematic lighting: warm gold key rim, cool studio fill, sweeping top spot."""
    key_data = bpy.data.lights.new("RL Key Rim", "AREA")
    key_data.energy = 2600
    key_data.color = (1.0, 0.82, 0.58)
    key_data.shape = "RECTANGLE"
    key_data.size, key_data.size_y = 9.0, 4.0
    key_light = link(bpy.data.objects.new("RL Key Rim", key_data))
    key_light.location = (8.5, 7.0, 7.5)
    aim(key_light, focus)

    fill_data = bpy.data.lights.new("RL Cool Fill", "AREA")
    fill_data.energy = 900
    fill_data.color = (0.66, 0.78, 1.0)
    fill_data.shape = "RECTANGLE"
    fill_data.size, fill_data.size_y = 10.0, 6.0
    fill_light = link(bpy.data.objects.new("RL Cool Fill", fill_data))
    fill_light.location = (-9.0, -9.0, 5.0)
    aim(fill_light, focus)

    front_data = bpy.data.lights.new("RL Soft Front", "AREA")
    front_data.energy = 650
    front_data.color = (1.0, 0.95, 0.88)
    front_data.size = 8.0
    front_light = link(bpy.data.objects.new("RL Soft Front", front_data))
    front_light.location = (0.0, -11.0, 6.5)
    aim(front_light, focus)

    spot_data = bpy.data.lights.new("RL Top Sweep", "SPOT")
    spot_data.energy = 5200
    spot_data.color = (1.0, 0.9, 0.74)
    spot_data.spot_size = math.radians(48)
    spot_data.spot_blend = 0.85
    try_set(spot_data, "shadow_soft_size", 1.2)
    spot = link(bpy.data.objects.new("RL Top Sweep", spot_data))
    spot.rotation_euler = (0.0, 0.0, 0.0)
    # The soft top light sweeps across the typography once in every scene.
    for frame, x in ((1, -7.0), (180, 7.0), (181, -8.0), (420, 8.0), (421, -7.0), (660, 7.0), (661, -8.0), (900, 8.0)):
        key(spot, "location", F(frame), (x, -1.5, 9.5))


# ------------------------------------------------------------------------------
# The four scenes
# ------------------------------------------------------------------------------
def scene_monolith_reveal(materials, serif):
    """Frames 1-180: smoked-glass monoliths, the gold "R" emblem and the brand name."""
    placements = [(-7.6, 3.2, 5.4), (-5.0, 6.4, 7.2), (-2.6, 9.4, 9.0), (2.6, 9.4, 9.0),
                  (5.0, 6.4, 7.2), (7.6, 3.2, 5.4), (0.0, 12.5, 11.0)]
    for index, (x, y, height) in enumerate(placements):
        slab = make_box("RL Monolith %d" % (index + 1), (1.5, 0.28, height), (x, y, height / 2 + 0.35),
                        materials["glass"], bevel=0.02, rotation=(0.0, 0.0, math.radians(-x * 2.2)))
        edge = make_box("RL Monolith Edge %d" % (index + 1), (0.03, 0.3, height), (0.76, 0.0, 0.0), materials["gold"])
        edge.parent = slab
        # Slow float; the first and last keys match so the loop is seamless.
        base = slab.location.z
        for frame, lift in ((1, 0.0), (300, 0.22), (600, -0.12), (900, 0.0)):
            key(slab, "location", F(frame), base + lift * (1 if index % 2 else -1), index=2)
        key(slab, "scale", F(1), (1.0, 1.0, 1.0))
        key(slab, "scale", F(400), (1.0, 1.0, 1.0))
        key(slab, "scale", F(440), (1.0, 1.0, 0.0001))
        key(slab, "scale", F(660), (1.0, 1.0, 0.0001))
        key(slab, "scale", F(710), (1.0, 1.0, 1.0))

    emblem = make_text("RL Emblem R", "R", 2.6, materials["gold"], (0.0, 0.0, 3.5), extrude=0.22, bevel=0.03, font=serif)
    presence(emblem, 16, 184, rise=3.2, duration=54)

    title = make_text("RL Title", "REQUEST LUXURY", 0.95, materials["gold"], (0.0, -0.6, 1.55),
                      extrude=0.09, bevel=0.012, font=serif, spacing=1.32)
    presence(title, 44, 186, rise=1.6, duration=50)

    subtitle = make_text("RL Subtitle", "A World Beyond \u2014 Global Luxury Marketplace & Private Auctions", 0.27,
                         materials["label"], (0.0, -1.0, 0.72), extrude=0.004, bevel=0.0, spacing=1.12)
    presence(subtitle, 84, 188, rise=0.35, duration=36)


def scene_six_pillars(materials, serif):
    """Frames 181-420: six plinths in an arc light up one after another."""
    names = ["RESIDENCES", "SUPERCARS", "YACHTS", "AVIATION", "HOROLOGY", "JEWELRY"]
    radius, spread = 9.5, math.radians(104)
    for index, name in enumerate(names):
        angle = -spread / 2 + spread * index / (len(names) - 1)
        x = radius * math.sin(angle)
        y = radius * (1 - math.cos(angle)) * 0.9 + 1.2
        height = 1.5 + 0.45 * (1 - abs(index - 2.5) / 2.5)
        facing = (0.0, 0.0, -angle * 0.55)

        plinth = make_box("RL Plinth %s" % name.title(), (1.7, 1.7, height), (x, y, height / 2),
                          materials["alabaster"], bevel=0.035, rotation=facing)
        presence(plinth, 184 + index * 10, 424, rise=height + 0.3, duration=44)

        # A gold inlay on top of each plinth: its emission is keyed so the plinths illuminate in sequence.
        inlay_material, inlay_node = principled("RL Inlay %s" % name.title())
        set_input(inlay_node, ["Base Color"], color(GOLD))
        set_input(inlay_node, ["Metallic"], 0.9)
        set_input(inlay_node, ["Roughness"], 0.25)
        set_input(inlay_node, ["Emission Color", "Emission"], color("#FFD9A0"))
        strength = inlay_node.inputs.get("Emission Strength")
        lit = 214 + index * 30
        if strength is not None:
            for frame, value in ((lit - 14, 0.0), (lit, 9.0), (lit + 26, 3.2), (400, 3.2), (420, 0.0)):
                strength.default_value = value
                strength.keyframe_insert("default_value", frame=F(frame))
        inlay = make_box("RL Inlay %s" % name.title(), (1.34, 1.34, 0.05), (0.0, 0.0, height / 2 + 0.02), inlay_material, bevel=0.01)
        inlay.parent = plinth

        label = make_text("RL Label %s" % name.title(), name, 0.30, materials["gold"], (x, y - 0.95, height + 0.62),
                          extrude=0.035, bevel=0.005, font=serif, spacing=1.28,
                          rotation=(math.radians(90), 0.0, -angle * 0.55))
        presence(label, lit - 8, 426, rise=0.5, duration=30)


def scene_how_it_works(materials, serif):
    """Frames 421-660: three floating glass cards explain how RequestLuxury works."""
    cards = [
        ("01", "Curated Global Inventory", "& Private Deal Rooms"),
        ("02", "Live Timed Auctions & Instant", "Multi-Currency Pricing"),
        ("03", "Direct Specialist Concierge", "& Jet Charter"),
    ]
    for index, (number, line_one, line_two) in enumerate(cards):
        x = (index - 1) * 4.5
        y = 0.6 - abs(index - 1) * 0.9
        turn = -(index - 1) * math.radians(13)

        card = make_box("RL Card %s" % number, (3.9, 0.07, 2.6), (x, y, 1.95), materials["glass"], bevel=0.02, rotation=(0.0, 0.0, turn))
        presence(card, 428 + index * 28, 664, rise=2.4, duration=46)

        for edge_name, z in (("Top", 1.3), ("Base", -1.3)):
            accent = make_box("RL Card %s %s" % (number, edge_name), (3.9, 0.09, 0.035), (0.0, 0.0, z), materials["gold"])
            accent.parent = card

        numeral = make_text("RL Card %s Numeral" % number, number + ".", 0.62, materials["gold"], (-1.5, -0.07, 0.62),
                            extrude=0.05, bevel=0.008, font=serif, rotation=(math.radians(90), 0.0, 0.0), align="LEFT")
        numeral.parent = card
        for row, text in enumerate((line_one, line_two)):
            line = make_text("RL Card %s Line %d" % (number, row + 1), text, 0.235, materials["label"],
                             (-1.5, -0.07, -0.12 - row * 0.42), extrude=0.004, bevel=0.0,
                             rotation=(math.radians(90), 0.0, 0.0), spacing=1.06, align="LEFT")
            line.parent = card


def scene_call_to_action(materials, serif):
    """Frames 661-900: the wide closing shot, then a fade to black for the loop."""
    wordmark = make_text("RL Wordmark", "REQUESTLUXURY.COM", 1.25, materials["gold"], (0.0, 0.0, 2.25),
                         extrude=0.14, bevel=0.016, font=serif, spacing=1.22)
    presence(wordmark, 668, 905, rise=2.6, duration=58)

    rule = make_box("RL Gold Rule", (7.2, 0.03, 0.022), (0.0, -0.2, 1.22), materials["glow_gold"])
    presence(rule, 706, 905, rise=0.3, duration=36)

    cities = make_text("RL Cities", "LONDON  \u2022  GENEVA  \u2022  DUBAI  \u2022  MONACO  \u2022  NEW YORK", 0.32,
                       materials["label"], (0.0, -0.4, 0.74), extrude=0.004, bevel=0.0, spacing=1.3)
    presence(cities, 722, 905, rise=0.35, duration=40)


# ------------------------------------------------------------------------------
# Render setup
# ------------------------------------------------------------------------------
def setup_render():
    scene = bpy.context.scene
    render = scene.render

    # EEVEE Next (4.2+) is "BLENDER_EEVEE_NEXT"; classic EEVEE (4.0 / 4.1) is "BLENDER_EEVEE".
    for engine in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        if try_set(render, "engine", engine):
            break

    render.resolution_x, render.resolution_y = RESOLUTION
    render.resolution_percentage = RESOLUTION_PERCENT
    render.fps = FPS
    scene.frame_start = 1
    scene.frame_end = TOTAL_FRAMES
    render.film_transparent = False
    try_set(render, "use_motion_blur", False)

    eevee = getattr(scene, "eevee", None)
    try_set(eevee, "taa_render_samples", RENDER_SAMPLES)
    try_set(eevee, "taa_samples", 16)
    # Reflections on the obsidian floor.
    try_set(eevee, "use_ssr", True)                    # EEVEE 4.0 / 4.1
    try_set(eevee, "use_ssr_refraction", True)
    try_set(eevee, "ssr_quality", 0.5)
    try_set(eevee, "use_gtao", True)
    try_set(eevee, "use_soft_shadows", True)
    try_set(eevee, "use_raytracing", True)             # EEVEE Next 4.2+
    try_set(getattr(eevee, "ray_tracing_options", None), "resolution_scale", "2")
    # Bloom: a property of classic EEVEE; EEVEE Next gets a compositor Glare node below.
    has_bloom = try_set(eevee, "use_bloom", True)
    if has_bloom:
        try_set(eevee, "bloom_threshold", 0.9)
        try_set(eevee, "bloom_intensity", 0.07)
        try_set(eevee, "bloom_radius", 6.0)
    else:
        setup_glare(scene)

    view = scene.view_settings
    if not try_set(view, "view_transform", "AgX"):
        try_set(view, "view_transform", "Filmic")
    if not try_set(view, "look", "AgX - Medium High Contrast"):
        try_set(view, "look", "Medium High Contrast")
    try_set(view, "exposure", 0.0)

    name = "requestluxury-explainer" if MODE == "EXPLAINER" else "requestluxury-hero"
    directory = OUTPUT_DIR
    if directory.startswith("//") and not bpy.data.filepath:
        # An unsaved file has no folder of its own: write to the user's home folder instead.
        directory = os.path.join(os.path.expanduser("~"), "requestluxury-renders") + os.sep
    render.filepath = directory + name

    settings = render.image_settings
    try_set(settings, "media_type", "VIDEO")           # required first on Blender 5.x
    if try_set(settings, "file_format", "FFMPEG"):
        ffmpeg = render.ffmpeg
        try_set(ffmpeg, "format", "MPEG4")
        try_set(ffmpeg, "codec", "H264")
        try_set(ffmpeg, "constant_rate_factor", "HIGH")
        try_set(ffmpeg, "ffmpeg_preset", "GOOD")
        try_set(ffmpeg, "gopsize", FPS)
        try_set(ffmpeg, "audio_codec", "NONE")
    else:
        print("[RequestLuxury] This Blender build has no FFmpeg: frames will be saved as PNG images instead.")
        try_set(settings, "file_format", "PNG")
    return render.filepath


def setup_glare(scene):
    """Compositor bloom for EEVEE Next. Entirely optional: if the compositor API of this
    Blender version differs, the film simply renders without the glow."""
    try:
        scene.use_nodes = True
        tree = scene.node_tree
        if tree is None:
            return
        tree.nodes.clear()
        layers = tree.nodes.new("CompositorNodeRLayers")
        glare = tree.nodes.new("CompositorNodeGlare")
        composite = tree.nodes.new("CompositorNodeComposite")
        if not try_set(glare, "glare_type", "BLOOM"):
            try_set(glare, "glare_type", "FOG_GLOW")
        try_set(glare, "quality", "HIGH")
        try_set(glare, "threshold", 1.1)
        try_set(glare, "size", 7)
        try_set(glare, "mix", -0.35)
        set_input(glare, ["Threshold"], 1.1)           # Blender 4.4+ exposes these as sockets
        set_input(glare, ["Strength"], 0.55)
        set_input(glare, ["Size"], 0.55)
        tree.links.new(layers.outputs["Image"], glare.inputs["Image"])
        tree.links.new(glare.outputs["Image"], composite.inputs["Image"])
    except Exception as error:  # noqa: BLE001 - any compositor difference must never stop the build
        print("[RequestLuxury] Bloom skipped on this Blender version: %s" % error)


# ------------------------------------------------------------------------------
# Build
# ------------------------------------------------------------------------------
def build():
    try:
        bpy.context.preferences.edit.keyframe_new_interpolation_type = "BEZIER"
    except (AttributeError, TypeError):
        pass

    clean_scene()
    scene = bpy.context.scene
    scene.frame_set(1)

    materials = {
        "gold": material_gold(),
        "alabaster": material_alabaster(),
        "glass": material_glass(),
        "floor": material_floor(),
        "label": material_glow("RL Alabaster Type", ALABASTER, 1.6),
        "glow_gold": material_glow("RL Gold Glow", GOLD, 4.0),
    }
    serif = load_serif()

    build_world()
    make_box("RL Floor", (140.0, 140.0, 0.2), (0.0, 0.0, -0.1), materials["floor"])
    camera, focus = build_camera()
    build_fade(camera)
    build_lights(focus)

    scene_monolith_reveal(materials, serif)
    scene_six_pillars(materials, serif)
    scene_how_it_works(materials, serif)
    scene_call_to_action(materials, serif)

    output = setup_render()
    scene.frame_set(F(120))

    print("")
    print("[RequestLuxury] Scene built: %s mode, %d frames at %d fps (%d seconds)." % (MODE, TOTAL_FRAMES, FPS, TOTAL_FRAMES // FPS))
    print("[RequestLuxury] Engine: %s. Output: %s" % (scene.render.engine, output))
    print("[RequestLuxury] Next: Render > Render Animation (Ctrl + F12).")
    return scene


if __name__ == "__main__":
    built_scene = build()
    if STILL_FRAME is not None:
        built_scene.frame_set(STILL_FRAME)
        still_path = built_scene.render.filepath + "-frame-%04d.png" % STILL_FRAME
        try_set(built_scene.render.image_settings, "media_type", "IMAGE")
        built_scene.render.image_settings.file_format = "PNG"
        built_scene.render.filepath = still_path
        bpy.ops.render.render(write_still=True)
        print("[RequestLuxury] Still saved: %s" % still_path)
    elif AUTO_RENDER:
        bpy.ops.render.render(animation=True)
        print("[RequestLuxury] Animation rendered.")
