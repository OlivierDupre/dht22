# Use base node 8 image from Docker hub, because distroless is based on Node 8 LTS
FROM node:8
ENV NODE_ENV production

WORKDIR /backend

# Copy package.json and install dependencies
COPY ["../package.json", "../package-lock.json*", "Dockerfile", "LICENSE", "README.md", "./"]
RUN npm install --production --silent

# Copy rest of the application source code
COPY . .

# Run app.js with debugging port when container launches
# ENTRYPOINT ["node", "--inspect=9229", "app.js"]

# Comment above and uncomment below to run app.js without debugger port when container launches
# ENTRYPOINT ["node", "app.js"]

FROM gcr.io/distroless/nodejs
ENV NODE_ENV production
COPY --from=build-env /backend /backend
# EXPOSE 3000
WORKDIR /backend
CMD ["backend.js"]