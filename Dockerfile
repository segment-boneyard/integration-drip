FROM segment/integration-worker:4.0.0-alpha

COPY . /integration
WORKDIR /integration

RUN npm rebuild
