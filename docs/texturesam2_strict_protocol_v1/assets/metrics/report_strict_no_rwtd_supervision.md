# TextureSAM-2 Strict Protocol (No RWTD Supervision)

Dataset: `rwtd_kaust256` (256 images)

## Protocol definition

- No model is trained on RWTD labels.
- No hyperparameter sweep is run on RWTD labels.
- The method is frozen and executed once for final reporting.
- RWTD labels are used only to compute final evaluation metrics.

## Methods compared

1. TextureSAM-v2 strict PTD-v4 set-selector consolidator (frozen strict config)

## Results

| Method | mIoU | ARI |
|---|---:|---:|
| **TextureSAM-v2 strict PTD-v4 set selector** | **0.774049** | **0.551079** |

## Fixed configuration (frozen)

- `min_area=32`
- `close_kernel=5`
- `hole_area_threshold=64`
- `merge_threshold=0.50`
- `adjacency_dilation=3`
- `w_texture=0.65`
- `w_boundary=0.30`
- `w_hetero=0.20`
- `objective_lambda=0.45`
- `objective_mu=0.30`

## Reproduce strict run

```bash
cd /home/galoren/TextureSAM-v2
PYTHONPATH=. python3 scripts/run_strict_ptd_v4_set_selector.py \
  --rwtd-root /home/galoren/rwtd_partition_nonsam/data/rwtd_kaust256 \
  --prompt-masks-root /home/galoren/rwtd_miner_public_site/texow_sam_vlm_freeform_rwtd_v5_qwen3_multiscale_attr/predictions/prompt_masks \
  --baseline-masks-root /home/galoren/rwtd_miner_public_site/texow_sam_vlm_freeform_rwtd_v5_qwen3_multiscale_attr/predictions/masks \
  --ptd-root /home/galoren/repo/data/ptd \
  --out-root /home/galoren/TextureSAM-v2/reports/strict_ptd_v4_set_full256
```
