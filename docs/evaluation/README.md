# SmartCards Groq evaluation

## Status

The [GPT-OSS 20B live run](groq-20261121T161604633914Z.md) passed its smoke
test and all six structural checks. The report preserves validated outputs and
an assistant rubric assessment. Independent human review remains pending.

**Decision:** continue evaluating GPT-OSS 20B. The batch supports technical
compatibility, while grounding and distractor issues require further review
before production selection.

## Corpus and execution

The [corpus](../../backend/evaluation/corpus.py) contains 12 original synthetic
passages across computer science, biology, and general science. Each passage
is built from a factual checklist, which also serves as its source reference.
Passages vary by topic and intentionally include short sources that can expose
repetition or unsupported questions at high counts.

The first batch covers both generation types at each supported count and
two passages per domain.

| Passage | Type | Count |
| --- | --- | ---: |
| algorithms | Flashcards | 5 |
| plant-cells | Quiz | 5 |
| heat-transfer | Flashcards | 10 |
| data-structures | Quiz | 10 |
| ecosystems | Flashcards | 15 |
| circuits | Quiz | 15 |

From `backend/` with the project's virtual environment active:

```bash
python -B -m evaluation.groq_eval
```

This prints the model and the cases without making requests. The default model
is the configured `AI_MODEL` or `openai/gpt-oss-20b` when unset. Use `--model`
to select a Groq model explicitly. For an authorized live run, load
`GROQ_API_KEY` into the backend environment and add `--live`.

```bash
python -B -m evaluation.groq_eval --live --budget 6
```

Each invocation allows 1–6 planned requests. Use `--offset` to inspect or
select another slice of the 72-case deterministic matrix. Review the plan
and account quota before choosing another batch. The command sends one
request per attempted case through the existing Groq adapter and stops on
credential, model access, quota, or rate-limit failures. It uses the existing
prompts, output limits, parser, and validators, with neither retries nor
provider fallback. It creates a timestamped Markdown report in this directory.
An exit status of 1 means at least one attempted case failed. Structural
success leaves quality review pending.

## Metrics

- Provider HTTP status and schema validation are recorded separately. A
  transport failure can have no HTTP status. Schema success means the
  production parser and validator accepted the output.
- When the completion is a decodable array, record the item count, excess
  exact duplicate questions after trimming, and the number of quiz items with
  exactly one matching answer option. These diagnostics can be available for
  schema failures. A dash denotes unavailable or inapplicable data.
- Record per-attempt elapsed time, median and nearest-rank p95, provider
  token usage when present, timeout codes, HTTP 429s, and provider-reported
  truncation. Compare the reported attempt counts, including
  skipped cases, before comparing batches.
- The report does not estimate an invoice. For a rough cost estimate, multiply
  measured input and completion tokens by the applicable account prices per
  token, then sum across attempts. Record the rate source, date, and coverage
  of any estimate. Check [Groq rate limits](https://console.groq.com/docs/rate-limits)
  and [model availability and pricing](https://console.groq.com/docs/models).

## Human review

Review the validated outputs against the report's reference facts. For every
item, mark each applicable criterion pass, fail, or uncertain, then record the
numerator, denominator, and any uncertainty separately for each criterion.

| Criterion | Pass when |
| --- | --- |
| Factual grounding | The source supports the question premise and correct answer. Qualifiers are preserved. |
| Clarity | The question is unambiguous and contains enough context to answer it. |
| Relevance | The question tests a meaningful fact in the passage. |
| Quiz distractors | All three are plausible, distinct in meaning, and clearly incorrect under the question. |
| Concept duplication | The response avoids repeat testing of the same fact through paraphrased questions. |

Flag questionable claims or ambiguous questions by case and item index.
Count uncertain items separately and exclude them from pass totals while
keeping them in the denominator. Automated duplicate and answer checks do
not measure paraphrases, factual truth, or whether another option could be
correct. Reviewers should record coverage of the source checklist as well as
item accuracy. The evaluator does not ask an LLM to grade its own output.

## Limitations

Six cases can reveal failures but cannot establish the plan's reliability
targets. The default batch tests different passages at different counts, so
it cannot isolate count effects. Repeat matched cases and review additional
passages before drawing a quality or latency conclusion. The passages are short
and synthetic, and do not represent every document layout or language.
Sampling varies across generations, and free-tier throttling or changing
model availability can affect results. If later runs reveal issues, record
whether they involve truncation, unsupported facts, or repeated concepts
before considering changes to prompts, output limits, or structured output.
