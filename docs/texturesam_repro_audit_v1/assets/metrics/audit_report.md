# TextureSAM Reproduction Audit (In Progress)

Date: 2026-03-04

## Scope

This audit checks the discrepancy between:

- Paper/official repo RWTD table values (TextureSAM `eta<=0.3`: `mIoU 0.47`, `ARI 0.62`, aggregated `mIoU ~0.75`)
- Local website numbers from the v5 prompt-based pipeline

## Direct RWTD Comparison (Requested)

Official TextureSAM paper/repo RWTD references:

- SAM-2: `mIoU 0.26`, `ARI 0.36`
- SAM-2*: `mIoU 0.14`, `ARI 0.19`
- TextureSAM `eta<=0.3`: `mIoU 0.47`, `ARI 0.62` (primary reference)
- TextureSAM `eta<=1.0`: `mIoU 0.42`, `ARI 0.54`

Our RWTD results (current):

- v5 prompt-proxy baseline: `mIoU 0.4680`, `ARI 0.2730`
- TextureSAM-v2 strict PTD-v2 learned: `mIoU 0.7177`, `ARI 0.3768`
- TextureSAM-v2 strict PTD-v3 graph: `mIoU 0.6857`, `ARI 0.5245`
- TextureSAM-v2 strict PTD-v3 fusion: `mIoU 0.7179`, `ARI 0.3811`
- TextureSAM-2 robust CV+refine (exploratory): `mIoU 0.8238`, `ARI 0.6667`

Delta vs official TextureSAM `eta<=0.3` (`0.47 / 0.62`):

- strict PTD-v2 learned: `+0.2477 mIoU`, `-0.2432 ARI`
- strict PTD-v3 graph: `+0.2157 mIoU`, `-0.0955 ARI`
- strict PTD-v3 fusion: `+0.2479 mIoU`, `-0.2389 ARI`
- robust CV+refine (exploratory): `+0.3538 mIoU`, `+0.0467 ARI`

## What was verified

1. Upstream source of truth
- Repo cloned: `/home/galoren/TextureSAM_upstream_20260303`
- README RWTD table confirms:
  - `SAM-2*: 0.14 / 0.19 / 0.75`
  - `TextureSAM eta<=0.3: 0.47 / 0.62 / 0.75`
  - `TextureSAM eta<=1: 0.42 / 0.54 / 0.76`

2. Clean-vs-local RWTD labels
- Official labels: `/home/galoren/TextureSAM_upstream_20260303/Kaust256/labeles/*.png`
- Local labels used in prior runs: `/home/galoren/rwtd_partition_nonsam/data/rwtd_kaust256/labels/rwtd_*.png` (symlinked JPEG masks)
- Binarized label agreement (official vs local):
  - mean IoU: `0.9527`
  - median IoU: `1.0000`
  - min IoU: `0.0005`
  - ~`10.94%` images under IoU `0.95`

3. Clean-label recomputation for existing outputs
- Recomputed with official Kaust256 PNG labels using the same local robust metric logic.
- Summary file:
  - `/home/galoren/TextureSAM-v2/reports/repro_upstream_eval/cleanlabel_recompute/summary.json`
- Results:
  - `baseline_v5`: `mIoU 0.4762`, `ARI 0.2901`
  - `strict_handcrafted`: `mIoU 0.6592`, `ARI 0.3111`
  - `strict_ptd_v2`: `mIoU 0.7162`, `ARI 0.3854`
  - `strict_ptd_v3`: `mIoU 0.6944`, `ARI 0.5405`
  - `strict_ptd_v3_fusion`: `mIoU 0.7211`, `ARI 0.3959`

4. Official no-aggregation script on local v5 outputs
- v5 prompt proposals were converted to official filename format:
  - input: `rwtd_<id>_pXX_mYY.png`
  - output: `mask_<proposalIdx>_<id>.png`
- Run using imported upstream `eval_no_agg_masks.py`.
- Summary file:
  - `/home/galoren/TextureSAM-v2/reports/repro_upstream_eval/v5_noagg_official_eval.json`
- Result on v5 prompt proposals:
  - `overall_average_iou: 0.2214`
  - `overall_average_rand_index: 0.1736`

5. Official no-aggregation script on v5 final single masks
- Summary file:
  - `/home/galoren/TextureSAM-v2/reports/repro_upstream_eval/v5_single_noagg_official_eval.json`
- Result:
  - `overall_average_iou: 0.2969`
  - `overall_average_rand_index: 0.3063`

6. Aggregated-style sanity check (custom reimplementation of upstream matching logic)
- v5 prompt proposals:
  - `/home/galoren/TextureSAM-v2/reports/repro_upstream_eval/v5_agg_like_official_eval.json`
  - `mean_iou_rwtd_average: 0.6651`
- v5 single masks:
  - `/home/galoren/TextureSAM-v2/reports/repro_upstream_eval/v5_single_agg_like_official_eval.json`
  - `mean_iou_rwtd_average: 0.3887`

## Interpretation so far

- The local v5 pipeline is not a direct reproduction of official TextureSAM checkpoint inference.
- Metric definitions are different across pipelines (notably no-agg script behavior and robust inversion handling), which alone can shift scores.
- Label source mismatch (PNG vs JPEG symlink masks) adds drift on a subset of images.
- This explains why website baseline values can diverge from the paper table despite looking directionally similar in some mIoU figures.

## Official checkpoint status

- Downloaded official checkpoints zip and extracted:
  - `sam2.1_hiera_small_0.3.pt`
  - `sam2.1_hiera_small_1.pt`
  - `sam2.1_hiera_small.pt`
- Added reproducible runner:
  - `/home/galoren/TextureSAM-v2/scripts/run_official_texturesam_inference.py`
- Smoke test (1 image, official 0.3 checkpoint, CPU, official high-recall params):
  - `3` masks generated
  - runtime `244.36s` for one image

## Remaining work for exact paper-level reproduction

1. Run full 256-image official inference with `sam2.1_hiera_small_0.3.pt`.
2. Evaluate with upstream scripts (`eval_no_agg_masks.py`, `eval_agg_masks.py`) on official Kaust256 labels.
3. Repeat for `sam2.1_hiera_small_1.pt` and optionally SAM-2* checkpoint/protocol.
4. Publish a side-by-side reconciliation table with exact command lines and all metric definitions.

## Current run status

- A local full rerun of official `0.3` checkpoint inference was started and validated, then intentionally stopped.
- Reason: the user requested to avoid duplicating work already reported in the official TextureSAM repository.
- Therefore, baseline source-of-truth is now the official repo/paper table, while this page is used for protocol reconciliation and transparency.
