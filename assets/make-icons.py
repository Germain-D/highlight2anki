#!/usr/bin/env python3
"""Génère les icônes de l'extension (icons/icon-*.png) et la tuile promo du store.

    python3 assets/make-icons.py

Rien d'autre à installer que Pillow. Le rendu se fait en 8x puis est réduit,
ce qui donne des bords propres jusqu'à 16 px.
"""
from PIL import Image, ImageDraw, ImageFont

BLUE = (0, 113, 227)
BLUE_DARK = (0, 91, 184)
AMBER = (255, 200, 55)
WHITE = (255, 255, 255)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
S = 8  # supersampling


def render(size):
    n = size * S
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Fond : carré arrondi, dégradé vertical bleu.
    grad = Image.new("RGB", (1, n))
    for y in range(n):
        t = y / max(n - 1, 1)
        grad.putpixel((0, y), tuple(round(a + (b - a) * t) for a, b in zip(BLUE, BLUE_DARK)))
    grad = grad.resize((n, n))
    mask = Image.new("L", (n, n), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, n - 1, n - 1), radius=round(n * 0.22), fill=255)
    img.paste(grad, (0, 0), mask)

    # Bandeau surligneur.
    d.rounded_rectangle(
        (n * 0.13, n * 0.57, n * 0.87, n * 0.75),
        radius=round(n * 0.04),
        fill=AMBER,
    )

    # Lettre A, posée sur le surlignage.
    font = ImageFont.truetype(FONT, round(n * 0.66))
    box = d.textbbox((0, 0), "A", font=font)
    d.text(
        ((n - (box[2] - box[0])) / 2 - box[0], n * 0.70 - box[3]),
        "A",
        font=font,
        fill=WHITE,
    )
    return img.resize((size, size), Image.LANCZOS)


def promo_tile(path, w=440, h=280):
    img = Image.new("RGB", (w, h), (245, 246, 250))
    icon = render(160)
    img.paste(icon, (36, (h - 160) // 2), icon)
    d = ImageDraw.Draw(img)
    d.text((224, 96), "highlight2anki", font=ImageFont.truetype(FONT, 30), fill=(28, 28, 30))
    d.text((224, 140), "Un mot lu → une carte Anki", font=ImageFont.truetype(FONT, 17), fill=(110, 110, 115))
    img.save(path)


if __name__ == "__main__":
    for size in (16, 32, 48, 128):
        render(size).save(f"icons/icon-{size}.png")
    promo_tile("assets/promo-440x280.png")
    print("icônes + tuile promo générées")
