FROM node:20-alpine

# openssl: required by Prisma's query engine on musl/Alpine
# git: so `git log`/`status`/`diff` work in the project terminal
# curl: commonly expected in any dev shell
# python3 make g++: lets node-gyp build native modules if a generated dependency needs one
RUN apk add --no-cache openssl git curl python3 make g++
