FROM quay.io/apibara/sink-webhook:0.6.0 as sink-webhook

WORKDIR /indexer
COPY ./packages/indexer/script.js .

CMD ["run", "script.js", "--allow-env-from-env", "BROLY_CONTRACT_ADDRESS,AUTH_TOKEN,CONSUMER_TARGET_URL,APIBARA_STREAM_URL,PERSIST_TO_REDIS,INDEXER_ID", "--allow-net", "--sink-id", "broly-sink-id"]
