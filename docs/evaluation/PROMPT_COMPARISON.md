# Original and revised study prompts

## Evidence from Step 09

The [original live report](groq-20261121T161604633914Z.md) is the immutable
baseline. All six cases passed schema and count validation. The following
quality defects were visible in the assistant's item-level assessment.

| Defect | Representative evidence | Revision |
| --- | --- | --- |
| Unsupported facts and assumptions | Ecosystems 8–9 named energy sources and starting materials absent from the passage. Circuits 12 assumed the node voltage stayed fixed after a branch was removed. | Require the source to support every premise and correct answer. Preserve conditions and qualifiers, including in application questions. |
| Concept repetition and missed coverage | Heat transfer 2/8 both asked about fluid motion and 4/9 both asked about radiation through a vacuum. Data structures 5/7/9 repeated queue ordering and missed the state-preserving behavior of peeking. | Cover distinct important concepts first. For short passages, use different supported relationships, comparisons, or applications without inventing facts. |
| Ambiguous answers | Plant cells 2 asked broadly about support. The cell wall and central vacuole both contribute. Circuits 9 failed to specify enough about the circuit to identify a single suitable component. | Require a clear stem and one defensibly correct option under the stated conditions. |
| Implausible or equivalent distractors | Data structures 7 used both “Most recently added” and “Last added”; item 9 used “None”. Circuits 6 offered an option comparing voltage with twice the current. | Use plausible alternatives of the same kind that are distinct in meaning and clearly wrong under the stem. |
| Misleading terminology and scope | Plant cells 1 called the cell membrane an organelle. Algorithms 1 implied linear search works only on unsorted lists. | Preserve the source's scope and qualifiers and write self-contained questions and answers. |

These failures are consistent with the original prompts specifying format
and item count while giving little guidance about evidence, concept coverage,
and distractors. The structural validator can detect exact duplicates and
literal answer mismatches. It cannot verify grounding or distinguish
semantically equivalent options. Model variability and short passages also
limit how much can be attributed to the prompts from a single batch.

## Paired evaluation

The revised system prompts are available through the evaluation CLI. The Flask
routes still use the original prompts. Both versions use the same user
message, exact item count, JSON fields, parser, validators, and Groq settings.
The original remains selectable with `--prompt-version original`. No model,
timeout, completion cap, or deployment change is proposed.

From `backend/`, inspect both plans. After explicit authorization, an
operator with confirmed account quota can repeat these commands with
`--live`. Each live invocation sends at most six requests and requires
`GROQ_API_KEY`. No automatic retry or provider fallback is used.

```bash
python -B -m evaluation.groq_eval --model openai/gpt-oss-20b --offset 0 --budget 6 --prompt-version original
python -B -m evaluation.groq_eval --model openai/gpt-oss-20b --offset 0 --budget 6 --prompt-version revised
```

Use the same cases, account, model, and settings for both arms. The historical
original run supplies context; a fresh original arm controls for changes in
provider behavior between dates. If quotas stop an arm, report completed and
skipped cases and compare only the matched cases. Keep failed cases in
structural success denominators.

## Review and decision

1. Make review copies of the saved outputs and reference facts. Hide prompt
   versions, timestamps, metrics, and earlier scores. Randomize A/B order
   independently for each matched case and keep a private mapping until
   scores are submitted.
2. Ask an independent human reviewer to score both outputs for each matched
   case using the [same rubric](README.md#human-review). Record per-item
   pass/fail/uncertain labels for grounding, clarity, relevance, and distractors.
   Mark repeat concepts and tally distinct checklist facts covered. Include
   both 15-item cases if available so the review tests sparse-source behavior.
3. Unblind and compare the arms by case and criterion. Report automated
   schema/count/latency/token results, assistant assessments, and independent
   human assessments separately. Include denominators, missing cases, and
   uncertain judgments. Pay particular attention to unsupported material and
   semantic repetition alongside exact item counts.

| Metric | Original historical run | Revised |
| --- | --- | --- |
| Automated schema validity and exact counts | 6/6 each | 1/1 returned completion; five attempts yielded no output |
| Median / p95 latency, all attempts | 1.546 s / 2.595 s | 20.065 s / 20.327 s |
| Input / completion tokens, ecosystems only | 218 / 909 | 307 / 2,974 |
| Grounding, assistant assessment, ecosystems only | 9/15 | 14/15 |
| Distractors, assistant assessment | 16/30 pass, 14 fail | No revised quiz output |
| Concept diversity, ecosystems only | All seven source facts covered; repetition observed | All seven source facts covered; repetition persists |
| Independent human assessment | Pending | Pending |

The [revised run](groq-20261122T145113917060Z.md) saved its one valid response
and all six attempt records. The [blind review packet](BLIND_REVIEW_ECOSYSTEMS.md)
contains the only matched pair. Keep the original prompts as the default
until broader paired evidence and independent review are available.
