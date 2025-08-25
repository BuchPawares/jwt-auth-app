FROM node:18

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

# generate Prisma client
RUN npx prisma generate

CMD ["npm", "run", "dev"]