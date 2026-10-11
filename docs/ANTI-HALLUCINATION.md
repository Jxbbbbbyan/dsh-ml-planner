# ANTI-HALLUCINATION — eight mechanisms, and the real incidents that produced them

> **中文摘要**：本文写的是 `dsh-ml-planner` 如何**减少** AI 幻觉 —— 八条机制，每条配**本项目真实发生过的
> 案例**（带源文件与行号，可回源核对）。案例不是比喻，不是构造，是这套规则被写下之前**先发生过的事故**。
> 凡本文给出的数字，均可按括号里的路径自行复核。

Eight mechanisms. Each one exists because something actually went wrong first. The cases below are quoted from
the project's own evidence files, with file and line, so you can check every one of them yourself.

A note on honesty, since the subject is honesty: **where I could not reproduce a claim, I say so instead of
repeating it.** Two numbers that circulate in the project's own spec turned out not to survive my re-check; they
are marked **[corrected]** below and the measured value is given instead.

---

## 1. Never guess content from a title or an abstract — open the artifact

**The mechanism.** A title is a marketing artifact. Any sentence about what an article *says* must be backed by
having opened the artifact and looked. Titles, abstracts, README summaries and package metadata are **leads**, not
evidence.

**The incident.** The corpus contains an article whose title is:

```
讲透200个机器学习模型：随机森林、XGBoost、LSTM、Transformer ... ！！
3942513879_2247501909_1 · 2026-08-10
wechat-corpus/articles_tex/3942513879_2247501909_1.json
```

The title promises depth on four named models. Opening the artifact:

| Measured on the artifact | Value |
|---|---|
| `text_chars` | **2,511** |
| `formulas` | **0** |
| `code_blocks` | **0** |
| `images` | **7** |
| occurrences of `随机森林` in the body | **4** |
| occurrences of `XGBoost` in the body | **3** |
| occurrences of `LSTM` in the body | **1** |
| occurrences of `Transformer` in the body | **1** |

**[corrected]** The project's own spec phrases this as "the body says not one word about those 4 models". That
overstates it: the names **do** occur — but **only as bare entries inside the promotional list** ("1. 回归算法 /
线性回归 / Ridge 回归 / …"). There is no explanation, no formula and no code for any of them. The opening 900
characters are sales copy: "小报童", "目前，已经超2700读者！", "优惠券后，到手49.9".

**The failure the rule prevents.** Write the brief from the title alone and you would credit this article with
teaching four algorithms it never explains — inventing algorithmic content that does not exist, inside a document
whose whole purpose is to prevent exactly that.

**Same class, a different article.** `chatdump/extract_A1.md:350` records a second instance:

> **标题与正文不匹配**：标题主打"用 Codex 写 LightGBM 代码"，正文**零处**提及 Codex 或 AI 辅助编码。标题更像钓鱼式的对话体包装。

**Copy this practice.**
```powershell
# Never summarise a document you have not opened. Measure it instead.
$j = Get-Content 'wechat-corpus\articles_tex\3942513879_2247501909_1.json' -Raw -Encoding UTF8 | ConvertFrom-Json
"title      : $($j.title)"
"text_chars : $($j.text_chars)   formulas: $($j.formulas.Count)   code_blocks: $($j.code_blocks.Count)"
foreach ($t in '随机森林','XGBoost','LSTM','Transformer') {
  "{0,-12} in body = {1}" -f $t, ([regex]::Matches($j.text, [regex]::Escape($t))).Count
}
```

---

## 2. ⭐ To settle a suspicion, count in the source — do not reason harder

**The mechanism.** When you suspect a defect, you have two options: build a bigger argument, or go to the raw
data and **count**. Counting settles the question; argument only postpones it. The project wrote **13 dedicated
`check_*` / `probe_*` / `verify_*` scripts** in `recon/` for precisely this — the scripts *are* the mechanism, and
they are the reason the claims below are trustworthy.

> *"Structured suspicions are settled by counting. Do not cover one act of reasoning with another act of reasoning."*

Five real instances, all in `recon/`:

### 2a. "Is the missing whitespace the source's fault or my extractor's?" — `recon/where_did_the_space_go.py`

The docstring states the decision rule and, crucially, **what is forbidden if the answer goes one way**:

> 判定「def 后无空格」是微信 HTML 本身如此，还是我的清洗弄丢的。
> * 若原始 HTML 里就是 `defgenerate_...` ⇒ 微信自己的渲染如此，我的抽取是**忠实的**。
>   **此时「补空格」属于编造内容，绝不能做**；只能如实标注「原文即无空格」。
> * 若原始 HTML 里是 `def generate_...` 而被我弄丢 ⇒ 我的清洗逻辑有 bug，必须修。

`recon/confirm_space_origin.py` then tightened it: it re-fetched the **uncleaned** raw inner HTML, because seeing
the symptom in an *escaped copy* did not prove it existed in the region actually extracted from.

**This is the whole mechanism in one file: the question is not "which answer is nicer", it is "what am I forbidden
to do if the answer is X".** If the source really has no space, then "fixing" it is fabrication.

### 2b. "Is `2247501785_1` a duplicate, and what does that do to my headline number?" — `recon/check_duplicates.py`

> B2 发现正文逐字相同的重复投放（`2247501785_1` ↔ `2247501882_1`），以及同一课程三次投放。
> 这直接影响「266 篇」应当如何表述 —— 若存在大量重复，则「266」是**投放数**而非**独立文章数**。

Counting turned a vague worry into a definition: **266 = postings, 229 = distinct articles**
(`wechat-corpus/index/CANONICAL.json`: `total_postings = 266`, `distinct_canonical = 229`). Both numbers are now
stated everywhere with their meaning attached, instead of one number quietly doing two jobs.

### 2c. "Are the formula placeholders broken, and how far does the damage spread?" — `recon/check_tex_markers.py`

A subagent had found a broken placeholder. Instead of reporting "formulas are unreliable", the script compared
**every** formula's true value against the text and located the mechanism:

> 抽取器**先**把占位符换成 `[[TEX: <latex>]]`，**后**才跑标签剥离 `TAG = re.compile(r"<[^>]+>")`。
> 于是 LaTeX 里的**不等号 `<`** 被当成标签开头，一路吃到文档后面某处的 `>`，把中间正文一起删掉。
> ⇒ **只有含 `<` 的公式会中招**；只含 `>` 的不会（正则要先遇到 `<`）。
> ⇒ `formulas` 数组**未受影响**（真值一直正确），受损的只是 `text` 的就地语境。

A vague alarm became a **bounded, mechanistically explained** defect — and the fix scope became obvious. The
script also separates "unrecovered" from "corrupted", because conflating them was itself an earlier error.

### 2d. "Are the image hashes wrong, and is it extraction or note-writing?" — `recon/repair_sha_typos.py`

Strict three-way test, **all three required before touching anything**:

> 1. 该 12 位 hex 不在本文真实图集合里
> 2. 该 12 位 hex **也不在任何其它文章**的图集合里（⇒ 不是合法的跨篇引用）
> 3. 它与**本文某张真图**的 sha 只差 **1 个字符**（⇒ 是转写手误）
> 三条全满足才替换，并把替换记录留档。**其余一律只报告、不改。**

Result: the corruption was **transcription error in the notes layer** (`f→1`, `5→c`), **not** an extraction defect.
The original notes are backed up first (`wechat-corpus/_notes_backup_pre_sha_repair`), so every change is reversible.

### 2e. "The extracted text repeats itself three times — is the extractor broken?" — `recon/body_probe.json`

The suspicion was duplicate extraction. The response was a **probe against the raw HTTP body**, not a guess:

```json
{ "ok": true, "http_bytes": 3816502, "js_content_found": true,
  "text_chars": 8301, "image_count": 6, "code_tag_count": 6, "has_pre": true }
```

And for the article that genuinely does repeat three times, the project's note
(`wechat-corpus/notes/3942513879_2247500642_1.md:118`) **corrected its own statistics rather than the corpus**:

> **应避开的坑（本文自证）**：**语料被完整重复 3 遍、代码块重复 4 遍**（45439 字 vs 实际约 15000 字）……
> 本笔记的规模统计据此校正。

That is the discipline in its final form: when counting shows the source is the way it is, **you fix your number,
not the source.**

**Copy this practice.** Before writing any claim of the form "there are N of X, and M are broken", write the
counter first:
```powershell
# A bounded claim needs a numerator AND a denominator, both counted.
$tot = 0; $bad = 0
Get-ChildItem 'corpus\articles_tex' -Filter *.json | ForEach-Object {
  $t = Get-Content $_.FullName -Raw -Encoding UTF8
  $tot += ([regex]::Matches($t, '\[\[TEX:')).Count
  $bad += ([regex]::Matches($t, '\*\{')).Count
}
"markers=$tot  suspicious=$bad   -> state BOTH, or state neither"
```

**[corrected]** The spec says the `*{` suspicion was settled as "1 out of 6,034". I re-ran it and cannot reproduce
either number. Measured across the **266** files in `wechat-corpus/articles_tex/`: **6,120** `[[TEX:` markers and
**10** occurrences of `*{`, confined to **3** posting files — which are **2 distinct articles**, because
`2247500619_1` (2026-06-04) and `2247501560_1` (2026-07-23) carry the same title. The documented conclusion in
`wechat-corpus/notes/3942513879_2247501815_1.md:348` matches my reading of the shape, not the count:

> `\mathcal{L}*{task}`／`*{div}` 疑为原式 `_{task}`／`_{div}` 的下划线被转成星号（抽取痕迹）；
> 本次按真值逐字照抄，未修正，建议人工确认。

**So: the suspicion was confined to a handful of occurrences, not a systemic defect — but the figure "1 of 6,034"
is not supported and is not repeated here.** (`reextract_stats.json` reports `formulas: 6034`, a different
denominator from the 6,120 `[[TEX:` markers I counted; the two are not interchangeable.)

---

## 3. Separate "what the source claims" from "what was externally measured"

**The mechanism.** Cite the **primary** source — the paper, the official documentation, **the source code** — to
settle a factual question. A second-hand blog does not outrank the implementation.

**The incident.** A popular article taught LightGBM. The project settled its claims against LightGBM's **own
implementation** and its **official release notes**, and produced a hard verdict
(`chatdump/extract_A1.md:224`):

> | **【不准确或有误导】** | **5** | A16（Gain 公式是 XGBoost 的、缺 1/2 与 γ 语义）、A21（验证 vs 测试判过拟合是归因错误）、A28（`early_stopping_rounds` 在 ≥4.0 已移除/非文档化）、A29（二分类误用 `class_weight="balanced"`，且与概率校准冲突）、A31（"GOSS+EFB 在加速"但示例代码里两者均未启用） |

Two of those five, and how each was settled:

**A16 — the gain formula has a `1/2` that LightGBM does not use** (`extract_A1.md:196`):
> 该式是 **XGBoost（Chen & Guestrin 2016）论文的精确写法**（含 `1/2` 与 `−γ`）。**LightGBM 的实际实现不是这个式子**：源码 `GetLeafGain` 返回 …

**A28 — an API removed in 4.0 was still being taught** (`extract_A1.md:280`):
> 官方 v4.0.0 Release Notes 明确 `[python][sklearn] Remove early_stopping_rounds argument of fit() method` …

And the discipline of **declaring the limit of the method** (`extract_A1.md:333`) — this is what keeps the finding
from becoming a new hallucination:
> 凡是"这段代码在新版 LightGBM 上是报错还是静默生效"的问题，我只能给出**静态证据**（源码 + Release Notes），
> 不能给出**运行实测**。A28 的判定因此被严格限制为"该 API 已被移除/已非文档化"，而**不是**"运行必然报错"。

**The cross-domain lesson — "the mechanism has a name" ≠ "the mechanism is on".** A31 is the most transferable
finding of the whole exercise: the article described GOSS and EFB as accelerators, and **the example code enables
neither**. A reader who trusts prose wastes hours wondering why their speedup never arrives. **Read the
configuration, not the description.** This single case is why the rule catalogue requires the *engineering landing*
to be checkable rather than asserted.

**Copy this practice.** Rank your sources before you argue from them:

| Confidence | Source | Ranking |
|---|---|---|
| **High** | primary paper · official spec · **source code** · official release notes | settles the question |
| **Medium** | survey · textbook chapter · maintained documentation | supporting |
| **Low** | lecture slides · tutorial blog · forum answer | a lead; verify elsewhere |

and then **state the bound on your own method**, as A28 does: "static evidence only — this does not establish
runtime behaviour."

---

## 4. A partial read cannot license a universal conclusion

**The mechanism.** "I did not see X" is not "X is not there". Any claim of the form "there is no / all / none" is
a **coverage** claim, and coverage must be *measured*, not assumed.

**Two incidents, both real.**

**4a — "the text contains no Transformer anywhere".** A sibling agent saw the first part of a 21-chapter article
and asserted the article never mentions Transformer. Recorded at
`chatdump/extract_I2.md:198`:

> **图 1~7 那批的兄弟代理断言「正文通篇无 Transformer」** | **该断言在正文侧是错的（已确认）** |
> 正文第 21 章「神经网络」14 条中**第 11 条即 `Transformer`** … 该代理只看到 200 条中的 118 条

The article is **21 chapters / exactly 200 items** on disk (`chatdump/extract_I2.md:16`), of which chapters 1–11
hold **118** items and chapters 12–21 hold **82**. The agent generalised from 118 of 200 and got it wrong.

**4b — "the range is right, therefore coverage is complete".** The same file reports the author's *own* error
(`extract_I2.md:199`):

> **范围对，但「完整覆盖」不成立 —— 高风险误判** … 图 7 只读到第 11 章的第 6 条 `特征构造`（位于约 91% 高度且被底栏裁切）。
> **故第 11 章第 7~12 条不在图 1~7 内**：`降维`、`数据增强`、`数据平衡`、`数据编码`、`数据拆分`、`数据转换`

A correct *boundary* was mistaken for complete *coverage*. The correction path is documented too: the note
distinguishes what was seen from what was inferred, and `IMAGE_READ_AUDIT.md` keeps the explicit **"未看全"**
markers rather than quietly upgrading them.

**Copy this practice.** Every "there is no X / all X / no X exists" claim must state its denominator:
```
Claim:  "no Transformer in the text"
  → denominator: 200 items / 21 chapters
  → actually read: 118 items        ← coverage 59 % — cannot support a universal claim
```
If coverage < 100 %, write **"not found in the portion read"** and name the portion.

---

## 5. A successful download is not a successful read — open it

**The mechanism.** Download is not retrieval. A file can arrive intact and still be worthless. Verify by
**opening**, not by exit code.

**Two incidents, both documented in `chatdump/`.**

**5a — a paper ID guessed from memory was a different paper** (`chatdump/refs_downloaded.md:347`):

> arXiv:1804.05307（按记忆猜的 "PSO survey" ID） | 下载并抽取后发现实际是《Hyperspectral Super-Resolution:
> A Coupled Tensor Factorization Approach》，与主题完全无关 → **已删除，未计入清单**
> （此例正说明"下载后必须打开确认"）。真正的 PSO 综述改由 R12 承担

Note the resolution: the reference was **deleted and not counted**, and the gap was filled by a different,
genuinely located source. The count was not padded.

**5b — a PDF that downloaded perfectly and rendered blank** (`chatdump/REF_ANALYSIS.md:121`):

> 结果：**HTTP 下载成功**（1,043,224 B，魔数 `%PDF-`，6 页），**但内容无法确认**——pdfjs 只能抽出 JSTOR 封面页文本；
> 把第 3 页渲染为 PNG（989×1308）后目视为**纯白空页**，判定为空扫描/损坏件，**已删除**。

Every cheap check passed: HTTP 200, **1,043,224 bytes**, correct `%PDF-` magic, **6 pages**. Only rendering a page
and *looking at it* revealed it as a blank scan. Downstream consequence, recorded at `REF_ANALYSIS.md:898`:
any citation of that work would have been **a citation of something that does not exist**.

**The check that makes this cheap — magic-number validation** (`refs_downloaded.md:69`):
> **魔数校验**：读前 8 字节判定 `%PDF-` / `<!DOCT`，直接抓出 3 个"扩展名是 .pdf 但内容是 HTML"的假下载

**Copy this practice.**
```powershell
# Magic-number check: cheap, and it catches the fake .pdf immediately.
Get-ChildItem .\refs\*.pdf | ForEach-Object {
  $b = [System.IO.File]::ReadAllBytes($_.FullName)[0..4]
  $magic = -join ($b | ForEach-Object { [char]$_ })
  "{0,-46} {1,10} B  magic={2}  {3}" -f $_.Name, $_.Length, $magic,
    $(if ($magic -ne '%PDF-') { '<-- NOT A PDF' } else { 'ok' })
}
# Then: open it. A correct magic number on a blank scan is still a blank scan.
```

---

## 6. Subagents must self-check their own tooling before concluding anything

**The mechanism.** A subagent that lacks a capability must **report the missing capability**, never substitute a
guess for it. "I could not see the figure" is a finding. Inventing a caption is a hallucination.

**The incident.** Batches of subagents were reading figures. Some did not inherit a vision channel. Their report,
quoted in `wechat-corpus/index/IMAGE_READ_AUDIT.md:5`:

> **背景**：R3 诚实报告 —— 子代理**不一定继承视觉通道**；它的一批只有 OCR、一批无视觉工具。

This was **accepted as a finding, not overridden** — the audit then maintains explicit markers for notes that were
read by OCR only ("强未读标记（OCR / 无视觉 / 未能读取 / 未看全）", `IMAGE_READ_AUDIT.md:8`). The follow-up round
re-verified with a real channel and **tested the channel first, before using it**
(`wechat-corpus/index/IMAGE_REREAD_IM.md:5`, `:87`):

> 视觉通道**在开工第一件事就被实测**（先真的调了一次 `read_image` 看到像素），**不存在「用 OCR 或猜测代替视觉」的情况**
> 视觉通道：开工第一步真的调用了 `read_image` 并看到像素（第一张即 `c50ea679a6d9`，一张 Prophet 分解图），
> 据此确认通道可用后才继续。

And the re-read was **worth it** — it found real corrections, not mere confirmations
(`IMAGE_REREAD_IM.md:16`):
> `2247500921_1` | OCR | **补看后获真读数**（§8 整体重写，原清单 5/8 项根本不是本篇的图）

**Copy this practice.** Make every figure-reading agent print its channel check *before* its findings:
```python
# First action of any figure-reading task: PROVE the channel, then use it.
# If read_image is unavailable, that is the deliverable — report "no visual channel",
# and do NOT substitute OCR, a cached description, or an inference for what the figure shows.
```
The rule to state out loud: **a missing capability is a reportable result; a fabricated observation is not a
result at all.**

---

## 7. Machine checks outrank self-reports — including the machine's own

**The mechanism.** "I read it" and "it is complete" are **self-reports**. Verification must be independent of the
thing being verified. The failure mode is not lying — it is **counting existence instead of content**.

**The incident.** The project's own progress scripts decided whether an article had been read by checking
**whether the note file existed**. Recorded in `recon/check_note_integrity.py`:

> == 为什么必须做 ==
> 我的 `batch_progress.py` 与 `status_report.py` 判「这篇读了没有」都只看
> `notes/<月>/<key>.md` **是否存在**。于是 `3942513879_2247501933_1` 的笔记是
> **0 字节空文件**却被计为「已读」。
> 这与先前查出的另一处是**同一类错误**：`articles_tex` 某篇 `text` 为 0 字符却有图片，
> 而 `verify_corpus.py` 只看存在性 ⇒ 漏检。

**A zero-byte file passed a completeness check and was counted as read.** The fix was to check *content* with
objective criteria (empty file → failure; no `## N.` sections and not a pointer note → draft; source ≥ 2,000 chars
while note < 400 bytes → suspected draft), producing `index/NOTE_INTEGRITY.md`. Current result: **0** empty files,
**0** drafts, **2** legitimate pointer notes, **264** passing notes out of **266** note files.

**And the checks are shipped in the repository itself**, so a reader does not have to take any of this on trust:

| Check | What it verifies |
|---|---|
| `preset/scripts/selftest.mjs` | **45 checks**, exit 0 measured — band classification, guidance, session-log reading under two Session API shapes, tool-face narrowing, `run_plan_subagent`'s read-only deny filter |
| `preset/scripts/validate_preset.py` | structure: skills, references, state helper, composition rows |
| `preset/scripts/verify_integrity.py` | **L1** upstream baseline · **L2** copy fidelity · **L3** manifest self-consistency, against a 17-row hash manifest |

**The 0-byte incident is why the rules in `ml-discipline-rules.md` demand machine-checkable criteria.** Every one
of the 94 rules carries a **判定方式 (how it is judged)** field; where an assertion is possible the rule gives one
(`assert scaler.n_samples_seen_ == len(X_train)`, `assert auc >= 0.5`, a `boundary_hit: true` field), and where
none is possible the rule says so and demands an explicit human criterion instead — *"不接受'看起来没问题'"*.

---

## 8. Provenance discipline — every claim carries a key

**The mechanism.** A claim that cannot be traced cannot be checked, and a claim that cannot be checked is
indistinguishable from a guess. So every rule cites the corpus item it came from, by key, and **an unsourced
scale claim is not allowed to exist at all.**

**Measured in this repository** (`preset/skills/ml-modeling-plan/references/ml-discipline-rules.md`, 193,510 B):

| Property | Measured |
|---|---|
| Rules | **94** |
| Rules carrying **at least one** corpus key | **94 / 94** |
| Rules carrying a `语料反例（带 key）` (counter-example) field | **94 / 94** |
| Key occurrences in the file | **291** |
| Distinct keys referenced | **114** |
| Rules carrying a `正例（带 key）` (positive example) field | **39 / 94** |
| Rules carrying all six mandatory fields | **94 / 94** |

Key format: `3942513879_<msgid>_<itemidx>`, resolvable back to `wechat-corpus/`. Every rule additionally carries a
**机理 (mechanism) → 工程落地 (engineering landing) → 判定方式 (how to judge) → 违反的后果 (consequence of
violation) → 语料反例 (counter-example with key)** chain, so a reader can follow any rule back to the incident
that produced it.

**Copy this practice.** If you cannot produce the key, do not produce the number. The rule that enforces this in
this repository: **no scale claim may appear without a key.** It is the reason "[corrected]" markers appear in this
very document — two figures in the project's own spec did not survive re-checking, and the honest response was to
correct them in place, in public, with the measured values.

---

## What all eight have in common

They are not eight tips. They are one rule applied eight times:

> **Make the claim falsifiable, then go and try to falsify it — and when the count disagrees with the story,
> change the story.**

That is why this repository ships its checkers (`selftest.mjs`, `validate_preset.py`, `verify_integrity.py`) and its
rule keys. You are not asked to believe the claims above. You are given the paths to check them.

### Where the limits are

- **The corpus figures are magnitudes, not constants.** The pipeline reference states plainly that the numerical
  examples below the rule files are warning magnitudes measured on one corpus, and must not be treated as constants
  for your data.
- **One claim in this project's own spec did not survive review** and is marked `[corrected]` above — the `*{`
  count. The mechanism it illustrated is real and independently documented; the number was not reproducible.
- **This document's own counts are reproducible** with the commands given, on the corpus as it stands. If they
  drift, the measurement wins.
