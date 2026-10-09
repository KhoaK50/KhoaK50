# E2E Test Infra: Academic Linear Algebra Solution Ecosystem

## Test Philosophy
- Opaque-box, requirement-driven. Derived from user requirements in `ORIGINAL_REQUEST.md` and university pedagogy standards (DHBK HN / DHQG HCM).
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise Combinatorial + Real-World Workload Testing.
- Anti-Slop & Zero Floats: Every numerical value verified for exact symbolic equivalence (SymPy `Rational`/`sqrt`, no float truncation).
- Zero Em-dash enforcement: Verification script scans all modified source code, test files, and templates for 0 em-dash characters.

## Feature Inventory & Test Mapping
| # | Feature | Requirement Source | Tier 1 (Coverage) | Tier 2 (Boundary/Corner) | Tier 3 (Cross-Feature) | Tier 4 (Real-World) |
|---|---------|-------------------|:-----------------:|:-----------------------:|:----------------------:|:-------------------:|
| F1 | SymPy Linear Independence Explainer | ORIGINAL_REQUEST §R1 | 5 tests | 5 tests | Pairwise with F2, F3 | 2 workloads |
| F2 | SymPy Rank of Vectors Explainer | ORIGINAL_REQUEST §R1 | 5 tests | 5 tests | Pairwise with F1, F3 | 2 workloads |
| F3 | Dual-Method Explainer JSON Contract | ORIGINAL_REQUEST §R1 | 5 tests | 5 tests | Pairwise with F1, F2 | 2 workloads |
| F4 | Frontend Solution Generators (KaTeX) | ORIGINAL_REQUEST §R2 | 5 tests | 5 tests | Pairwise with F5, F6 | 2 workloads |
| F5 | Dynamic Dual-Tab Solution Modal | ORIGINAL_REQUEST §R2 | 5 tests | 5 tests | Pairwise with F4, F6 | 2 workloads |
| F6 | Calculation Page Integration & Badges | ORIGINAL_REQUEST §R2 | 5 tests | 5 tests | Pairwise with F4, F5 | 2 workloads |

## Test Architecture
- **Backend Test Runner**:
  - Location: `backend_v2/tests/test_academic_explainers.py`
  - Invocation: `$env:PYTHONPATH=".;backend_v2"; pytest backend_v2/tests/test_academic_explainers.py -v`
  - Semantics: Exit code 0, 100% assertions pass.
- **Frontend / Browser CDP Test Runner**:
  - Location: `tests/verify_academic_solutions_headless.js`
  - Invocation: `node tests/verify_academic_solutions_headless.js`
  - Semantics: Connects to `msedge.exe --headless=new` via native Node 24 WebSocket CDP, loads `calculation.html`, clicks "Kiểm tra", verifies Badge text, clicks "Lời giải", verifies modal drawer opening, checks KaTeX formula elements rendered, tests switching between Tab 1 and Tab 2, confirms 0 console errors and 0 exceptions.
- **Code Quality & Anti-Slop Scanner**:
  - Checks for zero em-dash characters (`\u2014`) in all new/modified files.
  - Verifies no float approximations (e.g. `0.3333`) in explainer payloads.

## Coverage Thresholds
- Tier 1: >= 5 tests per feature (happy path tests in isolation)
- Tier 2: >= 5 boundary/corner cases per feature (zero vector, single vector, duplicate vectors, collinear vectors, irrational radical coefficients, large dimension)
- Tier 3: Pairwise combinations of features (e.g. rank of dependent set yielding exact span dimension matching nullity theorem)
- Tier 4: Realistic university exam problems (e.g., standard linear independence and rank problems from DHBK Hanoi and DHQG HCM curricula)
