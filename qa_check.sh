#!/bin/bash
curl -s https://airesumer.qzz.io/ > /tmp/live_index.html
echo "=== INDEX (first 15 lines) ==="
head -15 /tmp/live_index.html
B=$(grep -oE '/static/js/main\.[a-z0-9]+\.js' /tmp/live_index.html | head -1)
echo "=== bundle: $B ==="
curl -s "https://airesumer.qzz.io$B" > /tmp/live_bundle.js
wc -c /tmp/live_bundle.js
echo "--- API URL(s) in live bundle ---"
grep -oE 'https://[a-z0-9.-]+\.onrender\.com[^"]*' /tmp/live_bundle.js | sort -u | head -5
echo "--- localhost refs (should be empty) ---"
grep -oE 'localhost:[0-9]+' /tmp/live_bundle.js | sort -u | head -5
echo "--- Firebase API key ---"
grep -oE 'AIzaSy[A-Za-z0-9_-]{10,}' /tmp/live_bundle.js | sort -u | head -3
echo "--- Firebase auth domain ---"
grep -oE '[a-z0-9-]+\.firebaseapp\.com' /tmp/live_bundle.js | sort -u | head -3
echo "--- api endpoint path ---"
grep -oE '/api/[a-z]+' /tmp/live_bundle.js | sort -u | head -10
echo DONE
