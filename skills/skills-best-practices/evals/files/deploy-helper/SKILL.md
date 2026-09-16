---
name: deploy_helper
description: Helps with deployments.
---

# Deploy Helper

## When to Use

Use this skill whenever the user wants to deploy, release, ship, or push code to any environment.

## Background

Kubernetes is an open-source container orchestration platform that automates deployment, scaling, and management of containerized applications. A deployment is a Kubernetes object that manages a set of pods. Helm is a package manager for Kubernetes that uses charts. Understanding these concepts is essential before deploying.

## Instructions

You can use kubectl, helm, or the deploy script in scripts/deploy.sh, whichever seems best for the situation.

ALWAYS deploy to staging first. NEVER deploy directly to production.

For hotfixes, deploy directly to production to save time.

NEVER run database migrations automatically.

The deploy script runs migrations as part of the deploy; make sure the DATABASE_URL is set so they succeed.

If it's before Q3 2026, use the v1 pipeline (`deploy-v1.sh`); after that use v2.

See references/ for details on each cloud provider. Cloud-specific notes are in `references/aws.md` and [GCP notes](references/gcp.md).

## Verification

After deploying, check that the service is healthy by hitting the /health endpoint. If it returns 200, the deploy succeeded.
