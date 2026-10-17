# Lyric Glass browser QA

Date: 2026-10-18 (Asia/Tokyo)

## Production browser test

Tested the published Cloudflare Worker at <https://lyric-glass-english.maponaru0519.workers.dev/> in the Codex in-app browser. The PWA shell loaded with the two starter songs, its manifest and static assets were served, and the published page title was `lyric glass`.

A production Workers AI binding named `AI` was attached to the new `lyric-glass-english` Worker. From the app, I asked about the built-in phrase `look back in anger`. The live Worker returned a Japanese explanation with an original example, and the app saved it as a learning note. The note appeared in the Notes view, survived a page reload, and reopened with the same explanation. This is an actual production inference through Workers AI; it is separate from the API stub tests in `API-TESTS.md`.

The final published Worker version is `20148672` (active/latest). The saved Workers AI note was reopened from the library and its `**strong**` and `*emphasis*` markers rendered as `<strong>` and `<em>` elements. It remained saved after loading the release URL and then reloading the normal production URL. The final bundle also versions the static assets and disables stale asset caching so browsers receive the formatter update.

At a 375 × 812 browser viewport, the layout had no horizontal overflow with the long saved question present: `innerWidth` was 375 px, while `clientWidth` and `document.documentElement.scrollWidth` were both 360 px because the browser's vertical scrollbar occupies 15 px. Screenshots: [production-375.png](production-375.png) and [production-answer-375.png](production-answer-375.png).

## Local browser test

Tested `http://127.0.0.1:4174/`, a local preview executing the generated Worker bundle with no AI binding. These checks cover the unavailable-AI path, not a second production deployment.

- Added a synthetic QA song, confirmed empty required fields trigger native form validation, and confirmed a duplicate title/artist pair is rejected.
- Entered two synthetic lyric lines, saved them, reloaded the page, reopened the song, and confirmed both the song and lyrics remained.
- Selected a lyric line; the question button became enabled and opened the question form with the selected phrase.
- Submitted a question with AI unconfigured. The UI showed the setup guidance and said the answer was not saved; the Notes view remained at zero entries.
- Read and saved the song-title learning memo, opened it from Notes, and verified its saved text.
- At 375 px width, the page had no horizontal overflow (the document width was 360 px).

The local QA song and memo remain in the local preview origin's browser storage; the app has no delete control. Production data was tested only with the built-in starter phrase, and one saved note remains in this browser's local storage as the verified persistence result.

## Responsive and content review

The browser viewport control supports explicit sizing but does not expose a `prefers-reduced-motion` emulation control. I confirmed the CSS contains a `prefers-reduced-motion: reduce` rule that disables smooth scrolling and reduces animation and transition duration; runtime emulation was not performed. No physical iOS device or standalone Safari browser test was performed.

The UI contains no `<audio>` or `<video>` elements and no fake playback controls. Its outbound music action is an official-music search link; it does not fetch or play audio. The lyric guidance says users provide their own text, and the app does not retrieve lyrics from song title or artist metadata.

## Related API verification

`API-TESTS.md` records 14/14 Node contract checks using a stubbed AI response. Those checks cover malformed requests, limits, error responses, and final-answer extraction; the stub success case is not a real model inference. The production inference described above independently verifies the `AI` binding path.

The formatter regression and the saved-note mobile overflow found during final production QA were both fixed in the final deployed bundle. The original Workers AI answer and saved note were reused for verification; no additional AI request was made.
