"""Build the two-column preprint and accessible text from one manuscript + ledger.
Use the bundled PDF runtime; scratch is on the external data volume.
"""
import json, re, html, subprocess
from pathlib import Path
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, FrameBreak, Table, TableStyle, Flowable
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'public/papers'; OUT.mkdir(exist_ok=True)
SCRATCH=Path('/Volumes/Data/agent-scratch/vision-teach/pdf'); SCRATCH.mkdir(parents=True,exist_ok=True)
M=json.loads((ROOT/'docs/research/mother77.json').read_text())
D=json.loads((OUT/'mother77-data.json').read_text())
for weight, name in [('400','Plex'),('600','Plex-Semibold'),('700','Plex-Bold')]:
    p=SCRATCH/f'{name}.ttf'
    subprocess.run(['python3','-c',"from fontTools.ttLib import TTFont; import sys; f=TTFont(sys.argv[1]); f.flavor=None; f.save(sys.argv[2])",str(ROOT/f'public/fonts/ibm-plex-sans-latin-{weight}-normal.woff2'),str(p)],check=True)
    pdfmetrics.registerFont(TTFont(name,str(p)))
pdfmetrics.registerFontFamily('Plex',normal='Plex',bold='Plex-Bold',italic='Plex',boldItalic='Plex-Bold')
INK=colors.HexColor('#051230'); PAPER=colors.HexColor('#ebd3a2'); QUIET=colors.HexColor('#b6bfc1'); SIGNAL=colors.HexColor('#eb5324')
W,H=595.276,841.89; MARGIN=38; GAP=20; COL=(W-2*MARGIN-GAP)/2
styles={
 'body':ParagraphStyle('body',fontName='Plex',fontSize=9.5,leading=12.6,spaceAfter=7,textColor=INK,alignment=TA_LEFT,allowWidows=0,allowOrphans=0),
 'heading':ParagraphStyle('heading',fontName='Plex-Bold',fontSize=11.8,leading=14.2,spaceBefore=9,spaceAfter=6,textColor=INK,keepWithNext=True),
 'table':ParagraphStyle('table',fontName='Plex',fontSize=8.1,leading=10.2,textColor=INK),
 'caption':ParagraphStyle('caption',fontName='Plex',fontSize=8.2,leading=10.8,spaceBefore=4,spaceAfter=9,textColor=INK),
 'ref':ParagraphStyle('ref',fontName='Plex',fontSize=8.4,leading=10.7,spaceAfter=6,textColor=INK),
 'title':ParagraphStyle('title',fontName='Plex-Bold',fontSize=20,leading=23,spaceAfter=5,textColor=INK),
 'sub':ParagraphStyle('sub',fontName='Plex',fontSize=10,leading=13,spaceAfter=5,textColor=INK),
}
def esc(s): return html.escape(s).replace('—','-').replace('–','-').replace('‑','-').replace('→','to')
def P(s,style='body'): return Paragraph(esc(s),styles[style])
def table(rows,widths):
    data=[[P(str(x),'table') for x in r] for r in rows]
    t=Table(data,colWidths=widths,repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),QUIET),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),4),('RIGHTPADDING',(0,0),(-1,-1),4),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),('LINEBELOW',(0,0),(-1,0),0.6,INK),('LINEBELOW',(0,1),(-1,-1),0.2,QUIET)]))
    return t
corpus=[['Record / date','Documented problem → response']]+[[r['id']+' / '+r['date'][5:],r['problem']+' → '+r['response']] for r in D['records']]
geometry=[['Phone measure','Before','After','Gain (px)']]+[[r['item'].replace(': ',':\n'),str(r['before']),str(r['after']),str(r['recoveredPx'])] for r in D['geometry']]
home=[['Home goal','Five fields to agree with the learner']]+[
 ['Possible fall','Event: unexpected low posture + inactivity. View: agreed, unobstructed room. Response: chosen check-in/helper alert. Error cost: missed help versus nuisance alarms. Data: agree processing, access and retention; avoid default recording.'],
 ['Perimeter alert','Event: person in a chosen zone/time. View: agreed boundary, avoiding neighbors. Response: notify the chosen resident. Error cost: missed entry versus nuisance alerts. Data: minimize bystander capture; agree access and retention, with no identity claim.'],
 ['Plant growth','Event: change relative to a scale. View: stable camera, lighting and dated observations. Response: show a comparison for the owner to inspect. Error cost: false growth from viewpoint/light. Data: agreed plant images, cropped to avoid household activity.']]

TABLES={
 'corpus':(corpus,[59,COL-59],'Table 1. Complete selected corpus (R1-R8). Dates are 2026. Source paths, anchors and checksums are in the data ledger [9].'),
 'geometry':(geometry,[COL-118,38,35,45],'Table 2. Historical English 390 × 844 measurements in pixels. Reductions: 69.7%, 45.5%, 64.3%, 36.2%, respectively. Coordinates are not task-completion times.'),
 'home':(home,[67,COL-67],'Table 3. Proposed five-field examples to agree with the learner. These are neither deployed systems nor validated safety or privacy guarantees.')}
class Cycle(Flowable):
    def __init__(self): super().__init__(); self.width=COL; self.height=94
    def draw(self):
        c=self.canv; bw=(COL-28)/3
        labels=[('YOU','press Save'),('PICTURE','one frame'),('MACHINE','a guess')]
        for i,(top,bottom) in enumerate(labels):
            x=i*(bw+14); c.setFillColor(QUIET if i<2 else INK); c.rect(x,29,bw,47,fill=1,stroke=0)
            c.setFillColor(INK if i<2 else PAPER); c.setFont('Plex-Bold',8.5); c.drawCentredString(x+bw/2,59,top)
            c.setFont('Plex',8); c.drawCentredString(x+bw/2,42,bottom)
            if i<2:
                c.setStrokeColor(INK); c.setLineWidth(.8); c.line(x+bw+3,52,x+bw+11,52); c.line(x+bw+8,55,x+bw+11,52);c.line(x+bw+8,49,x+bw+11,52)
        c.setFillColor(INK); c.setFont('Plex',8.5); c.drawString(0,11,'Then YOU check the answer and its limits.')
def page(c,doc):
    c.saveState();c.setFillColor(PAPER);c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFillColor(INK);c.setFont('Plex',7.6)
    if doc.page>1:c.drawString(MARGIN,H-24,'VISION / Computer-vision literacy / Preprint v1.0')
    c.setStrokeColor(INK);c.setLineWidth(.4);c.line(MARGIN,30,W-MARGIN,30)
    c.drawString(MARGIN,18,'Author-review draft · Not peer reviewed · 6 November 2026')
    c.drawRightString(W-MARGIN,18,str(doc.page));c.restoreState()
doc=BaseDocTemplate(str(OUT/'mother77.pdf'),pagesize=(W,H),leftMargin=MARGIN,rightMargin=MARGIN,title=M['title'],author=M['author'],subject=M['subtitle'],pageCompression=1,allowSplitting=1)
frame=lambda x,y,w,h,id:Frame(x,y,w,h,id=id,leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)
first=[frame(MARGIN,H-127,W-2*MARGIN,89,'title'),frame(MARGIN,44,COL,H-181,'left'),frame(MARGIN+COL+GAP,44,COL,H-181,'right')]
body=[frame(MARGIN,44,COL,H-88,'left'),frame(MARGIN+COL+GAP,44,COL,H-88,'right')]
doc.addPageTemplates([PageTemplate(id='first',frames=first,onPage=page,autoNextPageTemplate='body'),PageTemplate(id='body',frames=body,onPage=page)])
story=[P(M['title'],'title'),P(M['subtitle'],'sub'),P(M['author']+' | '+M['status'],'caption'),FrameBreak(),P('Abstract','heading'),P(M['abstract'])]
for sec in M['sections']:
    story.append(P(sec['title'],'heading'))
    for p in sec['paragraphs']:story.append(P(p))
    if 'figure' in sec:
        story += [Cycle(),P('Figure 1. The instructional unit links a human action to captured evidence and a machine response. Seeing alone is not saving; an answer still needs checking.','caption')]
    if 'table' in sec:
        rows,widths,caption=TABLES[sec['table']]; story += [table(rows,widths),P(caption,'caption')]
story.append(P('References','heading'))
for r in M['references']:
    story.append(Paragraph(esc('['+str(r['id'])+'] '+r['text'])+' <link href="'+html.escape(r['url'])+'" color="#051230"><u>'+esc(r['url'])+'</u></link>',styles['ref']))
doc.build(story)
# Readable source and native HTML alternative are generated from the same text.
md=['# '+M['title'],M['subtitle'],M['author'],M['status']+' | '+M['date'],'## Abstract',M['abstract']]
parts=['<article class="paper-text" lang="en" aria-label="English manuscript"><h2>'+html.escape(M['title'])+'</h2><p>'+html.escape(M['subtitle'])+'</p><p>'+html.escape(M['status']+' | '+M['date'])+'</p><h3>Abstract</h3><p>'+html.escape(M['abstract'])+'</p>']
for sec in M['sections']:
    md+=['## '+sec['title']]+sec['paragraphs']
    parts+=['<h3>'+html.escape(sec['title'])+'</h3>']+['<p>'+re.sub(r'\[(\d+)\]',r'<a href="#paper-ref-\1">[\1]</a>',html.escape(p))+'</p>' for p in sec['paragraphs']]
    if 'figure' in sec:parts+=['<p><strong>Figure 1.</strong> YOU press Save → one PICTURE is captured → the MACHINE guesses → YOU check the answer and its limits.</p>']
    if 'table' in sec:
        rows,_,caption=TABLES[sec['table']]; md+=['\n'+caption,' | '.join(rows[0]),' | '.join(['---']*len(rows[0]))]+[' | '.join(r) for r in rows[1:]]
        parts+=['<figure><figcaption>'+html.escape(caption)+'</figcaption><table><thead><tr>'+''.join('<th scope="col">'+html.escape(v)+'</th>' for v in rows[0])+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+html.escape(v)+'</td>' for v in row)+'</tr>' for row in rows[1:])+'</tbody></table></figure>']
md+=['## References']
parts+=['<h3>References</h3><ol>']
for r in M['references']:
    md+=['['+str(r['id'])+'] '+r['text']+' '+r['url']]
    parts+=['<li id="paper-ref-'+str(r['id'])+'">'+html.escape(r['text'])+' <a href="'+html.escape(r['url'])+'">Publication record ↗</a></li>']
parts+=['</ol></article>']
(OUT/'mother77.md').write_text('\n\n'.join(md)+'\n')
(ROOT/'public/partials/mother77.html').write_text('\n'.join(parts)+'\n')
print('Built',OUT/'mother77.pdf')
