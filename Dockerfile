FROM node:12

WORKDIR /app

COPY package.json ./
COPY *.lock ./

RUN yarn install

COPY . .

CMD npm start
