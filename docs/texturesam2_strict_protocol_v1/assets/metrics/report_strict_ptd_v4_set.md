# TextureSAM-v2 Strict PTD-v7 Dual-AI Gate (No RWTD Supervision)

## Protocol
- External training data: PTD only.
- No RWTD-label training.
- No RWTD-label hyperparameter search.
- RWTD labels are used only for final metric reporting.

## Kept Model
- TextureSAM-v2 Strict PTD-v7 Dual-AI Gate (v4 primary + v6 rescue)

## Robust RWTD Results (256 images)
- mIoU: 0.813581598167015
- ARI: 0.7084594344368649

## Official Upstream No-Agg Comparison
- TextureSAM η<=0.3 official: mIoU 0.4684171525279216, ARI 0.616292078259886
- Ours (v7 dual gate): mIoU 0.4960936784915698, ARI 0.7241229989546254

## Notes
- Proposal source: official TextureSAM η<=0.3 auto masks.
- Gate policy: use v6 only when v4 is low-coverage against proposal-union evidence.
