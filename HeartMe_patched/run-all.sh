#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

( cd "$ROOT_DIR/auth-service/authservice" && mvn spring-boot:run ) &
( cd "$ROOT_DIR/user-service/userservice" && mvn spring-boot:run ) &
( cd "$ROOT_DIR/post-service/postservice" && mvn spring-boot:run ) &

wait
