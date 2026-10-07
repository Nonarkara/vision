# Browser actions · สิ่งที่เบราว์เซอร์ยอมให้หน้าเว็บทำ

> A web page is a guest on your machine: it may ring a bell in its own room, never pull the fire alarm. This page lists exactly what [the gesture room](https://vision.nonarkara.org/gesture) is allowed to do, what it refuses to do, and why.

[← Handbook](../README.md)

---

## Why a page cannot open an app or sleep your Mac

Everything a website runs inside is chosen by the browser: a sandbox with windows into a few carefully chosen capabilities — a camera you granted, storage for this site, the network for addresses you allow. There is no web API for *shut down*, *sleep*, *launch an application*, or *read a file you did not pick*. Not because nobody has proposed one, but because the moment a page could do those things, every advertisement on the internet could too.

Think of it as a hotel guest. You may use the lamp, the tap, the Wi-Fi. You may not rewire the lift. The browser is both the hotel and the law it enforces, and it enforces the rule on your behalf, whether you asked it to or not.

This is also the answer to the question the gesture room gets asked most: **a page cannot close your laptop or put your Mac to sleep — not this one, not any other.** If you ever see a website claiming to, look closer: it is asking you to download a program, and that program is no longer a website.

## The user-gesture rule

Several actions are locked behind a recent, real click — a person's action, within the last few seconds:

- opening a new window,
- entering full screen,
- starting audio the visitor did not start with a click.

The reason is the same: before the rule, pages opened pop-ups behind you, played sound you could not find, and trapped your screen. The gesture rule means the room's **Arm the actions** button is not a decoration — it is the click that unlocks everything the page may do afterwards, and it is the one part of the flow no amount of clever code can skip.

## What the gesture room actually does

Each gesture you teach is bound to one of these. When the machine fires one, the room writes what really happened in its log — success or refusal, both reported the same way.

| Action | What it uses | When it refuses, honestly |
|---|---|---|
| Short beep | Web Audio oscillator, resumed on Arm | not armed yet |
| Vibrate | `navigator.vibrate` | most laptops have no buzzer; the browser may still decline |
| Full screen | Fullscreen API, needs the click rule | refused without a recent gesture — press the ⛶ button yourself |
| Screen flash | a white overlay on this page | skipped entirely when the system's *reduce motion* is on |
| Lamp 1 / Lamp 2 | an SVG circle on this page — a drawing | never touches a real bulb; there is nothing to refuse |
| Play / pause tone | a WAV file the page writes itself, plus media keys for this tab only | no sound without a click; it never controls another app's music |
| Open the handbook window | a window opened during Arm and steered later | if the popup was blocked, the room shows a link and says why |

The two lamps deserve their own sentence: **the home board on the page is a picture.** Pressing "Lamp 1" changes the colour of a circle in this tab's memory. Real bulbs live behind hubs, accounts and servers a web page has no business holding.

## What would be needed instead

For the things a browser will not allow, the honest routes are:

- **Sleep, shut down, launch apps** — a small native helper you installed yourself, invoked with an explicit command (on a Mac: `pmset sleepnow`, or AppleScript through a helper app). The operating system gets to ask you once, at install time, because that is where the trust belongs.
- **Real lamps and switches** — a hub or service with its own account and permissions (HomeKit, Matter, MQTT, whatever your devices speak), talking to a server you control. The camera gesture would trigger a request to *that* server; this site is deliberately not that server.
- **Controlling other apps' music** — the operating system's own media keys and now-playing APIs, which browsers expose only for the page's own media.

Every one of those involves leaving the sandbox — which is exactly why browsers make you choose them deliberately, one permission at a time.

## The rule this site follows

A refusal is a result. The gesture room reports what happened in full sentences — in Thai and English — instead of going quiet, because a page that pretends it worked is how "smart" gadgets learn to lie to the people using them. The same rule as the rest of [chapter 08](../08-limits-and-ethics.md): *not detected* never means *not there*, and *not allowed* should never be dressed up as *done*.

---

### สรุปภาษาไทย

หน้าเว็บเป็น "แขก" ในเครื่องของคุณ ทำได้เฉพาะสิ่งที่เบราว์เซอร์อนุญาตอย่างชัดเจน จึงเปิดแอปอื่น ปิดเครื่อง หรือสั่ง Mac เข้าโหมดพักไม่ได้ — ไม่ใช่แค่หน้านี้ แต่คือทุกหน้าเว็บ และนั่นคือเหตุผลที่คุณเปิดเว็บแปลก ๆ ได้โดยไม่ต้องกลัวว่ามันจะปิดเครื่องคุณ การกระทำหลายอย่างต้องใช้ "คลิกของคน" เช่นปุ่มเปิดใช้การกระทำในห้อง /gesture เพื่อกันเว็บเปิดหน้าต่างและเสียงลวนลามคุณ ห้องนี้รายงานทั้งความสำเร็จและการถูกปฏิเสธเป็นประโยคเต็ม ๆ เพราะหน้าเว็บที่แกล้งทำเป็นว่าทำสำเร็จคือจุดเริ่มต้นของอุปกรณ์ "อัจฉริยะ" ที่โกหกคนใช้ ส่วนหลอดไฟจริง เครื่องช่วยสั่งพักเครื่อง หรือการควบคุมแอปอื่น ต้องการโปรแกรมที่ติดตั้งเองหรือเซิร์ฟเวอร์ที่คุณดูแล — นั่นคือทางที่ถูกต้องเมื่อจำเป็นจริง ๆ

## Check yourself

1. A friend claims their website can put a laptop to sleep. What is really happening when a page "does" that?
2. Why does the gesture room ask you to press **Arm the actions** before anything can fire — what would break without that rule?
3. If you wanted a hand gesture at your desk to dim a real lamp, name the three pieces you would have to build, none of which is a web page.
