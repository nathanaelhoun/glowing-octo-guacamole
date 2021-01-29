#!/bin/bash

if [ "$(git diff --name-only HEAD | grep "^server/")" != "" ]; then
    cd "$(git rev-parse --show-toplevel)/server" || exit 1
    npm run format:write || exit 1
    npm run lint:fix || exit 1
    npm run test || exit 1
fi

if [ "$(git diff --name-only HEAD | grep "^client/")" != "" ]; then
    cd "$(git rev-parse --show-toplevel)/client" || exit 1
    npm run format:write || exit 1
    npm run lint:fix || exit 1
    npm run test -- --watchAll=false || exit 1
fi

cd "$(git rev-parse --show-toplevel)" || exit 1
exit 0
