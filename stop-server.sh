#!/bin/bash

###############################################################################
# Safe Server Shutdown Script
# 
# npm run dev로 시작한 서버를 안전하게 종료합니다.
# Ctrl+C 대신 이 스크립트를 사용하세요.
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  Safe Server Shutdown${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# 1. 현재 디렉토리의 vite 프로세스 찾기
PROJECT_DIR=$(pwd)
VITE_PIDS=$(ps -ef | grep "vite" | grep "$PROJECT_DIR" | grep -v grep | awk '{print $2}')

if [ -z "$VITE_PIDS" ]; then
  echo -e "${GREEN}✓ No running dev server found in this directory${NC}"
  echo ""
  
  # 포트 5173 확인
  PORT_PID=$(lsof -ti :5173 2>/dev/null || true)
  if [ -n "$PORT_PID" ]; then
    echo -e "${YELLOW}⚠️  Port 5173 is in use by another process:${NC}"
    ps -p $PORT_PID -o pid,command
    echo ""
    read -p "Kill this process? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      kill -15 $PORT_PID 2>/dev/null || true
      sleep 1
      if ps -p $PORT_PID > /dev/null 2>&1; then
        kill -9 $PORT_PID 2>/dev/null || true
        echo -e "${GREEN}✓ Force killed PID $PORT_PID${NC}"
      else
        echo -e "${GREEN}✓ Gracefully stopped PID $PORT_PID${NC}"
      fi
    fi
  fi
  exit 0
fi

echo -e "${YELLOW}Found dev server processes:${NC}"
for PID in $VITE_PIDS; do
  ps -p $PID -o pid,command | tail -1
done
echo ""

# 2. SIGTERM으로 graceful shutdown 시도
echo -e "${YELLOW}Step 1: Sending SIGTERM (graceful shutdown)...${NC}"
for PID in $VITE_PIDS; do
  kill -15 $PID 2>/dev/null || true
done

# 3초 대기
sleep 3

# 3. 프로세스가 여전히 살아있는지 확인
REMAINING=$(ps -p $(echo $VITE_PIDS | tr ' ' ',') -o pid= 2>/dev/null | wc -l)

if [ $REMAINING -eq 0 ]; then
  echo -e "${GREEN}✓ All processes gracefully stopped${NC}"
else
  echo -e "${YELLOW}⚠️  Some processes still running. Sending SIGKILL...${NC}"
  for PID in $VITE_PIDS; do
    if ps -p $PID > /dev/null 2>&1; then
      kill -9 $PID 2>/dev/null || true
      echo -e "${GREEN}✓ Force killed PID $PID${NC}"
    fi
  done
fi

echo ""

# 4. 부모 npm 프로세스도 확인
NPM_PIDS=$(ps -ef | grep "npm run dev" | grep "$PROJECT_DIR" | grep -v grep | awk '{print $2}')
if [ -n "$NPM_PIDS" ]; then
  echo -e "${YELLOW}Cleaning up npm processes...${NC}"
  for PID in $NPM_PIDS; do
    kill -15 $PID 2>/dev/null || true
    echo -e "${GREEN}✓ Stopped npm process $PID${NC}"
  done
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Server shutdown completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 포트 상태 확인
if lsof -ti :5173 >/dev/null 2>&1; then
  echo -e "${RED}⚠️  Port 5173 is still in use${NC}"
  lsof -i :5173
else
  echo -e "${GREEN}✓ Port 5173 is now free${NC}"
fi
echo ""

exit 0
