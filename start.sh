#!/bin/bash
cd "$(dirname "$0")"

# Backend
cd backend
if [ ! -f products.db ] || [ ! -f sim_vectors.npy ]; then
  echo "Building database..."
  pip install pandas numpy -q
  python build_db.py
fi
pip install -r requirements.txt -q
uvicorn app:app --reload --port 8000 &
BACK_PID=$!
cd ..

# Frontend
cd frontend
npm install --silent
npm run dev &
FRONT_PID=$!
cd ..

echo ""
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "Press Ctrl+C to stop both"

trap "kill $BACK_PID $FRONT_PID 2>/dev/null" EXIT
wait
