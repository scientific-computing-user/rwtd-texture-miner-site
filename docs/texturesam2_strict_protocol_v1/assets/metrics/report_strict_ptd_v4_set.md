# TextureSAM-2 Strict PTD-v4 Report (No RWTD Supervision)

## Abstract
- **Question:** How to convert fragmented high-recall SAM proposals into one coherent binary mask without using RWTD labels for training.
- **Incentive:** RWTD penalizes fragmentation strongly (especially ARI), so coverage alone is insufficient.
- **Intuition:** Keep high-recall candidates, then learn texture-consistent consolidation from PTD only.

## Protocol
- RWTD labels are used only for final metric computation.
- No RWTD-label training.
- No RWTD-label hyperparameter search.
- External training source: PTD + PTD-derived synthetic segmentation only.

## Pipeline (Simple)
1. Generate many SAM proposal masks (high recall).
2. Compute texture features per proposal.
3. Merge spatially adjacent, texture-consistent fragments.
4. Score merged components and output one coherent binary mask.
5. In strict PTD-v4 mode, merge is PTD-v3 learned and component-set selection is PTD-v4 learned.

## Candidate Generation and Prompts
- Strict PTD-v4 uses frozen official TextureSAM `η<=0.3` proposal masks.
- Mean proposal count: **3.84375 masks/image**.
- v2/v3/v4/v5 are versioned prompt-template families used upstream to create complementary candidate distributions.
- Prompt text diversity is used for proposal recall, not for RWTD-label fitting.

## Results (RWTD 256)
| Method | mIoU | ARI |
|---|---:|---:|
| **TextureSAM-v2 strict PTD-v4 set selector** | **0.784300** | **0.690965** |

## Upstream Protocol Comparison (No-Agg)
| Method | mIoU | ARI |
|---|---:|---:|
| TextureSAM `η<=0.3` (official run, local reproduction) | 0.468417 | 0.616292 |
| **TextureSAM-v2 strict PTD-v4 on official `η<=0.3` proposals** | **0.486418** | **0.723768** |

Only the kept strict model is shown on this page.

## PTD-v4 Training Metrics
- Set-selector validation AUC: 0.999218
- Set-selector best F1: 0.988878
- Selector threshold: 0.30

## Repro
```bash
cd /home/galoren/TextureSAM-v2
PYTHONPATH=. python3 scripts/run_strict_ptd_v4_set_selector.py \
  --rwtd-root /home/galoren/TextureSAM-v2/reports/repro_upstream_eval/tmp_rwtd_official_root \
  --prompt-masks-root /home/galoren/TextureSAM-v2/reports/repro_upstream_eval/official_0p3_promptstyle \
  --baseline-masks-root /home/galoren/TextureSAM-v2/reports/repro_upstream_eval/official_0p3_promptstyle \
  --out-root /home/galoren/TextureSAM-v2/reports/strict_ptd_v4_on_official0p3
```
