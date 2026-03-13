#!/bin/bash
# Gemini Fine-tuning via REST API
# Usage: ./scripts/finetune.sh [training_data_api.jsonl]

set -e

TRAINING_FILE="${1:-training_data_api.jsonl}"
API_KEY="${GEMINI_API_KEY:-AIzaSyAwMfmMSo6q6bJ7cDpRihrvOOoXkRDIjGM}"
BASE_MODEL="models/gemini-2.0-flash-lite-001-tuning"
DISPLAY_NAME="recta-nightwork-advisor"
EPOCH_COUNT=3
BATCH_SIZE=4
LEARNING_RATE=0.0005

if [ ! -f "$TRAINING_FILE" ]; then
    echo "Error: Training file not found: $TRAINING_FILE"
    exit 1
fi

PAIR_COUNT=$(wc -l < "$TRAINING_FILE")
echo "=== Gemini Fine-tuning ==="
echo "Training file: $TRAINING_FILE ($PAIR_COUNT pairs)"
echo "Base model: $BASE_MODEL"
echo "Epochs: $EPOCH_COUNT, Batch: $BATCH_SIZE, LR: $LEARNING_RATE"
echo ""

# Build training examples JSON using python3
echo "Building training data payload..."
PAYLOAD_FILE=$(mktemp)

python3 -c "
import json, sys

examples = []
with open('$TRAINING_FILE', 'r') as f:
    for line in f:
        examples.append(json.loads(line.strip()))

payload = {
    'display_name': '$DISPLAY_NAME',
    'base_model': '$BASE_MODEL',
    'tuning_task': {
        'hyperparameters': {
            'epoch_count': $EPOCH_COUNT,
            'batch_size': $BATCH_SIZE,
            'learning_rate_multiplier': $LEARNING_RATE
        },
        'training_data': {
            'examples': {
                'examples': examples
            }
        }
    }
}

with open('$PAYLOAD_FILE', 'w') as f:
    json.dump(payload, f, ensure_ascii=False)

print(f'Payload built: {len(examples)} examples')
"

# Create tuning job
echo "Creating tuning job..."
RESPONSE=$(curl -s -X POST \
    "https://generativelanguage.googleapis.com/v1beta/tunedModels?key=$API_KEY" \
    -H "Content-Type: application/json" \
    -d @"$PAYLOAD_FILE")

rm -f "$PAYLOAD_FILE"

echo ""
echo "=== Response ==="
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

# Extract operation name for status checking
OP_NAME=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('name',''))" 2>/dev/null || echo "")

if [ -n "$OP_NAME" ]; then
    echo ""
    echo "=== Tuning job started! ==="
    echo "Operation: $OP_NAME"
    echo ""
    echo "Check status with:"
    echo "  curl -s 'https://generativelanguage.googleapis.com/v1beta/$OP_NAME?key=$API_KEY' | python3 -m json.tool"
    echo ""
    echo "List tuned models:"
    echo "  curl -s 'https://generativelanguage.googleapis.com/v1beta/tunedModels?key=$API_KEY' | python3 -m json.tool"
else
    echo ""
    echo "Check the response above for errors."
fi
