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
open(os.path.join(AQUI,'turing_apu_icono.svg'),'w').write(svg())                 # tiendas: a sangre
open(os.path.join(AQUI,'turing_apu_icono_redondeado.svg'),'w').write(svg(229))   # web: 22.37 %
