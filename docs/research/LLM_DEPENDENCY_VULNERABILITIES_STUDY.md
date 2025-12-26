# An Empirical Study of Vulnerable Package Dependencies in LLM Repositories

**Authors:**
- Shuhan Liu (Zhejiang University, Hangzhou, China)
- Xing Hu (Zhejiang University, Ningbo, China) - *Corresponding author*
- Xin Xia (Zhejiang University, Hangzhou, China)
- David Lo (Singapore Management University, Singapore)
- Xiaohu Yang (Zhejiang University, Hangzhou, China)

**Data Sources:** Snyk.io, Libraries.io, GitHub
**Study Scope:** 52 open-source LLMs

---

## Abstract

Large language models (LLMs) have developed rapidly in recent years, revolutionizing various fields. Despite their widespread success, LLMs heavily rely on external code dependencies from package management systems, creating a complex and interconnected LLM dependency supply chain. Vulnerabilities in dependencies can expose LLMs to security risks.

While existing research predominantly focuses on model-level security threats, vulnerabilities within the LLM dependency supply chain have been overlooked.

### Key Findings

- **Half of vulnerabilities remain undisclosed for more than 56.2 months** - significantly longer than the Python ecosystem
- **75.8% of LLMs include vulnerable dependencies** in their configuration files
- Denial of Service (DoS) is the most prevalent vulnerability type
- Machine Learning packages account for 91.1% of all reported vulnerabilities

---

## 1. Introduction

LLMs rely extensively on reusable external code distributed via package management systems like PyPI. This extensive dependency establishes a complex web of interconnected dependencies—the **LLM dependency supply chain**.

### The Gap

Current security studies mainly address:
- Adversarial attacks
- Data extraction risks
- Generation of harmful outputs

These neglect the broader supply chain vulnerabilities.

### Research Questions

| RQ | Question | Key Finding |
|----|----------|-------------|
| **RQ1** | What are the characteristics of LLM dependencies? | Only 11% of packages appear in >10 repositories; 60.1% used only once |
| **RQ2** | What are the vulnerabilities in the LLM dependency supply chain? | 75.8% of LLMs have vulnerable dependencies; median 56.2 months to disclosure |
| **RQ3** | How are vulnerabilities addressed in practice? | Only 17.3% of LLMs have vulnerability-related PRs; 79% involve dependency updates |

---

## 2. Background

### Vulnerability Lifecycle

Four main stages:

1. **Introduction:** Vulnerability first introduced in affected package (first affected version release)
2. **Discovery:** Vulnerability identified through internal testing or external research
3. **Fix:** Vulnerability fixed with release of first non-vulnerable version
4. **Disclosure:** Vulnerability publicly disclosed on platforms like NVD or Snyk

### Data Sources

- **Snyk Vulnerability Database:** CVE ID, CVSS score, CWE, affected versions, disclosure time
- **Libraries.io:** Package metadata, version histories, dependency relationships from PyPI

---

## 3. Data Collection

### 3.1 Open-Source LLMs

**52 LLMs identified** from:
- Systematic GitHub search based on Hou et al.'s review of 395 papers (72 LLMs)
- Supplementary Google searches for popular models (ChatGLM, Qwen, etc.)

| LLM Type | Count | Avg Packages | With Requirements | Median Stars |
|----------|-------|--------------|-------------------|--------------|
| Decoder-Only | 30 | 41 | 20 | 7,155 |
| Encoder-Decoder | 12 | 34 | 4 | 1,257 |
| Encoder-Only | 10 | 37 | 6 | 2,447 |
| **Total** | **52** | **39** | **30** | **5,188** |

### 3.2 Python Packages Identified

- **482 distinct packages** total
- 94 standard library packages
- 388 non-standard (PyPI) packages

### 3.3 Vulnerabilities Collected

- **890 LLM dependency supply chain vulnerabilities**
- Data from Snyk.io including CVE, CWE, severity, affected versions

### 3.4 Community Activity

- **914 merged vulnerability-related PRs** analyzed
- **100 real LLM vulnerabilities** identified through manual labeling
- Kappa coefficient: 0.859 (near-perfect agreement)

---

## 4. RQ1: Dependency Characteristics

### 4.1 Usage Patterns

**Highly unequal distribution (Gini coefficient: 0.63):**

| Usage Frequency | Percentage of Packages |
|-----------------|----------------------|
| Used only once | 60.1% |
| Used >10 times | 11% |
| Used >40 times | Core packages (json, os, torch) |

### High-Frequency Packages

- Present in >75% of LLMs
- Median star count: **19,211** (vs 639 for low-frequency)
- Mann-Whitney U test: statistically significant difference (p = 0.0043)
- Cliff's delta: 0.3171 (moderate effect)

### 4.2 Domain Distribution

**Top Package Categories:**

| Category | Package Count |
|----------|---------------|
| Data Processing | 25 |
| Machine Learning Tools | 14 |
| System Environment | 13 |
| ML Models + Frameworks | 18 |
| Networks (Web + Requests) | 11 |

### Architecture Differences

- **Decoder-Only:** Broader "Networks" packages (real-time generative tasks, conversational AI)
- **Encoder-Decoder:** Minimal networking (offline tasks like translation)
- **Encoder-Only:** Limited diagnostics/efficiency packages (understanding/classification focus)

---

## 5. RQ2: Vulnerabilities in LLM Supply Chain

### 5.1 Vulnerability Trends

**Timeline:**
- Infrequent before 2019
- Surge after 2019: 78 in 2020, peaked at **239 in 2021**
- 2021 peak: 84% (200/239) from single package (TensorFlow)
- Decline after 2021, but affected packages continue to rise

### Severity Distribution

| Severity | Percentage |
|----------|------------|
| Medium | 47.75% |
| High | 30.21% |
| Low | 17.54% |
| Critical | 4.50% |

### Version Impact

- Median total versions per vulnerable package: **155**
- Median affected versions: **99**
- **87.5%** of package versions in vulnerable packages are affected

### 5.2 Vulnerability Types

**Top 10 Vulnerability Types:**

| Type | Total | Critical | High | Medium | Low |
|------|-------|----------|------|--------|-----|
| DoS | 262 | 1 | 46 | 146 | 69 |
| Out-of-Bounds | 62 | 1 | 37 | 12 | 12 |
| Buffer Overflow | 53 | 2 | 17 | 10 | 24 |
| Information Exposure | 50 | 1 | 6 | 33 | 10 |
| NULL Pointer Dereference | 46 | 0 | 19 | 18 | 9 |
| Improper Input Validation | 41 | 0 | 15 | 21 | 5 |
| XSS | 30 | 0 | 1 | 28 | 1 |
| Arbitrary Code Execution | 29 | 9 | 15 | 5 | 0 |
| Directory Traversal | 29 | 1 | 13 | 11 | 4 |
| ReDoS | 24 | 0 | 9 | 15 | 0 |

### Package Category Vulnerabilities

- **Machine Learning packages:** 91.1% of all vulnerabilities
- Median: 7 vulnerabilities per package
- Dominated by DoS (206), Out-of-Bounds (57), Buffer Overflow (51)

### 5.3 Vulnerability Lifecycle

**Time from Introduction to Disclosure:**
- **Median: 56.2 months (4.7 years)**
- Critical vulnerabilities: shortest survival time (prioritized)
- Long-tail distribution: some remain undiscovered for >10 years

**Fix Status:**

| Status | Percentage | Notes |
|--------|------------|-------|
| Fixed Before Disclosure | 68.9% | Best case |
| Fixed After Disclosure | 28.0% | Median fix time: 25 days |
| Never Fixed | 3.1% | Associated with less popular repos |

**Severity vs Fix Timing:**
- Critical: shortest median fix time (15 days)
- Low severity: 73.6% fixed after disclosure (chi-squared p < 0.0001)

**Project Popularity and Fix Status:**
- Fixed vulnerabilities: median 63,144 stars, 15,522 forks
- Unfixed vulnerabilities: median 13,079 stars, 2,602 forks

### 5.4 Impact on LLMs

**Key Statistics:**
- **75.8%** (25/33) of LLMs with dependency configs have vulnerable dependencies
- **23.2%** of specified dependency version ranges are affected
- Strict constraints (==): 19.8% vulnerable
- Loose constraints (>=, <): 28.5% vulnerable

**Vulnerability Concentration:**
- Gini coefficient: **0.81** (highly imbalanced)
- Top 3 packages (TensorFlow, Django, Ansible): **71.01%** of all vulnerabilities
- These represent only 5.8% of packages with vulnerabilities

**Most Vulnerable Dependency:**
- `transformers`: 82% (18/22) of specified versions contain vulnerabilities

---

## 6. RQ3: Community Activity

### 6.1 Vulnerability-Related PRs

- Only **17.3%** (9/52) of LLMs have vulnerability-related PRs
- **79%** of these PRs involve dependency updates
- **50%** of package updates occur within 11 days of vulnerability-free version release

### 6.2 Vulnerability Types in PRs

**Distribution of CWE Types:**

| CWE Type | Percentage |
|----------|------------|
| Improper Check or Handling of Exceptional Conditions | 36% |
| Improper Neutralization | 17% |
| Improper Control of Resource | 12% |
| Protection Mechanism Failure | 10% |

### 6.3 Fixing Patterns

**How vulnerabilities are fixed:**

| Pattern | Percentage | Description |
|---------|------------|-------------|
| Check Introduction | 48% | Adding validation checks |
| Update Introduction | 26% | Updating code/dependencies |
| Code Modification | 17% | Modifying existing logic |
| Catch Introduction | 9% | Adding exception handling |

---

## 7. Comparison: LLM vs Python Ecosystem

### 7.1 Vulnerability Lifecycle

| Metric | LLM Ecosystem | Python Ecosystem |
|--------|---------------|------------------|
| Median time to disclosure | **56.2 months** | 39 months |
| Difference | +17.2 months (44% longer) | — |

### 7.2 Severity Distribution

LLM ecosystem vulnerabilities tend to exhibit **higher severity** than Python ecosystem.

### 7.3 Fix Rates

| Metric | LLM Ecosystem | Python Ecosystem |
|--------|---------------|------------------|
| Fixed Before Disclosure | 68.9% | 64.7% |
| Fixed After Disclosure | 28.0% | 34.4% |
| Never Fixed | 3.1% | 0.9% |

---

## 8. Implications and Recommendations

### For Practitioners

1. **Prioritize core dependencies:** Focus security audits on high-frequency packages (TensorFlow, transformers, etc.)

2. **Balance version constraints:**
   - Strict (==): More stable but doesn't eliminate vulnerabilities
   - Loose (>=): More flexible but higher security risk

3. **Monitor disclosure delays:** 56.2-month median disclosure time means long exposure windows

4. **Track vulnerability-free releases:** 50% of updates happen within 11 days of fix availability

### For Researchers

1. **Supply chain security tools:** Develop automated vulnerability detection for LLM dependencies

2. **Disclosure acceleration:** Research ways to reduce 56.2-month disclosure delay

3. **Dependency recommendation:** Build systems that consider security alongside functionality

---

## 9. Key Statistics Summary

| Metric | Value |
|--------|-------|
| LLMs analyzed | 52 |
| Packages identified | 482 |
| Vulnerabilities collected | 890 |
| LLMs with vulnerable dependencies | 75.8% |
| Median time to disclosure | 56.2 months |
| DoS vulnerabilities (most common) | 262 |
| ML package vulnerability share | 91.1% |
| Top 3 packages' vulnerability share | 71.01% |
| Vulnerabilities never fixed | 3.1% |
| LLMs with vulnerability PRs | 17.3% |

---

## 10. Contributions

1. **Comprehensive investigation** of dependency supply chain of 52 LLMs including vulnerabilities
2. **Comparison to Python ecosystem** revealing longer disclosure times in LLM ecosystem
3. **Empirically grounded guidelines** for practitioners implementing dependency management

---

## Threats to Validity

### Internal Validity
- Regex-based vulnerability detection may miss some cases
- Manual labeling subjectivity (mitigated by dual review, Kappa = 0.859)

### External Validity
- Limited to 52 LLMs (may not generalize to all LLMs)
- Focus on Python packages (other ecosystems may differ)

### Construct Validity
- Snyk.io may not capture all vulnerabilities
- Libraries.io metadata may be incomplete

---

**Note:** Document was truncated during import. Full paper contains additional sections on related work, detailed methodology, and extended discussion.
