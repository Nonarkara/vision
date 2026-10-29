# Gesture continuation — 30 October 2026

## Scope and audit
Main matched origin/main at6072bc0. MiniMax left uncommitted Gesture HTML/CSS/controller, new screen/sound modules, a1.24.2 package version and proposed Jost/Prompt font assets; monitoring notes were also uncommitted. Reviewed and continued that actual work. The monitoring notes remain intact. Proposed fonts/licenses are preserved under evidence/gesture-1.24.2/proposed-fonts, outside public: adding a second display system on top of the approved house families did not justify its load or inconsistency. The malformed /@font-face therefore does not ship. Earlier MiniMax evidence remains under evidence/gesture-1.24.1.

## Found
- Mute left the AudioContext running and the new music action called note() without checking the muted state.
- An old rejected resume() could null a newer context; rapid input had no voice limit and oscillator/gain nodes were not all disconnected.
- The previous celebration banner disappeared. Camera-free Draw choices changed text but made no visible stroke; music ripples used the centre instead of the detected fingertip.
- A stretched grid/flex instrument could distort the picture. The reading-room header specificity overrode compact spacing. Below1000px the layout collapsed despite room for picture and controls together. The phone fullscreen flex rule lacked its column composition.
- Native fullscreen can stall in the in-app browser. A screenshot before entry was not proof of fullscreen; that invalid capture was replaced after real entry.

## Changed
Kept MiniMax's stronger struck-string notes, falling-paper motion, rhythm history, explicit idle specimen and Draw mode. Repaired ownership and cleanup rather than reverting those features. Audio is capped at four three-part voices, with peak headroom, complete node release, generation-safe context setup and cancellation of stale page callbacks. Mute gates the actual note. Celebration banners are restored; effects/history remain bounded and reduced-motion aware.

Draw works with hand landmarks, mouse or touch, plus an explicit Clear button and camera-free sample stroke at each brush width. Missing hands lift the pen, a visible fist clears, and large tracking jumps start a new stroke rather than connecting different hands. Music history is retained only where rhythm matters; the last twelve notes show relative timing. Ripples originate from the detected fingertip when available.

The picture keeps its16:9 geometry. The compact header overrides the actual shared readability selector, related mode descriptions sit with their buttons, and the tablet retains two columns above700px. Shared fullscreen accepts an explicit viewport preference for this room only: controls, focus isolation, Escape and focus restoration use the existing path without awaiting a stalled native request. Other rooms keep their existing native behavior.

## Verified
The user's task is to choose an activity, show a finger count and immediately see/hear its result; the picture is dominant, the readout comes next, and input choices stay beside/below that result. Real captures at390×844,1024×900 and1440×900 cover Thai/English/Chinese. JPEG dimensions were independently decoded. Geometry is in evidence/gesture-1.24.2/geometry.json, with public1.24.1 baselines in baseline.json.

Navigation stays44px:5.2% of the phone and4.9% of900px screens. English picture top moved325→274px at1024 and340→287px at1440; phone remains about368px with a fourth mode and a visible example. Primary camera action, complete picture and readout appear together. The final optional English phone number row needs about11px of scrolling; readable text and44px targets are retained. No tested document has horizontal overflow. The gray housing groups camera controls/status, ivory holds choices, indigo is ink, and jasper marks machine results/strokes. The preview is a labelled specimen, not an invented camera feed.

Browser checks: repeated Do/Do/Re/Do/Fa/Mi; mute remains selected across later numbers; all four modes; actual pointer drag and Clear; numeric brush samples; grayscale endpoint; phone/desktop fullscreen and Escape; translated choices. No private camera permission granted. Shared source/camera lifecycle protections remain in place. Independent source/visual review closed all reported findings after corrected active/fullscreen screenshots.

Behavior tests cover note cleanup/limits, old-context rejection, stale page audio callbacks, actual muted note action, camera permission cancellation, back-cache restoration, drawing continuity/hand loss/sample strokes, rhythm bounds and effects. Isolated scratch mutations removed the actual mute guard and the context-generation guard: each corresponding test failed exactly once. Production sources were not mutated. The initial linter run timed out on desktop while the phone measured successfully; its partial result is not claimed as a pass. Final release-tree measurements follow below.

## Remaining
Physical webcams, diverse hands/two-hand accuracy, touch hardware and physical speakers remain unverified. Browser pointer input and synthetic/public-landmark regression fixtures do not establish hardware accuracy. The site is not newly certified as a whole by this scoped Gesture release. Healthy app/tunnel services and other agents' preview were preserved; only the checked release may replace production.
