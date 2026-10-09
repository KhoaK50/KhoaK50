# Project: Academic Linear Algebra Automated Solution Ecosystem for Vectoria

## Architecture
- **Backend Architecture (`backend_v2`)**:
  - Modular Explainer Registry (`explainers/registry.py`, `engine.py`, `strategies/`)
  - Exact Symbolic Linear Algebra (`core/linalg.py` with SymPy rational/radical arithmetic)
  - API Routes (`routes/linear_algebra.py`) serving endpoints `POST /api/linear_independence` and `POST /api/rank`
  - 4-Phase Closed Explainer Contract with backward compatibility (root fields `independent`, `rank`, `message`)
- **Frontend Architecture (`frontend_v2`)**:
  - Academic Solution Generators (`js/app/ui/tasks_generator/indep_generator.js`, `rank_generator.js`)
  - Dynamic Dual-Method Solution Modal Drawer (`js/app/ui/solution_panel.js`)
  - Interactive Calculation Workspace (`calculation.html` and `js/app/logic/vector_controller.js`)
  - KaTeX & MathJax typesetting with anti-layout-shift (CLS) stabilization
- **Cross-Cutting Standards**:
  - Strict Zero Em-dash rule: no em-dash character in code, comments, or UI (use '-' or ',').
  - Anti-Slop Pedagogical Standards (formal Vietnamese academic phrasing, no emojis, no AI clichés).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | SymPy Exact Gaussian Explainer for Independence | Strategy `linear_independence.py` generating 4-phase payload (Phase 1 Setup, Phase 2 Row Ops, Phase 3 Theorem Deduction, Phase 4 Explicit Dependency Relation $v_k = \sum c_i v_i$). Exact rational/radical arithmetic. | M1 | Survey Backend |
| 2 | SymPy Exact Gaussian Explainer for Rank | Strategy `rank_vectors.py` generating 4-phase payload (Phase 1 Setup, Phase 2 Row Ops with labels, Phase 3 Rank Deduction with pivot coordinates, Phase 4 Span Dimension). Exact arithmetic. | M1 | Survey Backend |
| 3 | Explainer Registry & Router Integration | Register strategies in `explainers/__init__.py`, update `routes/linear_algebra.py` `/api/linear_independence` and `/api/rank` with backward-compatible root fields. | M1 | Survey Backend |
| 4 | Backend Academic Explainer Unit Tests | Test suite `backend_v2/tests/test_academic_explainers.py` testing independent, dependent, proportional, zero-vector, and fractional inputs. | M1 | Survey Tests |
| 5 | Frontend Independence Generator (`indep_generator.js`) | HTML & KaTeX markup generator `App.TasksGen.Indep.buildSolution` for Dual-Method (Tab 1: Matrix REF, Tab 2: System & Parametric Solution). | M2 | Survey Frontend |
| 6 | Frontend Rank Generator (`rank_generator.js`) | HTML & KaTeX markup generator `App.TasksGen.Rank.buildSolution` for Dual-Method (Tab 1: REF & Pivots, Tab 2: Submatrix Determinants / Maximal Independent Subset). | M2 | Survey Frontend |
| 7 | Dynamic Dual-Tab Solution Modal Upgrade | Upgrade `solution_panel.js` for flexible tab labels, smooth opening, and synchronized MathJax/KaTeX rendering. | M2 | Survey Frontend |
| 8 | Calculation Page UI Upgrade (`calculation.html`) | Add `btnIndepSolution` and `btnRankSolution` buttons, replace `<pre>` with academic result badges, import new generator scripts. | M2 | Survey Frontend |
| 9 | Vector Controller Wiring (`vector_controller.js`) | Store full explainer payload in `App.currentIndepData` / `App.currentRankData`, bind solution button click events to open modal. | M2 | Survey Frontend |
| 10 | Headless Edge CDP Automated Browser Test | Automated browser test suite verifying modal opening, tab switching, KaTeX rendering, and 0 console errors on `calculation.html`. | M3 | Survey Tests |
| 11 | Final E2E Test Suite & Adversarial Hardening | Verify 100% passing rate across all backend unit/integration tests and browser CDP tests. | M3 | Survey Tests |
| 12 | Safe System Synchronization (`sync.bat`) | Execute `sync.bat` to mirror changes to backup folders. Strictly no git push. | M3 | Survey Tests |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend Explainer Engine | Features 1, 2, 3, 4: SymPy strategies, router updates, unit tests | none | DONE |
| M2 | Frontend Solution Generators & UI | Features 5, 6, 7, 8, 9: Generators, solution_panel, calculation.html, vector_controller | M1 (Interface Contract) | DONE |
| M3 | Final E2E Verification & System Sync | Features 10, 11, 12: Browser CDP verification, adversarial hardening, 100% test pass, sync.bat | M1, M2 | DONE |

## Interface Contracts
### `backend_v2` ↔ `frontend_v2`
- **Endpoint `POST /api/linear_independence`**:
  - Request: `{"vectors": [[1, 2, -1], [2, 5, 1], [1, 1, -4]]}`
  - Response root:
    - `independent: boolean` (backward compat)
    - `rank: integer` (backward compat)
    - `message: string` (backward compat)
    - `problem_id: "linear_independence"`
    - `vectors: number[][]`
    - `dimension: integer`
    - `num_vectors: integer`
    - `result: {"is_independent": boolean, "rank": integer, "dependency_relations": [{"dependent_index": int, "dependent_name": str, "linear_combination_latex": str}]}`
    - `method_matrix: {"title": str, "matrix_setup_latex": str, "steps": [{"op": str, "latex_label": str, "matrix": str[][]}], "echelon_matrix": str[][], "nonzero_rows": int, "pivots": int[][], "deduction_latex": str, "conclusion_text": str}`
    - `method_equation: {"title": str, "vector_equation_latex": str, "scalar_system_latex": str, "augmented_matrix_latex": str, "solution_type": "unique"|"infinite", "free_variables": str[], "general_solution_latex": str, "nontrivial_example": object|null, "conclusion_text": str}`
- **Endpoint `POST /api/rank`**:
  - Request: `{"vectors": [[1, 2, -1], [2, 5, 1], [1, 1, -4]]}`
  - Response root:
    - `rank: integer` (backward compat)
    - `message: string` (backward compat)
    - `problem_id: "rank_vectors"`
    - `vectors: number[][]`
    - `dimension: integer`
    - `num_vectors: integer`
    - `result: {"rank": integer, "dimension_span": integer, "pivots": int[][]}`
    - `method_matrix: {"title": str, "matrix_setup_latex": str, "steps": [{"op": str, "latex_label": str, "matrix": str[][]}], "echelon_matrix": str[][], "nonzero_rows": int, "pivots": int[][], "deduction_latex": str, "conclusion_text": str}`
    - `method_equation: {"title": str, "maximal_independent_subset_latex": str, "span_dimension_text": str, "conclusion_text": str}`

## Code Layout
- Backend:
  - `backend_v2/vectoria_api/explainers/strategies/linear_independence.py` (DONE)
  - `backend_v2/vectoria_api/explainers/strategies/rank_vectors.py` (DONE)
  - `backend_v2/vectoria_api/explainers/__init__.py` (DONE)
  - `backend_v2/vectoria_api/routes/linear_algebra.py` (DONE)
  - `backend_v2/tests/test_academic_explainers.py` (DONE)
- Frontend:
  - `frontend_v2/js/app/ui/tasks_generator/indep_generator.js` (DONE)
  - `frontend_v2/js/app/ui/tasks_generator/rank_generator.js` (DONE)
  - `frontend_v2/js/app/ui/solution_panel.js` (DONE)
  - `frontend_v2/calculation.html` (DONE)
  - `frontend_v2/js/app/logic/vector_controller.js` (DONE)
- E2E Tests:
  - `tests/verify_academic_solutions_headless.js` (DONE)
  - `d:\Programming_language\project_web\TEST_READY.md` (DONE)
