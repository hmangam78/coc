#!/bin/bash
pnpm -r --filter "./packages/**" build
pnpm --filter backend start:dev
