# TextureSAM-v2 Strict PTD-v9 Conservative Gate (No RWTD Supervision)

## Protocol
- External training data: PTD only.
- No RWTD-label training.
- No RWTD-label hyperparameter search.
- RWTD labels are used only for final metric reporting.

## Kept Model
- TextureSAM-v2 Strict PTD-v9 Conservative Gate (v7 primary + v8 rescue)

## Robust RWTD Results (256 images)
- mIoU: 0.8448140304210685
- ARI: 0.7173450233766954

## Official Upstream No-Agg Comparison
- TextureSAM η<=0.3 official: mIoU 0.4684171525279216, ARI 0.616292078259886
- Ours (v9 conservative gate): mIoU 0.5117858974623588, ARI 0.7217077979863781

## Notes
- Proposal source: official TextureSAM η<=0.3 auto masks.
- Gate policy: use v8 only when v7 is low-coverage against proposal-union evidence.
