"""Prépare les fichiers générés avant la compilation (lancé par la compilation GitHub, ou à la main : python3 scripts/preparer.py).
- src/sim/sortieSimulee.ts : sortie simulée décompressée depuis src/sim/sortie.xz.b64
- assets/*.png : icônes de l'appli (besoin de Pillow : pip install pillow)"""
import base64, json, lzma, os, math
from PIL import Image, ImageDraw

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.dirname(ICI)
ENCRE, ACCENT = (20, 32, 46, 255), (232, 163, 23, 255)

def sortie():
    b64 = open(os.path.join(RACINE, "src/sim/sortie.xz.b64")).read()
    txt = lzma.decompress(base64.b64decode(b64)).decode("utf-8")
    with open(os.path.join(RACINE, "src/sim/sortieSimulee.ts"), "w", encoding="utf-8") as f:
        f.write("/** Sortie simulée (journal R0001.CSV de la carte SD, lignes drone retirées). Format : @ms,LIGNE. Fichier généré par scripts/preparer.py */\n")
        f.write("export const SORTIE_SIMULEE: string = " + json.dumps(txt) + ";\n")

def boussole(taille, echelle, fond, trait, fleche):
    """Cercle gradué et flèche vers le nord-est (le cap du nid), centré ; echelle = part de l'image occupée."""
    S = taille * 4  # dessin en grand puis réduction = bords lisses
    im = Image.new("RGBA", (S, S), fond)
    d = ImageDraw.Draw(im)
    c, r = S / 2, S * echelle / 2
    d.ellipse([c - r, c - r, c + r, c + r], outline=trait, width=int(S * 0.035))
    for k in range(4):
        a = math.radians(k * 90)
        x1, y1 = c + math.sin(a) * r * 0.78, c - math.cos(a) * r * 0.78
        x2, y2 = c + math.sin(a) * r, c - math.cos(a) * r
        d.line([x1, y1, x2, y2], fill=trait, width=int(S * 0.03))
    a = math.radians(40)
    pt = lambda rr, da: (c + math.sin(a + da) * rr, c - math.cos(a + da) * rr)
    pointe, g, dr, q = pt(r * 0.72, 0), pt(r * 0.3, -0.55), pt(r * 0.3, 0.55), pt(r * 0.45, math.pi)
    d.polygon([pointe, g, q, dr], fill=fleche)
    d.ellipse([c - S * 0.03, c - S * 0.03, c + S * 0.03, c + S * 0.03], fill=trait)
    return im.resize((taille, taille), Image.LANCZOS)

def icones():
    a = os.path.join(RACINE, "assets")
    os.makedirs(a, exist_ok=True)
    blanc, transp = (255, 255, 255, 255), (0, 0, 0, 0)
    boussole(1024, 0.78, ENCRE, blanc, ACCENT).save(os.path.join(a, "icon.png"))
    boussole(1024, 0.6, transp, blanc, ACCENT).save(os.path.join(a, "android-icon-foreground.png"))  # zone sûre des icônes adaptatives
    Image.new("RGBA", (1024, 1024), ENCRE).save(os.path.join(a, "android-icon-background.png"))
    boussole(1024, 0.6, transp, blanc, blanc).save(os.path.join(a, "android-icon-monochrome.png"))
    boussole(1024, 0.5, transp, ENCRE, ACCENT).save(os.path.join(a, "splash-icon.png"))
    boussole(48, 0.9, transp, ENCRE, ACCENT).save(os.path.join(a, "favicon.png"))

if __name__ == "__main__":
    sortie()
    icones()
    print("préparation faite")
