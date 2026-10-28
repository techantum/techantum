#!/bin/bash
cd "$(dirname "$0")/.."
exec npx next start -H 127.0.0.1 -p 4032
