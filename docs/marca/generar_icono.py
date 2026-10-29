# Genera el ícono de Turing APU (lienzo 1024, medidas en px del lienzo).
# Uso: python3 docs/marca/generar_icono.py  (escribe los dos SVG junto a este archivo)
import os
AQUI=os.path.dirname(os.path.abspath(__file__))
S=1024; SW=44; h=SW/2
NAVY="#0F172A"; WHITE="#FFFFFF"; ORANGE="#EA580C"
# Hoja: 58 % del alto, proporción 0.795, centrada (bordes exteriores)
H=round(S*0.58); W=round(H*0.795)
L=(S-W)/2; T=(S-H)/2; R=L+W; B=T+H
l,t,r,b=L+h,T+h,R-h,B-h          # línea central del trazo
rad=44; fold=160; frad=30
doc=(f"M{l+rad},{t} H{r-fold} L{r},{t+fold} V{b-rad} A{rad},{rad} 0 0 1 {r-rad},{b} "
     f"H{l+rad} A{rad},{rad} 0 0 1 {l},{b-rad} V{t+rad} A{rad},{rad} 0 0 1 {l+rad},{t} Z")
fx=r-fold
foldp=f"M{fx},{t} V{t+fold-frad} A{frad},{frad} 0 0 0 {fx+frad},{t+fold} H{r}"
# Líneas: margen interior igual a ambos lados; total = la más larga
inL=L+SW; inR=R-SW; m=44
x0=inL+m+h; xmax=inR-m-h
tot=xmax-x0
y1,y2,y3=490,582,694
lines=[(y1,x0+tot*0.74,WHITE),(y2,x0+tot*0.50,WHITE),(y3,xmax,ORANGE)]
def glyph():
    s=f'<g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="{SW}">'
    s+=f'<path d="{doc}" stroke="{WHITE}"/><path d="{foldp}" stroke="{WHITE}"/>'
    for y,x1,c in lines: s+=f'<line x1="{x0}" y1="{y}" x2="{x1:.1f}" y2="{y}" stroke="{c}"/>'
    return s+'</g>'
def svg(rx=0):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}" width="{S}" height="{S}">'
            f'<title>Turing APU</title><rect width="{S}" height="{S}" rx="{rx}" fill="{NAVY}"/>{glyph()}</svg>\n')
if __name__=="__main__":
    open(os.path.join(AQUI,"turing_apu_icono.svg"),"w").write(svg())
    open(os.path.join(AQUI,"turing_apu_icono_redondeado.svg"),"w").write(svg(229))

# ---- Favicon simplificado (16/32 px): una línea blanca + el total, trazo grueso ----
# A 16 px el trazo de 44 px (0,7 px) funde las tres líneas; con ~70 px se leen la hoja y el total.
import math
from PIL import Image, ImageDraw
FSW=70
def _geom(sw):
    hh=sw/2
    return L+hh,T+hh,R-hh,B-hh,L+sw+44+hh,R-sw-44-hh   # l,t,r,b,x0,xmax
def _contorno(sw):
    l,t,r,b,_,_=_geom(sw)
    return (f"M{l+rad},{t} H{r-fold} L{r},{t+fold} V{b-rad} A{rad},{rad} 0 0 1 {r-rad},{b} "
            f"H{l+rad} A{rad},{rad} 0 0 1 {l},{b-rad} V{t+rad} A{rad},{rad} 0 0 1 {l+rad},{t} Z",
            f"M{r-fold},{t} V{t+fold-frad} A{frad},{frad} 0 0 0 {r-fold+frad},{t+fold} H{r}")
def _lineas_favicon():
    _,_,_,_,x0,xmax=_geom(FSW)
    return [(520,x0+(xmax-x0)*0.6,WHITE),(680,xmax,ORANGE)]
def favicon_svg(rx=229):
    d,fp=_contorno(FSW); x0=_geom(FSW)[4]
    ls=''.join(f'<line x1="{x0}" y1="{y}" x2="{x1:.1f}" y2="{y}" stroke="{c}"/>' for y,x1,c in _lineas_favicon())
    g=(f'<g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="{FSW}">'
       f'<path d="{d}" stroke="{WHITE}"/><path d="{fp}" stroke="{WHITE}"/>{ls}</g>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}" width="{S}" height="{S}">'
            f'<title>Turing APU</title><rect width="{S}" height="{S}" rx="{rx}" fill="{NAVY}"/>{g}</svg>\n')
def _arco(cx,cy,rr,a0,a1,n=12):
    return [(cx+rr*math.cos(math.radians(a0+(a1-a0)*i/n)),cy+rr*math.sin(math.radians(a0+(a1-a0)*i/n))) for i in range(n+1)]
def raster(tam,sw,lineas,rx,k=4):
    """Rasteriza con Pillow (no hay conversor de SVG en el equipo); supermuestreo k×."""
    l,t,r,b,x0,_=_geom(sw); z=tam*k/S
    im=Image.new('RGBA',(tam*k,tam*k),(0,0,0,0)); dr=ImageDraw.Draw(im)
    dr.rounded_rectangle((0,0,tam*k-1,tam*k-1),radius=rx*z,fill=NAVY)
    w=round(sw*z)
    def trazo(pts,c):
        q=[(x*z,y*z) for x,y in pts]
        dr.line(q,fill=c,width=w,joint='curve')
        for x,y in (q[0],q[-1]): dr.ellipse((x-w/2,y-w/2,x+w/2,y+w/2),fill=c)
    fx=r-fold
    pts=[(l+rad,t),(fx,t),(r,t+fold),(r,b-rad)]+_arco(r-rad,b-rad,rad,0,90)+[(l+rad,b)]+_arco(l+rad,b-rad,rad,90,180)+[(l,t+rad)]+_arco(l+rad,t+rad,rad,180,270)
    trazo(pts+[pts[0]],WHITE)
    trazo([(fx,t),(fx,t+fold-frad)]+_arco(fx+frad,t+fold-frad,frad,180,90)+[(r,t+fold)],WHITE)
    for y,x1,c in lineas: trazo([(x0,y),(x1,y)],c)
    return im.resize((tam,tam),Image.LANCZOS)
def favicon_png(tam): return raster(tam,FSW,_lineas_favicon(),229)
def completo_png(tam,rx=0): return raster(tam,SW,lines,rx)   # ícono de tres líneas
if __name__=='__main__':
    web=os.path.join(AQUI,'..','..','apps','web','public')
    os.makedirs(web,exist_ok=True)
    open(os.path.join(AQUI,'turing_apu_favicon.svg'),'w').write(favicon_svg())
    open(os.path.join(web,'favicon.svg'),'w').write(open(os.path.join(AQUI,'turing_apu_icono_redondeado.svg')).read())
    ims=[favicon_png(n) for n in (16,32,48)]
    ims[2].save(os.path.join(web,'favicon.ico'),format='ICO',sizes=[(16,16),(32,32),(48,48)],append_images=ims[:2])
    for n in (16,32): favicon_png(n).save(os.path.join(web,f'favicon-{n}.png'))
    completo_png(180).convert('RGB').save(os.path.join(web,'apple-touch-icon.png'))   # a sangre
    for n in (192,512): completo_png(n,rx=int(229*n/1024)).save(os.path.join(web,f'icono-{n}.png'))
