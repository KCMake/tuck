# Tuck: your voice at bedtime, even when you can't be there

*Working name. Built solo at Cal Hacks 13.0. Devpost deadline Sunday 2026-10-25, 9:00 AM. Judging 10:30 AM–12:30 PM with a live demo on a laptop.*

## Problem
Parents of toddlers who work nights, travel, are deployed or share custody regularly miss bedtime. For a 2–4-year-old, a parent's voice is part of what makes falling asleep feel safe, and on those nights it's missing. Today's workarounds need the parent free at that exact moment (a FaceTime call), or need the parent to record every story ahead of time (videos, or kids' audio players that accept parent recordings).

## Evidence
- Assumption: missing bedtime is frequent and painful for this group. Needs validation by texting 2–3 parents tonight (questions under Open Questions). Anthropic's track asks that you've lived the problem or talked to someone who has, so quote one of them in the pitch.
- Signal of demand: kids' audio players such as Toniebox and Yoto already let parents upload their own recordings. How many parents actually use that feature is an assumption that needs validation.

## Users
- **Primary**: a parent of a 2–4-year-old who misses bedtime on a regular schedule. For example a night-shift nurse, a first responder, a parent who travels for work, a deployed service member, or a co-parent on nights the child is at the other home. The trigger: "I won't be home for bedtime tonight."
- **In the room**: the caregiver doing bedtime (a partner, grandparent or sitter), who opens kid mode.
- **Not for**:
  - replacing a parent who is home
  - a child alone without a caregiver
  - general screen entertainment
  - cloning anyone's voice except your own

## Hypothesis
We believe **a new bedtime story each night, personalized with the child's day and told in the absent parent's own voice by a cartoon of that parent,** will **help toddlers settle and feel close to that parent** for **parents who regularly miss bedtime**.
We'll know we're right when **parents rate a Tuck bedtime as close to being there themselves, and caregivers report the child settling at least as fast as on a normal night**. Targets are TBD and need validation through a pilot with a few families after the hackathon.

## Success Metrics
| Metric | Target | How measured |
|---|---|---|
| First-time parent setup (voice and cartoon) | Under 3 minutes | Stopwatch during rehearsal |
| Parent effort for tonight's story | Under 30 seconds of typing | Stopwatch during rehearsal |
| Kid's tap to first spoken word | Under 1 second | Rehearsal on the demo laptop |
| Cloned voice is recognizable | 3 of 3 testers say it sounds like them | Clone 3 people at the venue |
| Story safety | 0 scary or off-limits elements in 10 generated stories | Read 10 stories against the content rules |
| Works without internet | Full kid-mode playback with Wi-Fi off | Rehearsal with Wi-Fi off |
| Real-world settling and closeness | TBD | Pilot after the hackathon |

## Scope
**MVP** (what must be true for the demo):
1. The parent records their own voice, starting with a spoken consent sentence, and gets a voice clone.
2. The parent makes a cartoon of themselves.
3. The parent enters tonight's details: the child's name, a comfort toy, one moment from today, and their usual goodnight words. They preview the story and can regenerate or edit it before approving.
4. The caregiver opens kid mode and the child taps the cartoon once. The story plays in the parent's voice, getting slower and quieter. The cartoon talks, gets sleepy, and the screen fades to a warm nightlight. It ends with the parent's own goodnight words, then soft background noise.
5. The parent can delete their voice at any time.
6. Kid mode keeps working if the venue Wi-Fi drops.

**Out of scope**
- Live conversation between an AI version of the parent and the child. An AI improvising as a parent in real time is much harder to keep safe than a story the parent has already previewed.
- A realistic face or lip-synced video. It reads as a deepfake and is too slow to generate.
- Accounts, multiple families and cloud storage. This is a single-family demo.
- A native mobile app. The demo runs on a laptop.
- Singing lullabies. Text-to-speech can't do it reliably.
- Languages other than English. The voice tone controls are English-only.
- Remote status for the parent ("asleep at 8:14"). That's stretch milestone 3, only if there's time.

## Delivery Milestones
| # | Milestone | Outcome | Status | Plan |
|---|---|---|---|---|
| 1 | A parent's voice puts a kid to bed | The full MVP flow above works on the demo laptop | in-progress | `.claude/plans/tuck-mvp.plan.md` |
| 2 | Ready for judges | Devpost submitted; README covers setup, Cartesia features used and known limitations; a 2-minute demo-first pitch is rehearsed; a backup demo video is recorded; cloning a judge live is rehearsed | pending | Scheduled inside the milestone 1 plan |
| 3 | Stretch: the parent stays connected from work | The parent's phone shows "story playing" and then "finished", and the parent can send a live goodnight | pending | — |

## Open Questions
- [ ] How do parents handle a missed bedtime today, and what goes wrong? Ask 2–3 parents tonight.
- [ ] Are parents comfortable with an AI-written story if they approve it first? Or would they rather reuse stories they've already approved? Ask the same parents.
- [ ] Could hearing a parent's voice while the parent is away confuse or upset a toddler? Ask parents now, and get child-development input after the hackathon.
- [ ] Does a clone recorded on a laptop mic in a loud venue sound like the person? Test this in the first hour.
- [ ] Should the cartoon be generated from a selfie, or built by the parent from options? This decides whether the app handles photos at all.
- [ ] What story length suits a 2-year-old versus a 4-year-old? The default is 3–4 minutes, to be confirmed with parents.

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Judges read it as replacing parents | Medium | High | Lead with "when you can't be there". The parent approves every story and writes their own goodnight words, and a caregiver is always in the room. |
| Someone clones a voice that isn't theirs | Medium | High | Every recording starts with a spoken consent sentence. Voices stay private, and deleting takes one click. |
| A story says something scary or untrue, like "I'll be home tomorrow" | Medium | High | Written content rules, plus the parent previews and approves before bedtime. |
| The screen keeps the child awake | Medium | Medium | The screen dims to a nightlight early on, and the audio carries the story. |
| A clone recorded in a noisy venue sounds wrong | High | High | Record somewhere quiet for 30–60 seconds, in a calm bedtime voice. |
| Venue Wi-Fi fails during judging | Medium | High | Prepare tonight's audio ahead of time and play it offline. Keep a backup video. |
| Running out of time building solo | High | High | The plan has a strict cut order. |

---
*Status: DRAFT. Requirements only. Implementation plan: `.claude/plans/tuck-mvp.plan.md`.*
