FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY package.json ./
EXPOSE 4000
CMD ["sh", "-c", "if [ \"$NODE_ENV\" = 'development' ]; then npx nodemon --watch src src/index.js; else node src/index.js; fi"]
