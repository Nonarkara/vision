# 1.25.0 — learn with Dr Non's stickers

User task: understand what a learner receives, watch a real explanation, then try the corresponding method without losing the picture or searching through instructions.

## Found

- Research,390×844, English: the first shape illustration started at885.2px and its action at973.2px after an actual On this page→learning link. A numbered guide occupied the space before the example. At1024/1440 the shapes started458.6/475.3px; the manual still came first.
- Teach's unsupervised choices said the user gives “nothing” and the system names groups. In fact the user supplies unlabelled pictures; the room numbers groups by visual similarity. Research's three Teach links all opened the default supervised method.
- The supplied3:14.7 English film primarily names piles and checks labels. Its colloquial “reinforce” is not proof of formal reinforcement learning. The companion distinguishes all3 methods before a viewer presses Play and explains the label/action distinction.
- Static HTTP had neither MP4/VTT MIME types nor ranged streaming. Adding the supplied63MB original unchanged would cause whole-file synchronous reads through the generic handler.

## Changed

- Research→Three ways to learn now leads with the actual film and a short comparison in Thai, English and Simplified Chinese. Desktop puts the comparison beside the16:9 film; phone puts it immediately below. An opening shortcut goes directly to the existing exercises. A Teach link returns to this explanation.
- Existing shape/group/reward examples and their actions precede the longer step-by-step guides, now native disclosures. All original exercises, caveats and next-method links remain.
- Research links carry a whitelisted `?method=supervised|unsupervised|reinforcement`; Teach opens the intended panel. Copy names the input as pictures without labels and the output as a numbered similarity group.
- Web copy:1280×720 H.264/AAC, faststart,194.733s,32,075,242 bytes (original65,661,935 bytes). Original Downloads file untouched. No generated replacement footage; poster is an actual frame at46s. Strip container metadata. `preload=none`, native controls/inline playback, direct download fallback, automatic English caption track labelled as such. Transcription ran locally with cached MLX Whisper small; no private video upload or training. Automatic captions retain possible recognition errors; Thai/Chinese are companion explanations, not claimed spoken translations.
- MP4 responses stream file ranges, with206/416, HEAD and ETag handling; cancelled responses destroy their file stream. Weak If-Range falls back to full representation. Non-media static/security/private-directory behavior retained.
- JS import restamps throughout the graph keep one shared module instance under1.25.0; those files carry no unrelated feature changes.

## Verified

Evidence directory: `ops/evidence/sticker-lesson-1.25.0/`.

- Exact comparable baselines use the actual On this page link. Earlier candidate frames captured after viewport reload had restored scroll positions; final-* and before-* replace those for conclusions. No inference from those intermediate reload offsets.
- Nine final lesson captures:TH/EN/ZH×390×844,1024×900,1440×900. All have0 horizontal document overflow. Rail44px at every size:5.21% phone,4.89%900px screens; no bottom fixed bar. New film starts185.7–217.5px on phones and189–202px on wider views. Desktop1440 shows video, comparison and all method choices together (choice bottoms842.7–888.8px). Tablet choice bottoms709.6–753.2px. Phone comparison earns the additional scroll; a visible opening shortcut avoids it for readers ready to try.
- Phone shortcut tested separately after settled navigation: Now try it at60px; revealed shape example381.3–494.1px and its keyboard-operable action506.1–550.1px, together within844px. Earlier practice-geometry samples include locator focus auto-scroll; use skip-practice-390.jpg for the actual shortcut landing claim.
- Teach390 first picture334–536.5px, first example action720.5–818.1px; the explanation link preserves both within844px.1024/1440 retain picture and actions side by side. No clipping/overflow workaround added.
- Native playback progressed to6.39s with readyState4; native seeking reached138.92s and paused. Caption track reaches readyState2 while film readyState remains0 before Play. Native caption menu exercised; no camera permission requested. Media tests compare actual prefix, suffix, open-ended and clamped bytes, invalid ranges, HEAD/cache and VTT.
- Group by shape→ungroup restores4 items; expanded guide opens; Enter reveals labels with visible focus; Research grouping link opens the unsupervised Teach choice/panel. Full bounded training was not repeated: learner algorithms are unchanged.
- Wider MSH entry sweep:16 main rooms×3 widths (45 entry-* plus3 train-*), all0 document overflow. Actual screenshots and contact sheets inspected, not inferred from the build. Hierarchy: picture/experiment on Home/Learn/Cameras/Teach/Gesture/Games, own-session picture/consent on Focus, section evidence on Research/System, reading on Everyday/Legal/Handbook, authored photo story on Story. No private camera capture/grant, no arbitrary deletion of useful charts/media.
- Independent read-only review by resource_review covered source/ranged streaming, media tests, all9 final image dimensions, selected multilingual finals and all phone/desktop contact sheets. It requested the early film/guide qualification and corrected tablet navigation capture; both addressed. Scoped lesson changes approved.
- Working-tree npm run check:425/425,27 pages/99 local references,94 modules/88 resolved imports,9 declared storage keys,17 required palette pairings. New3 media tests; existing misleading “nothing” wording assertion corrected. Initial check correctly failed on test fixture URL/root construction, the outdated wording assertion and an85ch declaration; repaired, no failing check published.
- slop-lint was attempted on Research/Teach. Research desktop+phone and Teach desktop timed out on cold navigation; partial Teach phone result200,0 overflow,0 stretched boxes. Output retained in lint-partial.json; no fabricated combined score/pass. Real IAB screenshots succeeded at all required widths. Full linter verdict remains unverified.

## Remaining / scope

This is a scoped lesson repair plus a rendered entry audit, not a claim that all states of all pages pass. Independent review prioritised Reconstruct's long phone introduction before its real artifact: existing orientation and text process tiles delay the result. Drive retains its educational challenge and visible skip; no simulation/gate redesign in this release. Deeper chapters, real camera denial, physical devices, every expanded panel and full learner training were not re-audited. Existing partial Chinese translations elsewhere remain visible English fallback. Automatic English captions may misrecognise names; do not call them reviewed translations.

Release-tree deployment evidence and public verification are appended after publication.

## Publication — 2026-11-03,02:36 Bangkok

Release ba57e62 deployed from a clean detached worktree. Exact release gate passed425/425,27 pages/99 references,94 modules/88 imports,privacy9 keys,palette17 required pairings,all changed module URLs fresh. An earlier command was issued before worktree checkout finished and failed on missing package.json; it did not reach a gate or publish anything. The completed clean checkout was used for the recorded deploy.log.

Public/local health1.25.0 / ok:true with3,244 entries; disk seed loaded02:36:30,upstream02:27:16 Bangkok,within freshness tolerance. App PID80448 running/last exit0 following gated restart; tunnel PID985 running/never exited. Ten audited files (including film/captions) hash-identical across working tree,release and runtime. Public HTML1.25.0 stamps; MP4 range bytes0–31→206/content-length32/content-range0–31/32075242; VTT200/text-vtt. Public film playback readyState4/time7.60s,duration194.733s; actual English captions visible in live-playback.jpg, then paused. Public Research and Teach at390/1024/1440 have0 overflow; public grouping link settles on unsupervised panel. Early HTML has default selection until the module mounts; final screenshot/state was taken after mount. No observed browser console errors in tested pages. Live phone guide expansion and Enter/focus exercised with0 overflow.

Six additional Teach TH/ZH captures have0 overflow. Thai phone example action ends802.8px; Chinese fallback plus translated lesson link puts the full bottom at881.4px (about38px useful scroll). No clipping, tiny type or removal of the fallback notice to force a fit. These are retained limits, not a universal one-screen claim. Full linter verdict remains unverified as above. Evidence files decode successfully; original video remains in Downloads. Other agent's active preview log preserved.
