# Whiteboard

Parent: [New Rep Onboarding Playbook v2026.04](index.md).

A 20-minute live demo for new reps. Practice it once with a manager, then once unassisted, before the day-30 checkpoint on the [30/60/90 curriculum](../30-60-90-curriculum.md). The [certification checklist](../q3-2026-sales-enablement-hub.md) has one Whiteboard item for this module.

Synthetic throughout. Use the Harborline demo space and a board you control. Do not import a prospect's Miro board, create work items in their Jira, or collect credentials. This script is a rehearsal, not a quote.

Loom recording is out of scope until the script is approved.

## Outcome

The rep can, on a small synthetic board:

- import a Miro board so sticky notes stay editable
- turn selected stickies into Jira work items
- ask Rovo to summarise the board and leave a Confluence page

## Before the clock starts

Prepare this once. It is not part of the 20 minutes.

- Confluence Cloud with whiteboards. Whiteboards are not available in Atlassian Government environments. If the deal is a Government environment, do not run this demo.
- Rovo turned on for the site by an org admin.
- Permission to create work items in a demo Jira space (the Harborline space).
- A Miro board you own, named "Harborline planning", with:
  - a frame titled "This week"
  - stickies: "Clarify the day-3 onboarding email", "Add an empty state for the first project", "Instrument invite-accept drop-off", "Decision: pilot with one team before a company rollout", "Question: who owns the Miro archive after cutover"
  - one text label and one connector between two stickies
- Pop-up blocker off, so the Miro export can download.
- A blank Confluence whiteboard in the demo space.

If the site is on Free or Standard, stay under the active-whiteboard limit (3 per user). Imported boards on those plans are read-only by default. Copy an imported board to edit it when you are under that limit.

## 20-minute script

Talk track is in quotes. Clicks are numbered. Keep each beat even if a click is slow: cut commentary, not the three outcomes.

### 0:00–1:30 Frame

"Harborline writes the plan on a Miro board, then retypes it into Jira. I'll show three moves that retire that retype: import the board, turn stickies into work items, and leave a Rovo summary people can read without opening the board. This board is synthetic. Nothing here is a quote."

Point at the three stickies you will convert, and at the two you will leave for Rovo.

### 1:30–7:30 Import from Miro

Export from Miro:

1. Open the Harborline planning board.
2. At the top, select **More actions**.
3. Select **Board**, then **Export**, then **Export as image**.
4. Select the area that holds the frame and the five stickies.
5. Select **Vector PDF**.
6. Select **Export**. Confirm the PDF downloaded.

"Vector PDF, not a screenshot. A flat image stays a picture. This path keeps stickies as stickies. Miro documents this export as Save as image."

Import into the whiteboard:

1. Open the blank Confluence whiteboard.
2. On the toolbar, select the **More** menu (…), then **Whiteboard import**, and choose the PDF.
3. Dragging the PDF onto the whiteboard is the same import.
4. Select the content type the dialog asks for.
5. Wait until the import finishes. This board should finish immediately. A large board can take more than a minute. Do not fill the silence with a second import.

Show, don't assert:

- Click a sticky and edit a word. It is text, not a picture.
- The frame arrived as a rectangle.
- Colors snapped to the nearest whiteboard color.

Say the limits once, while looking at the board:

"Comments, locks, rotation, and talk tracks do not come across. On this single-board import, connectors do not import. Shapes the whiteboard does not support arrive as images. There is a 10,000-element cap."

Recreate the one missing connector with a smart connector. That is the contrast: the import got the stickies, and the connector is the part you redraw.

If they ask about moving a whole workspace, say this and do not click it:

"Bulk import is a different path: Confluence, Spaces, Import from other tools, Miro, then a ZIP. Keep each ZIP under 100 boards. That path does map connectors. A board over 10,000 elements or 5 MB fails on its own. We don't start that on a first call."

### 7:30–13:30 Sticky-to-Jira conversion

Leave the decision sticky, the archive question, and the connector in place.

1. Select these three stickies: day-3 onboarding email, empty state, invite-accept drop-off.
2. On the floating toolbar, select **Create a Jira work item**. The same action is under **Jira integration** on that toolbar.
3. Select the demo site, the Harborline space, and work type **Task**. If that space has no Task type, use the lightest type it does offer.
4. Required fields change with the work type. Confirm the summary is the sticky text. If the dialog left the summary empty, paste the sticky text in. Fill only required fields.
5. Select **Create**.

The stickies become live Jira cards. Open one card. The summary matches the sticky you selected.

"A shape with text converts the same way. I am not converting the whole board. The decision and the open question stay here so Rovo has something to summarise."

Do not say that Miro widgets, tags, or table cells become work items, or that Jira fills fields the sticky never contained.

### 13:30–18:00 Rovo summarise

If the Rovo button is missing, stop this beat and say an org admin has to activate Rovo. Do not invent a workaround. The import and the conversion still count; certification waits until summarise is shown.

Grouping, about 90 seconds. This is the Rovo grouping move, then get to the summary:

1. Select the two remaining stickies (the pilot decision and the archive question).
2. Select **Ask Rovo** on the floating toolbar.
3. Prompt: "Group these stickies by theme and name each group."
4. Read the group names. Do not restyle them.

Summarise, the required beat:

1. Select the **Rovo** button at the bottom-right of the whiteboard.
2. Select **Summarize what I'm looking at**. If that quick action is not in the list, type that phrase in the panel input. Prefer the quick action when it is there.
3. Select **Create page**. **Copy summary** is the alternative when a new page is not wanted.
4. Open the page. Point at one decision and one open question.

"That page is what a manager reads after the workshop. The board stays the working surface. The page is the leave-behind."

### 18:00–20:00 Close

"Import kept the stickies editable. Conversion replaced the retype into Jira. The summary is the page the rest of the team can read."

Ask both questions:

1. "Which single board, if it moved tomorrow, would stop a team retyping into Jira?"
2. "Who is allowed to create work items in the space those stickies should land in?"

When the account is also looking at Titan for delivery, say one line and stop: "The whiteboard is where the plan starts, and the converted work items are what delivery tracks. This demo does not configure Titan."

Tell the observer the certification item is on the [Q3 2026 Sales Enablement Hub](../q3-2026-sales-enablement-hub.md). Do not offer to record a Loom in the room.

## After the 20 minutes

Before day 30, run the same three beats unassisted on a second synthetic board with different sticky text. Links to keep for the manager: the imported whiteboard, one created work item, and the summary page.

## If something breaks

| What you see | What to say | What to do |
| --- | --- | --- |
| Stickies imported as one flat picture | "That export was an image, not a Vector PDF." | Re-export as Vector PDF and import again. Do not rebuild the board by hand on the call. |
| Export never downloads | "The pop-up blocker ate the file." | Allow the pop-up and export once. |
| Imported board is read-only | "Free and Standard keep imports read-only so we stay inside the active-whiteboard limit." | Copy the board if you are under the limit. Otherwise skip editing and continue with a board you already created. |
| Create a Jira work item fails | "This space is missing create permission, or a required field is empty." | Switch to the Harborline demo space. Do not try the prospect's project. |
| Rovo button missing | "Rovo is off for this site until an org admin turns it on." | Finish import and conversion. Book the summarise beat. Do not mark certification complete. |
| Import still spinning past a minute | "Large boards take longer than a minute. This one should not." | Use the PDF you already imported in rehearsal. Do not start a bulk ZIP. |

## Sources

Product behavior is the public support docs, not a private battle card:

- [Import to whiteboards from Miro, Mural, and Figjam](https://support.atlassian.com/confluence-cloud/docs/import-to-whiteboards-from-miro-mural-and-figjam/)
- [Import multiple Miro boards to Confluence](https://support.atlassian.com/confluence-cloud/docs/import-multiple-miro-boards-to-confluence/)
- [Integrate whiteboards into your Atlassian workflow](https://support.atlassian.com/confluence-cloud/docs/integrate-whiteboards-into-your-atlassian-workflow/)
- [Sticky notes, including Jira conversion](https://support.atlassian.com/confluence-cloud/docs/organize-and-explore-ideas-with-sticky-notes/)
- [Rovo in Confluence whiteboards](https://support.atlassian.com/confluence-cloud/docs/atlassian-intelligence-in-confluence-whiteboards/)

Single-board import and bulk import disagree on connectors. This script follows that split: connectors do not import on the live Vector PDF path, and they do map on the bulk path. Do not collapse those into one claim.
