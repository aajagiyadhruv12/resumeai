import turtle
import math
import random
import time

# ============================================================
# JARVIS-STYLE FUTURISTIC AI INTERFACE
# Python Turtle
# ============================================================

WIDTH = 1200
HEIGHT = 800

screen = turtle.Screen()
screen.setup(WIDTH, HEIGHT)
screen.title("JARVIS // AI COMMAND INTERFACE")
screen.bgcolor("#02060D")
screen.colormode(255)
screen.tracer(0)

# ============================================================
# TURTLES
# ============================================================

background = turtle.Turtle(visible=False)
hologram = turtle.Turtle(visible=False)
core = turtle.Turtle(visible=False)
particles = turtle.Turtle(visible=False)
interface = turtle.Turtle(visible=False)
cursor_fx = turtle.Turtle(visible=False)

for t in [
    background,
    hologram,
    core,
    particles,
    interface,
    cursor_fx
]:
    t.speed(0)
    t.penup()

# ============================================================
# COLORS
# ============================================================

CYAN = (0, 220, 255)
BRIGHT_CYAN = (120, 250, 255)
BLUE = (20, 100, 220)
DARK_BLUE = (5, 45, 75)
WHITE = (230, 250, 255)
GREEN = (0, 255, 170)
ORANGE = (255, 170, 50)

# ============================================================
# STATE
# ============================================================

mouse_x = 0
mouse_y = 0

ai_state = "ONLINE"

modes = [
    "ONLINE",
    "LISTENING",
    "PROCESSING",
    "ANALYZING",
    "STANDBY"
]

mode_index = 0

# ============================================================
# PARTICLES
# ============================================================

random.seed(25)

particles_data = []

for _ in range(260):

    particles_data.append({
        "x": random.uniform(-600, 600),
        "y": random.uniform(-400, 400),
        "speed": random.uniform(0.2, 1.2),
        "size": random.choice([1, 1, 1, 2]),
        "phase": random.uniform(0, math.pi * 2)
    })


# ============================================================
# MOUSE TRACKING
# ============================================================

def mouse_move(x, y):
    global mouse_x, mouse_y

    mouse_x = x
    mouse_y = y


screen.cv.bind(
    "<Motion>",
    lambda event: mouse_move(
        event.x - WIDTH / 2,
        HEIGHT / 2 - event.y
    )
)


# ============================================================
# TEXT FUNCTIONS
# ============================================================

def text(x, y, message, size=10, color=WHITE):

    interface.goto(x, y)
    interface.color(color)

    interface.write(
        message,
        align="center",
        font=("Consolas", size, "bold")
    )


def left_text(x, y, message, size=9, color=CYAN):

    interface.goto(x, y)
    interface.color(color)

    interface.write(
        message,
        align="left",
        font=("Consolas", size, "normal")
    )


# ============================================================
# BACKGROUND PARTICLES
# ============================================================

def draw_particles(t):

    particles.clear()

    for i, p in enumerate(particles_data):

        p["y"] += p["speed"]

        if p["y"] > 420:
            p["y"] = -420

        pulse = (
            math.sin(t * 2 + p["phase"]) + 1
        ) / 2

        brightness = int(
            60 + pulse * 140
        )

        particles.goto(
            p["x"],
            p["y"]
        )

        particles.dot(
            p["size"],
            (
                20,
                brightness,
                min(255, brightness + 40)
            )
        )


# ============================================================
# MOUSE CURSOR ENERGY
# ============================================================

def draw_cursor_effect(t):

    cursor_fx.clear()

    # Distance from center

    distance = math.sqrt(
        mouse_x ** 2 +
        mouse_y ** 2
    )

    # Cursor ring

    cursor_fx.goto(
        mouse_x,
        mouse_y - 12
    )

    cursor_fx.color(
        (0, 180, 230)
    )

    cursor_fx.pensize(1)

    cursor_fx.pendown()
    cursor_fx.circle(12)
    cursor_fx.penup()

    # Connecting energy line

    if distance < 450:

        cursor_fx.goto(0, 0)
        cursor_fx.pencolor(
            (0, 100, 150)
        )
        cursor_fx.pensize(1)

        cursor_fx.pendown()
        cursor_fx.goto(
            mouse_x,
            mouse_y
        )
        cursor_fx.penup()

        # Cursor node

        cursor_fx.goto(
            mouse_x,
            mouse_y
        )

        cursor_fx.dot(
            5,
            BRIGHT_CYAN
        )


# ============================================================
# HOLOGRAPHIC CIRCLE
# ============================================================

def draw_circle(
    turtle_obj,
    radius,
    color,
    width=1,
    rotation=0,
    segments=120
):

    turtle_obj.color(color)
    turtle_obj.pensize(width)

    points = []

    for i in range(segments + 1):

        angle = (
            i / segments * math.pi * 2
            + math.radians(rotation)
        )

        x = math.cos(angle) * radius
        y = math.sin(angle) * radius

        points.append((x, y))

    turtle_obj.goto(
        points[0][0],
        points[0][1]
    )

    turtle_obj.pendown()

    for x, y in points[1:]:

        turtle_obj.goto(x, y)

    turtle_obj.penup()


# ============================================================
# JARVIS HOLOGRAPHIC RINGS
# ============================================================

def draw_rings(t):

    hologram.clear()

    # Outer rings

    draw_circle(
        hologram,
        250,
        DARK_BLUE,
        1,
        t * 20
    )

    draw_circle(
        hologram,
        235,
        CYAN,
        2,
        -t * 35
    )

    draw_circle(
        hologram,
        205,
        BLUE,
        1,
        t * 45
    )

    draw_circle(
        hologram,
        175,
        CYAN,
        2,
        -t * 60
    )

    # Inner ring

    draw_circle(
        hologram,
        120,
        BRIGHT_CYAN,
        1,
        t * 80
    )

    # Hexagonal ring

    hologram.goto(120, 0)
    hologram.setheading(0)
    hologram.color(CYAN)
    hologram.pensize(2)

    hologram.pendown()

    for _ in range(6):

        hologram.forward(120)
        hologram.left(60)

    hologram.penup()


# ============================================================
# 3D AI CORE
# ============================================================

def draw_core(t):

    core.clear()

    # Core pulse

    pulse = (
        math.sin(t * 4) + 1
    ) / 2

    base_radius = 48 + pulse * 8

    # Glow layers

    for radius in range(
        int(base_radius + 35),
        10,
        -6
    ):

        strength = (
            1 -
            radius /
            (base_radius + 35)
        )

        color = (
            int(5 + strength * 20),
            int(40 + strength * 130),
            int(80 + strength * 175)
        )

        core.goto(0, -radius)

        core.dot(
            radius * 2,
            color
        )

    # Bright core

    core.goto(0, 0)

    core.dot(
        int(base_radius),
        (20, 150, 240)
    )

    core.dot(
        int(base_radius * 0.55),
        (80, 220, 255)
    )

    core.dot(
        int(base_radius * 0.20),
        WHITE
    )


# ============================================================
# NEURAL CONNECTIONS
# ============================================================

def draw_neural_network(t):

    core.color(
        (0, 120, 170)
    )

    core.pensize(1)

    nodes = []

    for i in range(16):

        angle = (
            i / 16 * math.pi * 2
            + t * 0.25
        )

        radius = (
            130 +
            math.sin(
                t * 2 + i
            ) * 12
        )

        x = math.cos(angle) * radius
        y = math.sin(angle) * radius

        nodes.append((x, y))

    # Lines

    for i in range(len(nodes)):

        x1, y1 = nodes[i]

        x2, y2 = nodes[
            (i + 1) % len(nodes)
        ]

        core.goto(x1, y1)

        core.pendown()

        core.goto(x2, y2)

        core.penup()

    # Core connections

    for x, y in nodes:

        core.goto(0, 0)

        core.pendown()

        core.goto(x, y)

        core.penup()

        core.goto(x, y)

        core.dot(
            5,
            GREEN
        )


# ============================================================
# ORBITING NODES
# ============================================================

def draw_orbit_nodes(t):

    particles.pencolor(CYAN)

    for i in range(8):

        angle = (
            t * (0.7 + i * 0.04)
            + i * math.pi / 4
        )

        radius = 260

        x = math.cos(angle) * radius
        y = math.sin(angle) * radius * 0.35

        particles.goto(x, y)

        particles.dot(
            7,
            CYAN
        )


# ============================================================
# RADAR
# ============================================================

def draw_radar(t):

    cursor_fx.goto(0, 0)

    angle = t * 2

    length = 270

    x = math.cos(angle) * length
    y = math.sin(angle) * length

    cursor_fx.color(
        (0, 255, 210)
    )

    cursor_fx.pensize(2)

    cursor_fx.pendown()

    cursor_fx.goto(x, y)

    cursor_fx.penup()


# ============================================================
# WAVEFORM
# ============================================================

def draw_waveform(t):

    interface.goto(-180, -230)

    interface.color(
        (0, 190, 230)
    )

    interface.pensize(2)

    interface.pendown()

    for i in range(181):

        x = -180 + i * 2

        y = -230 + math.sin(
            i * 0.12 + t * 5
        ) * (
            8 +
            math.sin(t * 2) * 3
        )

        interface.goto(x, y)

    interface.penup()


# ============================================================
# SYSTEM PANELS
# ============================================================

def draw_interface(t):

    interface.clear()

    # ------------------------------------------
    # Main title
    # ------------------------------------------

    text(
        0,
        350,
        "J A R V I S",
        30,
        WHITE
    )

    text(
        0,
        320,
        "JUST A RATHER VERY INTELLIGENT SYSTEM",
        9,
        CYAN
    )

    # ------------------------------------------
    # LEFT PANEL
    # ------------------------------------------

    left_text(
        -530,
        270,
        "SYSTEM DIAGNOSTICS",
        11,
        CYAN
    )

    left_text(
        -530,
        245,
        "● POWER CORE      100%",
        9,
        GREEN
    )

    left_text(
        -530,
        225,
        "● NEURAL LINK      99.9%",
        9,
        GREEN
    )

    left_text(
        -530,
        205,
        "● MEMORY           87.4%",
        9
    )

    left_text(
        -530,
        185,
        "● PROCESSING       42.8%",
        9
    )

    left_text(
        -530,
        165,
        "● SECURITY         ACTIVE",
        9,
        GREEN
    )

    # ------------------------------------------
    # RIGHT PANEL
    # ------------------------------------------

    left_text(
        310,
        270,
        "COGNITIVE SYSTEMS",
        11,
        CYAN
    )

    left_text(
        310,
        245,
        "VISION            ONLINE",
        9
    )

    left_text(
        310,
        225,
        "VOICE             ONLINE",
        9
    )

    left_text(
        310,
        205,
        "REASONING         ONLINE",
        9
    )

    left_text(
        310,
        185,
        "PREDICTION        ACTIVE",
        9
    )

    left_text(
        310,
        165,
        "LEARNING          ACTIVE",
        9,
        GREEN
    )

    # ------------------------------------------
    # AI STATUS
    # ------------------------------------------

    text(
        0,
        280,
        f"[ {ai_state} ]",
        13,
        GREEN
    )

    # ------------------------------------------
    # Waveform
    # ------------------------------------------

    draw_waveform(t)

    # ------------------------------------------
    # Bottom status
    # ------------------------------------------

    text(
        0,
        -285,
        "VOICE INTERFACE READY",
        10,
        CYAN
    )

    text(
        0,
        -310,
        "CLICK ANYWHERE TO ACTIVATE",
        8,
        (80, 130, 150)
    )

    # ------------------------------------------
    # Mouse coordinates
    # ------------------------------------------

    left_text(
        -530,
        -300,
        f"CURSOR X: {int(mouse_x):4}",
        8,
        DARK_BLUE
    )

    left_text(
        -530,
        -320,
        f"CURSOR Y: {int(mouse_y):4}",
        8,
        DARK_BLUE
    )


# ============================================================
# CLICK = ACTIVATE AI
# ============================================================

def activate_ai(x, y):

    global mode_index
    global ai_state

    mode_index += 1

    if mode_index >= len(modes):
        mode_index = 0

    ai_state = modes[mode_index]

    print(
        f"[JARVIS] Mode changed → {ai_state}"
    )


screen.onclick(activate_ai)


# ============================================================
# SPACE = NEXT MODE
# ============================================================

def change_mode():

    global mode_index
    global ai_state

    mode_index += 1

    if mode_index >= len(modes):
        mode_index = 0

    ai_state = modes[mode_index]


screen.onkey(change_mode, "space")
screen.listen()


# ============================================================
# FRAME
# ============================================================

def draw_frame():

    interface.color(
        (10, 80, 120)
    )

    interface.pensize(2)

    corners = [
        (-570, 370, 0, -90),
        (570, 370, 180, -90),
        (-570, -370, 0, 90),
        (570, -370, 180, 90)
    ]

    for x, y, heading1, heading2 in corners:

        interface.goto(x, y)

        interface.setheading(
            heading1
        )

        interface.pendown()
        interface.forward(80)
        interface.penup()

        interface.goto(x, y)

        interface.setheading(
            heading2
        )

        interface.pendown()
        interface.forward(80)
        interface.penup()


draw_frame()


# ============================================================
# MAIN LOOP
# ============================================================

start = time.time()

while True:

    t = time.time() - start

    draw_particles(t)

    draw_rings(t)

    draw_core(t)

    draw_neural_network(t)

    draw_orbit_nodes(t)

    draw_radar(t)

    draw_cursor_effect(t)

    draw_interface(t)

    screen.update()

    time.sleep(0.016)