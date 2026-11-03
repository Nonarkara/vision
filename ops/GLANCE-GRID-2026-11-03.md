# Glance path / kinetic grid audit — 3 November 2026

Scope: Home and Reconstruct. Owner-provided studies are applied as design criteria; no poster styling, extra motion, new service or camera permission is implied. Product palette and MSH remain authoritative. Source releases: 6840b67 (1.26.2) and e7e2e85 (final 1.26.3).

## Brief

Reader: a first-time learner. Task: see what the machine does, understand the picture, choose a next step. Grid: quiet column; no licensed rotation or overlap. Entry: working camera on Home, geometric camera/point diagram on Reconstruct. Exit: joined heading, explanation and action beside the visual on desktop, below it on phones. Image roles: task-first instrument and scientific explanatory figure. Space beside the picture supports its reading group; no blank module or new decorative panel is manufactured. House signal hue still means a machine response, never a human CTA. No new animation.

## Found and changed

- Home phone: title/explanation above the heavier camera; next lesson link below the full instrument. At390 English, camera started328px down and next link872px down. Picture now starts117px down; joined explanation/action follows it, with next link at556px and lenses624px. Camera/controls/feedback/source-quality warnings remain. No camera permission was granted.
- Home desktop: five lens tabs expanded to193px each for58–73px content. Content-sized controls retain44px targets; phone retains the usable five-choice row. No other room inherits this override.
- Home story preview: headline above image and related prose below it forced a leapfrog. Image now precedes a single heading/prose/action group, alongside on wide screens and below on phones. Photograph and its credit remain.
- Home pipeline: English headings overlapped neighbouring205-unit SVG columns and the last heading clipped. Deliberate two-line labels and sufficient diagram height restore each column without reducing type. Chapter links and every label remain. The existing phone diagram scroller remains, with no document overflow.
- Reconstruct phone: a386px introductory block and long prose put the explanatory figure2018px down. The existing figure now opens the room; the full introduction is an optional native disclosure. Diagram no longer inherits780px minimum width: it fits its440-unit composition, has visible camera glyphs and readable labels. Heading, short TH/EN/ZH orientation and two direct choices follow it. Full theory, reel, credits, head-cloud demo, consent and scientific limitations remain.
- Independent review caught a new fullscreen fallback regression introduced while regrouping Home. Normal grid/copy rules now consistently exclude both native fullscreen and .is-expanded viewport mode. Phone expansion, Escape, focus return and copy restoration exercised. Desktop native fullscreen was attempted but no expanded state was observed in the automation surface; it remains unverified, not claimed as passed. Shared fullscreen JS is unchanged beyond cache stamps.
- Corrected Home’s Drive capacity24→32 to match the already-shipped Asok study.

## Viewport evidence

Evidence directory: ops/evidence/glance-grid-1.26.2/. Six baseline first-screen PNGs,18 final multilingual first-screen PNGs, full Home screenshots at all3 widths and targeted interaction captures. The final geometry JSON has18 rows, each with zero document overflow. Widths390×844,1024×900,1440×900. Evidence named pipeline-* was discarded because its capture was at the opening; actual pipeline evidence is in home-full-*.

Chrome is44px:5.2% of844 /4.9% of900. Home Chinese retains its accurate43.8px partial-translation notice: total87.8px,10.4% /9.8%. Reconstruct’s translated first screen needs no notice. Home Chinese still falls back to English for older prose; this is not a translation-completion claim.

At390 Home’s next action/lenses start EN556/624px,TH593/661px,ZH625/693px; all remain visible with the picture in the initial screen. Privacy/source feedback below the choices can earn additional scrolling; it is not clipped or hidden. At1024/1440 the picture and joined reading group are side by side. Reconstruct opening action starts EN578px,TH542px,ZH510px on390, and fits all three widths; deeper scrolling reveals the full theory or optional demo. Reconstruct’s opening artifact precedes the heading and its body; no heading/body leapfrog. Home’s pipeline chapter title leads as dominant typography; the explanatory diagram below does not split that title from its orientation.

Preservation exercised: Home edge lens and translated readout, source controls still present, CTA→Tab enters first lens, phone fullscreen/Escape/focus, Reconstruct disclosure round trip and #try shortcut with consent unchecked/start disabled. Loading-camera state and real public-camera state both captured. No private imagery, permission, microphone or model training. Camera-dependent point generation is untested intentionally.

Independent reviewer /root/resource_review inspected representative Home/Reconstruct screenshots covering390/1024/1440 and verified all18 dimensions, then reviewed the full Home and pipeline/story follow-ons. Approved scoped changes; no unresolved blocking finding. This does not certify every room, browser-native fullscreen or zoom behavior.

## Release verification

Recorded after the clean detached release gate and public verification; exact results and remaining heuristic findings follow below.

1.26.2 clean detached6840b67 and1.26.3 clean detachede7e2e85 each passed npm run deploy:433/433 tests,27pages/100localrefs,96modules/90resolvedimports,17requiredpalettepairings and changed-module URLs. Only mandatory cache-import restamps explain the broad JS diff; no learner or server behavior changed.

Final typography follow-up1.26.3: measured lens explanation972px/14px and glossary818px/14px with no maximum. Added65ch limits scoped to those Home paragraphs. Nine further TH/EN/ZH renders show0overflow; desktop English/Chinese546px,Thai dynamic readout455px. Readable text size retained. Independent reviewer approved the scoped source change. Picture, initial task actions and layout heights before those paragraphs remain unchanged.

1.26.2 tool results: Home REVIEW(score13/3points;big-number-tiles,long-lines,type-chaos,default-font) with zero stretched controls;Reconstruct OK(score9/2points;void,default-font),zero stretches. The genuine Home long lines received the1.26.3 correction. The chapter-number span05 shares the index row’s height but does not create a visible stat box or add row height; Thai type-size/font hits are known house baselines. Reconstruct’s flat ground groups its sparse scientific artifact and the reading column; it is not an empty hero.

Final1.26.3 slop-lint: Home navigation timed out35s on desktop andphone, so aggregate final Home score is UNVERIFIED (not silently carried from1.26.2). Reconstruct still OK(score9/2points;void/default-font),zero stretches. Final colour census:Home3desktop/4phone,Reconstruct4desktop/3phone. Manual renders and independent review supply scoped visual evidence; no whole-site or untested-state pass is claimed.

Final public Home/Reconstruct1.26.3 reopened at390/1024/1440,all styles stamped1.26.3,0horizontaloverflow,no observed console errors. Public readout max546px verified. Local/public ok:true/version1.26.3,3,243 retained catalogue entries. Initial upstream refresh failed, so runtime correctly served its disk cache (loaded14:55:54/upstream14:46:33 Bangkok; about11 minutes old at follow-up), within30-minute tolerance; no upstream/tunnel restart justified. Saved health JSON includes exact age context,relay state and memory. App restarted only through the gated release; other preview/log preserved.
