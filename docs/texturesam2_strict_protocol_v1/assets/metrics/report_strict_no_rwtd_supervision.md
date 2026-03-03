# TextureSAM-2 Strict Protocol (No RWTD Supervision)

Dataset: `rwtd_kaust256` (256 images)

## Protocol definition

- No model is trained on RWTD labels.
- No hyperparameter sweep is run on RWTD labels.
- The method is frozen and executed once for final reporting.
- RWTD labels are used only to compute final evaluation metrics.

## Methods compared

1. TextureSAM baseline (v5 masks)
2. TextureSAM-v2 strict handcrafted consolidator (fixed config)
3. TextureSAM-v2 strict DTD-CNN consolidator (DTD-only training, fixed config)

## Results

| Method | mIoU | ARI | Delta mIoU vs baseline | Delta ARI vs baseline |
|---|---:|---:|---:|---:|
| TextureSAM baseline (v5) | 0.467954 | 0.273033 | +0.000000 | +0.000000 |
| TextureSAM-v2 strict handcrafted | **0.655111** | **0.296329** | **+0.187156** | **+0.023296** |
| TextureSAM-v2 strict DTD-CNN | 0.648278 | 0.270440 | +0.180324 | -0.002593 |

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
PYTHONPATH=. python3 scripts/run_strict_no_rwtd_supervision.py \
  --rwtd-root /home/galoren/rwtd_partition_nonsam/data/rwtd_kaust256 \
  --prompt-masks-root /home/galoren/rwtd_miner_public_site/texow_sam_vlm_freeform_rwtd_v5_qwen3_multiscale_attr/predictions/prompt_masks \
  --baseline-masks-root /home/galoren/rwtd_miner_public_site/texow_sam_vlm_freeform_rwtd_v5_qwen3_multiscale_attr/predictions/masks \
  --out-root /home/galoren/TextureSAM-v2/reports/strict_no_rwtd_supervision_v1
```
