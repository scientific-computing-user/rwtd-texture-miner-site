# TextureSAM-2 Supercharged Results (Revised)

Dataset: `rwtd_kaust256` (256 images)

## Best achieved metrics

- Best grouped-CV (robust): **mIoU 0.823782 / ARI 0.666729**
- Best in-sample benchmark: **mIoU 0.889516 / ARI 0.776114**

## Full comparison

| Method | mIoU | ARI | Delta mIoU vs baseline | Delta ARI vs baseline |
|---|---:|---:|---:|---:|
| TextureSAM baseline (v5 masks) | 0.467954 | 0.273033 | +0.000000 | +0.000000 |
| TextureSAM-v2 handcrafted consolidator | 0.655111 | 0.296329 | +0.187156 | +0.023296 |
| TextureSAM-v2 DTD-CNN consolidator | 0.648278 | 0.270440 | +0.180324 | -0.002593 |
| TextureSAM-2 reranker (CV) | 0.818180 | 0.649164 | +0.350226 | +0.376131 |
| TextureSAM-2 reranker (CV + edge-aware refine) | **0.823782** | **0.666729** | **+0.355828** | **+0.393696** |
| TextureSAM-2 reranker (in-sample) | 0.884415 | 0.761788 | +0.416461 | +0.488755 |
| TextureSAM-2 reranker (in-sample + edge-aware refine) | **0.889516** | **0.776114** | **+0.421561** | **+0.503082** |

## Why this worked

1. Multi-bank candidate pooling from v2/v3/v4/v5 prompt masks vastly increased candidate quality.
2. A learned quality reranker converted proposal diversity into accurate single-mask selection.
3. Edge-aware refinement (GrabCut seeded by selected mask) improved boundary fit and reduced ARI penalties from fragmentation/boundary noise.

## Reproduce best robust run

```bash
cd /home/galoren/TextureSAM-v2
python3 scripts/run_multibank_reranker.py \
  --rwtd-root /home/galoren/rwtd_partition_nonsam/data/rwtd_kaust256 \
  --proposal-root /home/galoren/rwtd_miner_public_site/texow_sam_vlm_freeform_rwtd_v2/predictions/prompt_masks \
  --proposal-root /home/galoren/rwtd_miner_public_site/texow_sam_vlm_freeform_rwtd_v3_scan/predictions/prompt_masks \
  --proposal-root /home/galoren/rwtd_miner_public_site/texow_sam_vlm_freeform_rwtd_v4_qwen3/predictions/prompt_masks \
  --proposal-root /home/galoren/rwtd_miner_public_site/texow_sam_vlm_freeform_rwtd_v5_qwen3_multiscale_attr/predictions/prompt_masks \
  --mode cv --cv-folds 5 \
  --n-estimators 500 --max-depth 18 --min-samples-leaf 2 \
  --apply-refine --refine-iters 2 --refine-min-area 50 \
  --out-dir /home/galoren/TextureSAM-v2/reports/reranker_cv_refined
```

## Artifacts

- Comparison JSON: `/home/galoren/TextureSAM-v2/reports/comparison_supercharged_v2.json`
- CV refined summary: `/home/galoren/TextureSAM-v2/reports/reranker_cv_refined/summary.json`
- CV refined masks: `/home/galoren/TextureSAM-v2/reports/reranker_cv_refined/masks`
- In-sample refined summary: `/home/galoren/TextureSAM-v2/reports/reranker_in_sample_refined/summary.json`
- In-sample refined masks: `/home/galoren/TextureSAM-v2/reports/reranker_in_sample_refined/masks`
