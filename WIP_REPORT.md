# Restock – Work-in-Progress Report

## 1. Problem Statement
Small convenience stores still use paper, clipboards, or basic spreadsheets to track daily inventory. These manual workflows are time-consuming (40–60 seconds per item), error-prone, and often skipped entirely due to workload. The goal of **Restock** is to replace the repetitive “look-→ write-→ update Excel” workflow with a lightweight, offline-friendly *OCR-powered scanner*, saving **time per entry** while improving **record accuracy, accountability, and ease of hand-off between shifts**.

---

## 2. MVP Scope (✅ = done)

| Feature                                    | Status |
|--------------------------------------------|--------|
| OCR via Google Vision – scan to text       | ✅     |
| Camera UI with live preview                | ✅     |
| Text → Log Entry parser                    | ✅     |
| Editable list (inline quantity)            | ✅     |
| Manual-entry fallback                      | ✅     |
| Delete / duplicate actions in list         | ✅     |
| Offline local-storage (AsyncStorage)        | ✅     |
| TestFlight build                           | ✅     |
| Basic UX polish (icons, spacing, feedback) | 🔜     |

---

## 3. Metrics Being Tracked

| Metric                | Baseline (manual)        | Current WIP        | Target (v1)           |
|-----------------------|--------------------------|--------------------|-----------------------|
| Scan-to-log time      | ~40–60 s per item         | ~4–5 s per item*   | **< 3 s per item**    |
| OCR Accuracy (labels) | N/A (manual typing)       | ~80%*             | **> 90%**             |
| Offline Reliability   | N/A                      | Works offline      | Add “pending sync” UX |

\*Based on internal manual tests with dummy labels.

---

## 4. Upcoming 7-Day Focus (Iteration sprint)

| Priority | Task Description                                                                 |
|---------:|-----------------------------------------------------------------------------------|
| P0       | Optimize state updates + debouncing to reduce scan latency                       |
| P0       | Improve text cleaning and basic fuzzy-matching to increase tag accuracy           |
| P1       | Fix list UI overflow (scroll patch when > 5 items)                                |
| P2       | Start collecting feedback from small store clerks via TestFlight (1-2 testers)     |

---

## 5. Beyond All Versions: Future Roadmap (Only if I want have store permission)

- **Product DB integration** for common SKUs / barcode lookups (If my store gives permission) 
- **Auto-classification of items by category** (dairy, snacks, etc.)
- **Export / sync options** → Google Sheets, Shopify POS, WhatsApp reminders  
- **Session history tab**: group scans by date/time  
- **Staff audit view** → “who added what, when”

---

## 6. Notes

- ***Demo screenshots and demo video use random dummy text tags***  
  (e.g., “Apple”, “Banana”, “ELEVEN”) to avoid legal/trademark complications.

- Designed and built using: **React Native (Expo), TypeScript, Google Vision OCR, EAS builds**.

---

##  Tech Stack  
- **Framework:** React Native (Expo + TypeScript)  
- **OCR:** Google Vision TEXT_DETECTION  
- **Storage:** AsyncStorage (offline cache)  
- **CI/CD:** EAS builds → TestFlight

---

_Last Updated: `<Fill date before submitting>`_
