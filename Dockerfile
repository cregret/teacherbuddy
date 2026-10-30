FROM node:22-alpine
WORKDIR /app
COPY --chown=node:node public ./public
COPY --chown=node:node server ./server
COPY --chown=node:node examples ./examples
COPY --chown=node:node licenses ./licenses
COPY --chown=node:node LICENSE ./
COPY --chown=node:node docs/third-party.md ./THIRD_PARTY_NOTICES.md
RUN mkdir /data && chown node:node /data
USER node
ENV HOST=0.0.0.0 PORT=3000 DATA_DIR=/data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/index.cjs"]
