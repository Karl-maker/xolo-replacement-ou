# OÜ Business Manager

An open, self-hostable system that automates the administration of Estonian private limited companies (OÜ): compliance deadlines, bookkeeping, tax preparation, registry upkeep and records, with AI doing the repetitive work and a human approving everything that matters.

> **Status:** requirements stage (Draft 1, 22 October 2026). Nothing here is tax or legal advice. All rates, thresholds and deadlines must be verified against [emta.ee](https://www.emta.ee) and [rik.ee](https://www.rik.ee) before use.

---

## Contents

1. [Why this exists](#1-why-this-exists)
2. [What it does](#2-what-it-does)
3. [Principles](#3-principles)
4. [Who it is for](#4-who-it-is-for)
5. [How it is organised](#5-how-it-is-organised)
6. [Features by module](#6-features-by-module)
7. [Where AI is used and where it is not](#7-where-ai-is-used-and-where-it-is-not)
8. [Things the software cannot do for you](#8-things-the-software-cannot-do-for-you)
9. [Roadmap](#9-roadmap)
10. [Non-functional commitments](#10-non-functional-commitments)
11. [Out of scope for v1](#11-out-of-scope-for-v1)
12. [Open decisions](#12-open-decisions)
13. [Repository layout](#13-repository-layout)

Developer documentation: [logging and audit trail](docs/logging.md).

---

## 1. Why this exists

Running an OÜ means a steady stream of small obligations: annual report, bookkeeping, beneficial-owner accuracy, contact-person and legal-address contracts, e-Residency card expiry, and, once triggered, VAT, payroll taxes and dividend tax. Missing one has real consequences, and most of the work is repetitive.

Existing bookkeeping tools handle some of this, usually per seat, with lock-in. This project aims to be one place that:

- **knows** which obligations apply to your company right now,
- **reminds and prepares** each one before its deadline,
- **keeps** the books and records,
- **uses AI** to remove manual work, while a human approves anything that is filed, paid or posted.

It is built first for a single OÜ whose owner and board sit outside the EEA, but the obligation engine is rule-driven so other company profiles can be supported.

---

## 2. What it does

```
 Company profile ──► Obligation engine ──► Calendar + reminders
        │                    │
        │                    └──► Filing preparation (annual report, KMD, TSD, dividends)
        │
 Documents + bank ──► Ledger ──► Month / year close ──► Reports
        │
 Registry + contracts + vault ──► Expiry tracking, 7-year records
        │
        └──► AI assistant: extraction, categorisation, Q&A with citations, drafts, anomaly flags
```

A single profile (legal form, financial year end, VAT status, whether you pay salary or dividends, board location) drives everything. Change a field, for example _VAT registered = Yes_, and the matching obligations switch on automatically, with deadlines calculated for you.

---

## 3. Principles

| Principle                          | What it means in practice                                                                                                              |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Deterministic where it matters** | Deadlines, tax maths and ledger posting are plain code, never AI. Every figure is reproducible from ledger data.                       |
| **Human in the loop**              | AI proposes, a person approves. The system never files, pays or signs on its own.                                                      |
| **Rules are data**                 | Rates, thresholds and deadlines live in a versioned table with effective dates and source links, changeable without a code deployment. |
| **Auditable**                      | Append-only audit log. Every AI output stores its prompt, sources and model version.                                                   |
| **Portable**                       | Open export formats (CSV, JSON, PDF). No vendor lock-in.                                                                               |
| **Cheap to run**                   | Serverless or a small instance, pay-per-use AI, no per-seat fees.                                                                      |
| **Private by design**              | No e-ID PINs or bank passwords stored. Personal data minimised. Providers that do not train on your data.                              |

---

## 4. Who it is for

- **Owner-directors** of an OÜ, especially e-Residents with a board outside the EEA, who want to run the company administration themselves.
- **External accountants** who need read-only access to the books and records.
- **Developers** who want to build on an open compliance engine for Estonian companies.

Roles in v1: _owner/director_ (approve and sign) and _read-only_.

---

## 5. How it is organised

The system is split so that the business logic is independent of any interface.

| Part                      | Role                                                                                                                                                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Core**                  | Company profile, obligation engine, ledger, tax and filing preparation, rules table, audit log, records vault, AI orchestration. All business logic lives here.                                                       |
| **CLI** (`packages/cli`)  | Command-line interface over core. Structured JSON output, structured errors, documented exit codes, an approval gate for anything with legal or financial effect. See the [CLI architecture](packages/cli/README.md). |
| **Jobs**                  | Scheduled work: reminders, rule-freshness checks, bank imports, AI extraction. Reminder delivery is the critical path.                                                                                                |
| **Web dashboard** (later) | "What do I do this month" view: next five deadlines, overdue items, month-close status, VAT threshold meter, expiries.                                                                                                |

The CLI is deliberately a thin, separate package. It parses input, calls core through a narrow interface and presents results. Core never depends on it, so a dashboard, API or any other front end can sit alongside it.

---

## 6. Features by module

### Obligation engine and calendar

- Obligations generated from the company profile via a rules table, not hard-coded logic.
- **Always on:** annual report, up-to-date bookkeeping, beneficial-owner (UBO) accuracy, contact-person and legal-address validity, e-ID card validity.
- **Switched on by profile or trigger:** VAT (KMD and KMD INF, due the 20th of the following month, nil returns included), TSD (due the 10th), OSS (quarterly), dividend tax (22/78 via TSD).
- Deadlines computed from the financial year end; supports non-calendar years.
- Reminders at 30, 14, 7 and 1 day before each deadline, with an overdue state until closed.
- Status per obligation: not due, preparing, ready for approval, filed, paid, overdue.

### Trigger detection

- Rolling taxable turnover tracked against the EUR 40,000 VAT registration threshold, with alerts at 70%, 90% and 100%.
- Payments to a natural person (salary, board fee, dividend, taxable benefit) detected, with a warning that TSD is due for that month.
- EU cross-border sales flagged for a possible OSS or VAT-substance question.

### Document intake

- Invoices and receipts accepted by upload, email forward and drag-and-drop.
- AI extraction of supplier, date, number, net, VAT, total, currency and line items, with a confidence score.
- Suggested account category and VAT code; a human confirms before posting.
- Duplicate detection; originals stored unchanged and linked to their ledger entry.

### Banking and reconciliation

- Bank and EMI transaction import (CSV first, API where offered).
- Automatic matching to invoices; unmatched items listed for review.
- A month cannot be closed while unmatched or unapproved items remain.

### Ledger and reporting

- Double-entry ledger with a configurable chart of accounts and fiscal periods.
- Month and year close with locks; reopening requires a logged reason.
- Trial balance, balance sheet, profit and loss, shareholder-loan view.
- Sales invoicing with sequential numbering and PDF output, ready for later VAT registration.

### Filing preparation

- **Annual report pack:** draft balance sheet, income statement and notes in the Business Register format, a shareholder approval resolution template, a board signature checklist, and a file or data set for manual submission.
- **KMD and TSD packs** (when enabled): figures ready to enter or upload in e-MTA, reconciled to the ledger.
- **Dividend guard:** checks distributable equity and calculates the 22/78 tax before a distribution is recorded, and requires explicit approval.
- Who approved each filing, when, the submitted version and the receipt are all recorded.

### Registry and contract upkeep

- Tracks board members, shareholders, UBOs, activity codes, legal address and contact person.
- Prompts to update the register within the legal time (for example UBO within 30 days of a change).
- Expiry tracking for the e-Residency card, legal-address contract and contact-person contract, with warnings at 90 and 30 days.
- A yearly review task covering all of the above.

### Records vault

- Accounting records and source documents kept for 7 years, searchable by date, supplier and type.
- Resolutions, contracts, loan agreements and official letters from the contact person.
- One-command export of a full company data pack for an accountant, bank or authority.

### AI assistant

- Rule questions ("Do I need to file this month?") answered from retrieved official sources, with citations and the date they were checked.
- Plain-language explanations and step-by-step guidance for any obligation.
- Anomaly flags: unusual amounts, new suppliers, missing months, weekend postings, bank and ledger mismatches.
- Drafts of annual report notes, shareholder resolutions and emails to the contact-person provider, for human editing.
- Summaries of official letters from EMTA or the Register, with required actions and deadlines.

### Users, approvals and audit

- Immutable audit log for every create, change, approval, and AI suggestion accepted or rejected.
- Dashboard showing the next five deadlines, overdue items, month-close status, the VAT threshold meter and expiries.

---

## 7. Where AI is used and where it is not

| Task                                                     | Approach                                                    |
| -------------------------------------------------------- | ----------------------------------------------------------- |
| Deadline calculation, tax maths, ledger posting          | **Deterministic code only.** No AI.                         |
| Reading invoices and receipts                            | AI extraction, human confirms                               |
| Categorising spend and suggesting VAT codes              | AI suggestion with confidence, learns from corrections      |
| Bank matching                                            | Rules first, AI for ambiguous cases                         |
| Rule Q&A and plain-language guidance                     | AI with retrieval from official sources, citations required |
| Anomaly detection                                        | Rules plus AI review notes                                  |
| Drafting resolutions, notes, emails and letter summaries | AI draft, human edits                                       |
| Filing, paying, signing                                  | **Human only**                                              |

Low AI confidence forces human review. Personal IDs and bank numbers are redacted before anything is sent to a model where possible.

---

## 8. Things the software cannot do for you

Because the management board sits outside the EEA, some requirements are real-world arrangements, not features:

| Need                                   | What to do                                                                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Estonian contact person** (licensed) | Generally required for boards outside the EEA. Buy from an Estonian corporate service provider; it receives official legal mail and forwards it. |
| **Estonian legal address**             | Every OÜ needs one, usually a virtual-office service often bundled with the contact person.                                                      |
| **Valid e-Residency digital ID**       | Needed to sign the annual report and make register filings. The system tracks expiry.                                                            |
| **Business bank or EMI account**       | Needed for bookkeeping and later for tax payments.                                                                                               |
| **Financial year decision**            | Default is the calendar year (annual report due 30 June). Decide before the first year closes.                                                   |

If you recently changed accounting provider, check whether your contact person and legal address arrangements are still in place.

---

## 9. Roadmap

| Phase                 | Scope                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------- |
| **1. Foundations**    | Company profile, obligation engine, calendar and reminders, records vault, expiry tracker     |
| **2. Books**          | Document intake with AI extraction, bank import, ledger, month close                          |
| **3. Filings and AI** | Annual report pack, dividend guard, AI assistant with citations                               |
| **4. When triggered** | VAT module (KMD, KMD INF, OSS) and TSD module; direct e-MTA submission if an API is available |

Example acceptance criteria:

- Setting _VAT registered = Yes_ creates the monthly KMD obligation with the correct 20th-of-month deadline within a minute.
- Setting the year end to 30 June moves the annual report deadline to 31 December.
- Recording a first payment to a person creates a TSD obligation due on the 10th of the next month and warns the owner.
- A month with unmatched bank items cannot be closed.
- Every AI-extracted invoice shows source image, extracted fields and confidence, and cannot post until approved.
- A reminder is sent 30, 14, 7 and 1 day before each deadline and the send is logged.
- Contact-person contract expiry triggers a warning 90 days before the end date.

---

## 10. Non-functional commitments

| Area           | Commitment                                                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Correctness    | Every rate, threshold and deadline is in a versioned config table with effective date and source link. Automated tests cover every deadline rule. |
| Rule freshness | A scheduled job watches official pages for changes and alerts the owner. Rules change only after human review.                                    |
| Security       | MFA, encryption in transit and at rest, secrets in a secrets manager, least privilege, no shared credentials.                                     |
| Sensitive data | Never store e-ID PINs or bank passwords. Bank access by read-only token or file import.                                                           |
| Privacy        | GDPR-aware: minimised data, logged access, export and deletion except where record-keeping law requires retention.                                |
| Reliability    | Reminder delivery with at-least-once semantics, retries and a secondary channel. Target 99.5% availability.                                       |
| Backup         | Daily backups, tested restores, RPO and RTO of 24 hours. Deleted records recoverable for 30 days.                                                 |
| Locale         | All deadlines in Europe/Tallinn. English interface with Estonian terms (KMD, TSD) shown.                                                          |
| Observability  | Logging, error alerts and a health page for jobs.                                                                                                 |
| Usability      | A one-screen "what do I do this month" view; any new obligation understandable in under two minutes.                                              |

---

## 11. Out of scope for v1

- Automatic submission to EMTA or the Business Register (filing packs are prepared for manual submission)
- A payroll engine
- Multi-company support

---

## 12. Open decisions

- Financial year end
- Which bank or EMI account is the source of transactions
- Provider for contact person and legal address
- Build versus adopt: whether parts such as bookkeeping should use an existing tool, with this system handling only obligations, reminders and AI

---

## 13. Repository layout

```
/
  README.md              # this file
  packages/
    core/                # business logic: profile, obligations, ledger, rules, audit, vault, AI orchestration
    cli/                 # command-line interface (see packages/cli/README.md)
    jobs/                # scheduled work: reminders, imports, rule-freshness checks
    web/                 # dashboard (later)
```

`core` is the only package that holds business logic. The other packages depend on it, never the reverse.

---

## Disclaimer

This software prepares information and reminders. It is not a substitute for professional tax, legal or accounting advice. The company's management board remains responsible for all filings, payments and signatures.

---

## License

Licensed under the PolyForm Noncommercial License 1.0.0.

You may use, modify, and distribute this software for permitted
noncommercial purposes. Commercial use requires separate permission
from the copyright holder.

See [LICENSE](./LICENSE) for the full license terms.
