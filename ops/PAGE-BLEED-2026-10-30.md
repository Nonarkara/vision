# Page bleed — 1.24.3 · 30 October 2026, Bangkok

Release code: `8738f86` (with `ab6f1b2`), published from a detached release worktree. Public and local health confirm1.24.3. Ordinary push recorded after the evidence commit.

## Found

The task is to choose a picture, see what the machine makes of it, and manipulate that result without reconstructing the interface by scrolling.

- Home390: its picture started at417.4px; five viewer bands separated source choices from the picture. The source actions began after the explanation, near/below the fold. An introductory Start learning button consumed space before the actual experiment.
- Games390: the third game was partly concealed in a horizontal scroller. Repeated game headings, a score band, a guide and a separate fullscreen row preceded the picture (top724.2px). Desktop picture reached below900px and the first recompose exposed a note stretched by a1fr row.
- Learn390: the first picture began around815.1px. A larger page-specific title overrode the shared title role; a separate chapter strip and progress/resume bands spent attention before the lesson. Fullscreen owned an otherwise empty row. Source metadata was permanently clamped on phones.
- Advanced Train: two empty thumbnail strips each reserved52px despite no pictures.
- Drive: blanket `overflow-x:clip` on the phone room/gate/chapters concealed whether descendants actually fit.

## Changed

Home source actions now immediately follow the picture/lenses, before commentary. The current source name opens its full owner/relay credit. Privacy text remains visible; Start learning follows the working viewer on phones and stays with the introductory copy on desktop. The picture keeps16:9.

Games exposes all three content-sized choices. Count race groups Start, clock and fullscreen; the score follows the count controls. The guide accompanies the instrument on desktop and remains available after it on phones. The first desktop note sizes to its content rather than filling the picture's row.

Learn uses one compact directory/progress group, with all eight original anchors in a normal-flow disclosure. New readers do not get a redundant Start-at-1 band; returning readers retain the count and a short Continue link with a complete chapter-specific accessible name. Source names open full credits in place. The first number instrument shares fullscreen with its slider; on phones the familiar fullscreen symbol retains its complete aria-label/title and44×44 target. Its enlarged frame also remains16:9, removing an independently found160px internal gap between the actual picture and slider. Title/copy/desktop proportions now serve the lesson instead of a separate hero.

Empty Train galleries now measure31.6px (20.4px saved per class); populated thumbnail rules are untouched. Drive no longer relies on blanket clipping; its real geometry fits the tested widths.

## Verified on the release tree and served runtime

`npm run deploy` from clean detached8738f86 ran the complete release gate:422/422 tests;27 pages/97 local references;94 modules/88 resolved imports;17 required palette pairings. Module freshness check passed, then the script backed up/restarted the app and reported Published1.24.3. No tunnel restart. No tests were added to mirror these reversible CSS/markup changes; real rendered states provide the layout evidence.

45 release-candidate captures cover Home/Games/Learn/Train/Drive at390×844,1024×900 and1440×900 in Thai, English and Chinese modes. A further33 entry captures cover the other11 rooms at all three widths. No document horizontal overflow in these78 cases. Chinese mode accurately shows the existing English-fallback notice where translation is incomplete; these are not claims of full Chinese translation. All images are actual screenshots, not mockups.

Observed English comparisons (source/status text varies with the selected public camera):

| Room |390 picture top before → after |1440 picture top before → after | Purpose |
|---|---:|---:|---|
|Home|417.4 →328.2px|98.4 →98.4px|Keep the picture's desktop area; recover89px before it on phones|
|Games|724.2 →495.0px|556.7 →362.0px|Recover229px on phones; keep choices/Start/picture/count together|
|Learn|815.1 →488.7px|529.7 →315.3px|Recover326px on phones; show the number grid with its slider|

Games' desktop picture becomes455.5px high instead of572.0px while maintaining aspect, rather than inflating a1017px frame. Learn's desktop picture becomes449.1px instead of507.7px. Neither picture is cropped or stretched.

### Per-viewport composition

-390×844: the44px persistent rail costs5.2%; no bottom chrome. Home's picture/lenses/source choices are the dominant experiment; Games exposes all choices then Start/picture/count; Learn prioritises the number grid and range, with optional directory/credits opening in normal flow. Train's initial lesson stays intact; empty-gallery savings occur inside advanced training. Drive's introductory teaching challenge remains intact. No accidental page-wide horizontal scrolling. Usable targets/readable type are retained.
-1024×900: rail44px/4.9%. Learn's persistent source chooser measured64.5–116.5px depending on name/warning/wrapping, so combined sticky chrome108.5–160.5px (12.1–17.8%). This is the picture source, relevant warning and its actions, not another identity/title band. Desktop/tablet picture and controls stay grouped; all three game modes remain visible. The expanded directory uses ordinary page flow rather than a nested scroller.
-1440×900: rail44px/4.9%; Learn's source chooser67.2px gives111.2px/12.4% combined sticky chrome. Home still gives its working image most of the right column; Games aligns its guide beside the count picture; Learn aligns explanation with the instrument. The note's body stops after its words. No orphan stretched note or inflated gallery remains in the reviewed states.

Chinese's translation notice additionally occupies67.6px on phones or43.8px on desktop/tablet in these captures. It is not sticky, but its initial-screen cost is included in `measures.csv`. It explains the fallback rather than pretending untranslated English is Chinese.

Exercised: number slider by keyboard (16→15), all eight expanded directory links44px tall, source owner-link/full credit expansion, chapter anchor navigation (#colour landed below the rail), phone fullscreen/Escape/focus restoration, empty advanced galleries, and live public module stamps. Fullscreen frame now y0–219.4px with slider y251.8–295.8px, without the previous internal black gap. Independent read-only source/render review caught the stretched note and fullscreen frame; both were repaired and re-reviewed with no remaining scoped blocker. Browser error log was empty after the sweep and live route checks.

Public verification: all five changed pages at all three widths carry1.24.3 HTML/CSS/script stamps, report the new footer version and have no horizontal overflow. Live Learn also checked in all three language modes. Health: catalogue loaded2026-10-29T19:16:49Z/upstream19:15:35Z,3,254 sources, both local/public ok:true. Python urllib's default user agent received403 on the first public-health attempt; normal curl and the browser succeeded, so this was not treated as a service outage.

## Remaining / limits

Source names, quality warnings and returning-reader progress are real variable content. The candidate phone slider fit all modes (EN bottom766.5px,TH735.7px,ZH835.6px), but a different live source's additional warning pushed the Chinese slider bottom to864.4px: about20px of useful-content scrolling, with its picture and source actions retained. A desktop Chinese candidate also needed about8px to expose the full range target. We do not claim every dynamic text combination fits a fixed-height screen. The fallback notice/full credits remain readable; no clipping/tiny text was used to force a fit.

The33-room sweep is entry-screen evidence, not a full audit of every expanded state or all11 handbook chapters. Camera grants/private captures/training were not used. Physical touch hardware/native desktop fullscreen are outside this pass. No blanket claim that all future layouts are free of SH.

Evidence: `ops/evidence/page-bleed-1.24.3/` contains before/after/public screenshots, expanded source/directory/fullscreen, geometry/CSV, health, release gate and hue/linter outputs. Repeated candidate captures in geometry.jsonl are intentional; the final sample for each page/width/language is used by measures.csv.

### Release instrument readings

Hue census on the exact deployed files (10 release/runtime file hashes verified against8738f86): all five changed pages carry at least three purposeful house hues at phone and desktop; Home/Games carry four. No palette declarations were changed.

Slop-lint was run from the release worktree against the byte-identical deployed runtime. Games:OK,2 points/score9 (`void`, approved house font). Learn's successful retry:OK,2 points/score9 (`stretch-to-fill`, approved house font); below-fold channel-button heuristics remain outside this first-lesson repair. Train:REVIEW,5 points/score22 (`emoji-icons`, paper-ground `void`, bilingual `type-chaos`, approved font). Drive:REVIEW,5 points/score22 (`emoji-icons`, paper-ground `void`, `long-lines`, approved font). These are recorded heuristics, not blanket visual certifications. The inspected first-screen compositions and measured containments are the evidence for this release.

Home and the first Learn desktop linter runs hit35s navigation timeouts; phone readings completed with no horizontal overflow/stretched boxes. Learn's later retry completed both viewports. Normal live/local browser navigation and curl are healthy (including local HLS asset200/415,253 bytes in0.021s); no healthy service was restarted to cure an instrument timeout. We retain partial runs rather than invent a passing aggregate score. Home's separate public attempt is retained alongside them.

The final public Home linter attempt returned desktopHTTP200 but its screenshot exceeded30s; its mobile navigation exceeded35s. Home therefore has no completed aggregate linter verdict in this pass. All three real IAB Home widths and public1.24.3 assets were independently captured/checked successfully; the instrument limitation is retained explicitly.115 viewport screenshots were decoded and dimension-verified, including baselines, repeat captures and live captures (the78 candidate/sweep compositions above remain the non-duplicated scope).
