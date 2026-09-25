# Guided phone tutorial

Open navigation → Workflow settings → Guided phone tutorial → On. The guide stays above the selected page; its Open buttons navigate to the relevant workflow. Hide tutorial or switch it Off to pause without erasing results. Restart tutorial asks before clearing tutorial results and never deletes service records.

Eight steps cover practice setup, real camera photos, offline drafts/reload, network switching/backgrounding, completion/recurrence, PDF opening/sharing, installation, and usability review. Each step explains the action and expected result. Mark Passed, Needs attention, or Untested yourself. Next does not mark a test passed. Repeat on each physical phone/browser. A PWA update requires a later deployed release and is not proven by installation.

The guide is off by default. Progress is stored locally per account/workspace/mode/browser; it does not sync between phones or necessarily between the browser and installed app. Clearing browser data removes it. Storage failures are visible. Download test results exports step outcomes/timestamps, browser user agent, origin, and demo/live mode. It does not contain customer records, photos or credentials. Results are self-reported, not production certification.

Tutorial mode does not create a sandbox. Use a controlled practice workspace/site. Demo results must be repeated on the real backend. Avoid signing out with unsynced drafts. Sending a PDF is optional; opening and cancelling the share sheet is sufficient for the tutorial.

## Antigravity release handoff

Implementation: `apps/fieldledger/src/components/PhoneTutorial.tsx`, mounted in `App.tsx`. Browser regression coverage is in `tests/e2e/fieldledger.e2e.test.mjs` and runs through the existing E2E gate. Run current candidate verification, build with the intended environment, integrate the matching app output into Hosting, and retain existing deployment guards before publishing. Prior source hashes and acceptance reports do not certify this new source. This change was made locally; it has not been deployed by Codex.
