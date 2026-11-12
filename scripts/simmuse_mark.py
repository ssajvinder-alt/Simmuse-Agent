"""The Simmuse logo, drawn from primitives (no font): a gradient "thread" S with glowing nodes, an
orbit ring and a spark on a charcoal tile. Sizes of 48 px and below use the flat mark, which stays
crisp where the fine detail would blur.

`python scripts/simmuse_mark.py` writes the two committed masters that scripts/generate_icons.py
scales into every icon:

  assets/simmuse-mark.png        1024x1024, the full premium mark
  assets/simmuse-mark-flat.png    256x256, the simplified mark for tiny sizes

Pillow only. Deterministic: the same code always draws the same pixels.
"""
import math
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

BLACK = (10, 10, 11, 255)
ORANGE = (255, 122, 26, 255)
AMBER = (255, 176, 102, 255)


def tile(n, glow=True):
    t = Image.new("L", (n, n), 0)
    ImageDraw.Draw(t).rounded_rectangle((0, 0, n - 1, n - 1), radius=int(n * 0.22), fill=255)
    base = Image.new("RGBA", (n, n), BLACK)
    if glow:
        g = Image.new("RGBA", (n, n), (0, 0, 0, 0))
        ImageDraw.Draw(g).ellipse((n * 0.18, n * 0.42, n * 0.82, n * 1.05), fill=(255, 122, 26, 60))
        base = Image.alpha_composite(base, g.filter(ImageFilter.GaussianBlur(n * 0.10)))
    return t, base


def s_points(n, r_frac=0.185, steps=900):
    r = n * r_frac
    cx = n / 2
    top = (cx, n * 0.5 - r)
    bot = (cx, n * 0.5 + r)

    def sweep(c, a0, a1):
        return [
            (c[0] + r * math.cos(math.radians(a0 + (a1 - a0) * i / steps)),
             c[1] + r * math.sin(math.radians(a0 + (a1 - a0) * i / steps)))
            for i in range(steps + 1)
        ]

    return sweep(top, 335, 90) + sweep(bot, 270, 510)


def stroke_mask(n, pts, width):
    m = Image.new("L", (n, n), 0)
    d = ImageDraw.Draw(m)
    for x, y in pts:
        d.ellipse((x - width / 2, y - width / 2, x + width / 2, y + width / 2), fill=255)
    return m


def concept_nodes(size):
    """S as a thread with a glowing node at each end: reads as a connection / network."""
    ss = 4
    n = size * ss
    t, base = tile(n)
    pts = s_points(n)
    base.paste(Image.new("RGBA", (n, n), ORANGE), (0, 0), stroke_mask(n, pts, n * 0.105))
    d = ImageDraw.Draw(base)
    for x, y, rr, col in ((*pts[0], n * 0.075, AMBER), (*pts[-1], n * 0.075, AMBER)):
        d.ellipse((x - rr, y - rr, x + rr, y + rr), fill=col)
        d.ellipse((x - rr * 0.45, y - rr * 0.45, x + rr * 0.45, y + rr * 0.45), fill=BLACK)
    out = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    out.paste(base, (0, 0), t)
    return out.resize((size, size), Image.LANCZOS)


DEEP = (232, 93, 4)
ORANGE = (255, 122, 26)
AMBER = (255, 176, 102)
CREAM = (255, 226, 190)


def vgrad(n, top, bottom):
    g = Image.linear_gradient("L").resize((n, n))
    return ImageOps.colorize(g, top, bottom).convert("RGBA")


def diag_grad(n, c0, c1, c2):
    g = Image.linear_gradient("L").resize((n, n)).rotate(-35, resample=Image.BICUBIC, expand=False)
    return ImageOps.colorize(g, c0, c2, mid=c1).convert("RGBA")


def premium(size: int) -> Image.Image:
    if size <= 48:
        return concept_nodes(size)
    ss = 2
    n = size * ss
    tile_mask = Image.new("L", (n, n), 0)
    ImageDraw.Draw(tile_mask).rounded_rectangle((0, 0, n - 1, n - 1), radius=int(n * 0.22), fill=255)

    # 1. Tile: deep charcoal gradient with an ember glow low in the frame.
    img = vgrad(n, (26, 26, 30), (4, 4, 5))
    glow = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((n * 0.12, n * 0.38, n * 0.88, n * 1.10), fill=(255, 110, 20, 85))
    img = Image.alpha_composite(img, glow.filter(ImageFilter.GaussianBlur(n * 0.11)))

    # 2. Orbit ring: a thin tilted ellipse behind the S, brighter where it passes the upper right.
    ring = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring)
    rd.ellipse((n * 0.10, n * 0.30, n * 0.90, n * 0.70), outline=AMBER + (120,), width=max(2, int(n * 0.006)))
    ring = ring.rotate(-28, resample=Image.BICUBIC)
    img = Image.alpha_composite(img, ring.filter(ImageFilter.GaussianBlur(0.6 * ss)))

    # 3. The S thread: soft glow, gradient body, top-left highlight.
    pts = s_points(n)
    body = stroke_mask(n, pts, n * 0.105)
    halo = body.filter(ImageFilter.GaussianBlur(n * 0.035))
    halo_layer = Image.new("RGBA", (n, n), ORANGE + (0,))
    halo_layer.putalpha(halo.point(lambda v: int(v * 0.65)))
    img = Image.alpha_composite(img, halo_layer)

    fill = diag_grad(n, CREAM, ORANGE, DEEP)
    img.paste(fill, (0, 0), body)

    # Sheen: the upper-left rim of the thread catches the light.
    shift = int(n * 0.012)
    lit = ImageChops.subtract(body, ImageChops.offset(body, shift, shift)).filter(ImageFilter.GaussianBlur(n * 0.004))
    sheen = Image.new("RGBA", (n, n), (255, 245, 230, 0))
    sheen.putalpha(lit.point(lambda v: int(v * 0.55)))
    img = Image.alpha_composite(img, sheen)

    # 4. Nodes: gradient rings with a dark core and a pinpoint highlight.
    d = ImageDraw.Draw(img)
    for x, y in (pts[0], pts[-1]):
        rr = n * 0.078
        g = Image.new("RGBA", (n, n), (0, 0, 0, 0))
        gd = ImageDraw.Draw(g)
        gd.ellipse((x - rr * 1.7, y - rr * 1.7, x + rr * 1.7, y + rr * 1.7), fill=ORANGE + (90,))
        img = Image.alpha_composite(img, g.filter(ImageFilter.GaussianBlur(rr * 0.8)))
        node = diag_grad(n, CREAM, AMBER, ORANGE)
        m = Image.new("L", (n, n), 0)
        ImageDraw.Draw(m).ellipse((x - rr, y - rr, x + rr, y + rr), fill=255)
        img.paste(node, (0, 0), m)
        d = ImageDraw.Draw(img)
        d.ellipse((x - rr * 0.46, y - rr * 0.46, x + rr * 0.46, y + rr * 0.46), fill=(8, 8, 9, 255))
        d.ellipse((x - rr * 0.78, y - rr * 0.80, x - rr * 0.50, y - rr * 0.52), fill=(255, 255, 255, 200))

    # 5. A four-point spark near the upper right: the 'AI' note, small and restrained.
    sx, sy, sr = n * 0.80, n * 0.20, n * 0.052
    spark = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    sd = ImageDraw.Draw(spark)
    sd.polygon([(sx, sy - sr), (sx + sr * 0.22, sy - sr * 0.22), (sx + sr, sy), (sx + sr * 0.22, sy + sr * 0.22),
                (sx, sy + sr), (sx - sr * 0.22, sy + sr * 0.22), (sx - sr, sy), (sx - sr * 0.22, sy - sr * 0.22)],
               fill=CREAM + (235,))
    img = Image.alpha_composite(img, spark.filter(ImageFilter.GaussianBlur(0.5 * ss)))

    # 6. Fine gradient edge and a faint top gloss.
    edge_outer = tile_mask
    edge_inner = Image.new("L", (n, n), 0)
    inset = int(n * 0.012)
    ImageDraw.Draw(edge_inner).rounded_rectangle((inset, inset, n - 1 - inset, n - 1 - inset),
                                                 radius=int(n * 0.22) - inset, fill=255)
    edge = ImageChops.subtract(edge_outer, edge_inner)
    edge_col = vgrad(n, (255, 190, 120), (120, 50, 10))
    edge_col.putalpha(edge.point(lambda v: int(v * 0.55)))
    img = Image.alpha_composite(img, edge_col)
    gloss = Image.new("RGBA", (n, n), (255, 255, 255, 0))
    ImageDraw.Draw(gloss).ellipse((-n * 0.2, -n * 0.55, n * 1.2, n * 0.38), fill=(255, 255, 255, 14))
    img = Image.alpha_composite(img, gloss)

    out = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    out.paste(img, (0, 0), tile_mask)
    return out.resize((size, size), Image.LANCZOS)




def write_masters(root: Path) -> None:
    premium(1024).save(root / "assets" / "simmuse-mark.png", optimize=True)
    concept_nodes(256).save(root / "assets" / "simmuse-mark-flat.png", optimize=True)


if __name__ == "__main__":
    write_masters(Path(__file__).resolve().parent.parent)
    print("wrote assets/simmuse-mark.png and assets/simmuse-mark-flat.png")
