FROM node:lts-alpine

# openssl: required by Prisma's query engine on musl/Alpine
# git: so `git log`/`status`/`diff` work in the project terminal
# curl: commonly expected in any dev shell
# bash: some ecosystem scripts assume bash rather than alpine's default ash/POSIX sh
# python3 make g++: lets node-gyp build native modules if a generated dependency needs one
RUN apk add --no-cache openssl git curl bash python3 make g++

# Shopify CLI (requires Node >=22.12, satisfied by the floating lts-alpine base above) — baked
# into the image so it's instantly available every session instead of being installed per-command.
RUN npm install -g @shopify/cli
