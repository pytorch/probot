FROM node:12 as install
WORKDIR /build
COPY tsconfig.json .
COPY package.json .
COPY yarn.lock .
RUN yarn install
COPY src/ src/

FROM install as build
RUN yarn build

FROM install as test
COPY test/ test/
COPY jest.config.js .
RUN yarn test

FROM node:12 as prod-build
WORKDIR /out
COPY package.json .
RUN yarn install --production

FROM alpine:3 as zip
RUN apk -U --no-cache add zip
WORKDIR /build
COPY --from=build /build/dist dist/
COPY --from=prod-build /out/node_modules node_modules/
COPY ./package.json .
COPY ./yarn.lock .
RUN zip -FSr /pytorch-probot.zip .

FROM scratch as prod
COPY --from=zip /pytorch-probot.zip .
