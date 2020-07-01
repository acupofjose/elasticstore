FROM node:12

WORKDIR /app

COPY package.json ./
COPY *.lock ./

RUN npm install

COPY . .

CMD npm start