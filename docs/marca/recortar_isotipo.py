# Recorta el isotipo original de Turingtech (sin wordmark ni lema) de turingtech-docs/assets.
# Solo lee esos archivos. Uso: python3 docs/marca/recortar_isotipo.py
import os
from PIL import Image, ImageChops
AQUI=os.path.dirname(os.path.abspath(__file__))
FUENTE='/home/leonel/Documentos/Repositorios/turingtech-docs/assets'
# (archivo, fondo, y máxima del isotipo: la franja del wordmark queda debajo)
CASOS=[('logo.png',(255,255,255),560,'turing_apu_isotipo_claro.png'),
       ('logoazul.png',(15,23,42),200,'turing_apu_isotipo_oscuro.png')]
for src,bg,ymax,out in CASOS:
    im=Image.open(os.path.join(FUENTE,src)).convert('RGB')
    im=im.crop((0,0,im.width,ymax))
    caja=ImageChops.difference(im,Image.new('RGB',im.size,bg)).point(lambda v:255 if v>40 else 0).convert('L').getbbox()
    print(src,'caja',caja)
    pad=6
    c=(max(caja[0]-pad,0),max(caja[1]-pad,0),min(caja[2]+pad,im.width),min(caja[3]+pad,im.height))
    rec=im.crop(c)
    if bg==(255,255,255):  # fondo blanco -> transparente
        a=ImageChops.difference(rec,Image.new('RGB',rec.size,bg)).convert('L').point(lambda v:min(255,v*4))
        rec=rec.convert('RGBA'); rec.putalpha(a)
    for d in (AQUI,os.path.join(AQUI,'..','..','apps','web','src','assets')):
        rec.save(os.path.join(d,out))
    print(out,rec.size)
