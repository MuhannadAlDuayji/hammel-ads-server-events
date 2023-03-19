FROM node:18
ENV NODE_ENV production

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --only=production

COPY . .


EXPOSE 3501
USER node
CMD "npm" "start"
