# TextureSAM-2 Strict PTD-v2 Report (No RWTD Supervision)

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
5. In strict PTD learned mode, merge and component scoring are trained on PTD-derived synthetic data.

## Candidate Generation and Prompts
- Strict PTD-v2 uses frozen v5 prompt-mask bank.
- Mean proposal count: **25.875 masks/image**.
- v2/v3/v4/v5 are versioned prompt-template families used upstream to create complementary candidate distributions.
- Prompt text diversity is used for proposal recall, not for RWTD-label fitting.

## Results (RWTD 256)
| Method | mIoU | ARI |
|---|---:|---:|
| **TextureSAM-v2 strict PTD learned** | **0.717714** | **0.376768** |

Only the kept strict model is shown on this page.

## PTD Learned Training Metrics
- Pairwise merge validation AUC: 0.995264
- Pairwise merge best F1: 0.979513
- Global component scorer validation MAE: 0.103306

## Repro
```bash
cd /home/galoren/TextureSAM-v2
PYTHONPATH=. python3 scripts/run_strict_ptd_v2.py \
  --rwtd-root /home/galoren/rwtd_partition_nonsam/data/rwtd_kaust256 \
  --prompt-masks-root /home/galoren/rwtd_miner_public_site/texow_sam_vlm_freeform_rwtd_v5_qwen3_multiscale_attr/predictions/prompt_masks \
  --baseline-masks-root /home/galoren/rwtd_miner_public_site/texow_sam_vlm_freeform_rwtd_v5_qwen3_multiscale_attr/predictions/masks \
  --ptd-root /home/galoren/PTD \
  --out-root /home/galoren/TextureSAM-v2/reports/strict_ptd_v2
```
