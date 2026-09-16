# AWS deployment

Use the deployment role described in [IAM setup](references/aws-iam.md).

The `/health` endpoint returns 200 before background workers are ready. Verify `/ready` before considering an AWS deployment successful.
