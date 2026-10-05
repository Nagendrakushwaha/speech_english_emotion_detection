#!/usr/bin/env node

/**
 * Cognivision Voice Intelligence - Unified Development Server Orchestrator
 *
 * Runs both the FastAPI Backend (port 8000) and the React/Vite Frontend (port 5173)
 * concurrently with clean logging, auto port-conflict recovery, and graceful termination.
 */

const { spawn, execSync } = require('child_process');
const net = require('net');
const http = require('http');
const path = require('path');
const os = require('os');

const ROOT_DIR = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');

// ANSI formatting
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const MAGENTA = '\x1b[35m';

function log(prefix, color, message) {
  if (!message) return;
  const lines = message.toString().split(/\r?\n/);
  for (const line of lines) {
    if (line.trim().length > 0) {
      console.log(`${color}${BOLD}[${prefix}]${RESET} ${line}`);
    }
  }
}

function checkPort(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let inUse = false;

    socket.setTimeout(800);
    socket.once('connect', () => {
      inUse = true;
      socket.destroy();
    });
    socket.once('timeout', () => {
      socket.destroy();
    });
    socket.once('error', () => {
      socket.destroy();
    });
    socket.once('close', () => {
      resolve(inUse);
    });

    socket.connect(port, host);
  });
}

function checkHttpHealth(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 1500 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

function getPidForPort(port) {
  if (os.platform() !== 'win32') return null;
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    const lines = out.trim().split(/\r?\n/);
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 5 && parts[3] === 'LISTENING') {
        const pid = parseInt(parts[4], 10);
        if (!isNaN(pid) && pid > 0) return pid;
      }
    }
  } catch (e) {
    // Port not listed or findstr exited non-zero
  }
  return null;
}

function getPythonCommand() {
  const candidates = ['python', 'py', 'python3'];
  for (const cmd of candidates) {
    try {
      execSync(`${cmd} --version`, { stdio: 'ignore' });
      return cmd;
    } catch (e) {
      // try next candidate
    }
  }
  return 'python';
}

function killProcess(pid) {
  if (!pid) return;
  try {
    if (os.platform() === 'win32') {
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
    } else {
      process.kill(-pid, 'SIGTERM');
    }
  } catch (e) {
    // Process already exited
  }
}

async function main() {
  console.log(`\n${MAGENTA}${BOLD}╔═══════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${MAGENTA}${BOLD}║        Cognivision Voice Intelligence - Dev Orchestrator       ║${RESET}`);
  console.log(`${MAGENTA}${BOLD}╠═══════════════════════════════════════════════════════════════╣${RESET}`);
  console.log(`${MAGENTA}${BOLD}║${RESET}  ${CYAN}Backend API:${RESET}  http://127.0.0.1:8000  (Docs: /docs)          ${MAGENTA}${BOLD}║${RESET}`);
  console.log(`${MAGENTA}${BOLD}║${RESET}  ${GREEN}Frontend UI:${RESET}  http://localhost:5173                             ${MAGENTA}${BOLD}║${RESET}`);
  console.log(`${MAGENTA}${BOLD}║${RESET}  ${YELLOW}Shutdown:${RESET}     Press Ctrl+C to terminate both servers cleanly  ${MAGENTA}${BOLD}║${RESET}`);
  console.log(`${MAGENTA}${BOLD}╚═══════════════════════════════════════════════════════════════╝${RESET}\n`);

  const activePids = [];
  let isShuttingDown = false;

  function shutdown(signal = 'SIGINT') {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n${YELLOW}${BOLD}[SYSTEM]${RESET} Stopping all running services (${signal})...`);
    for (const pid of activePids) {
      killProcess(pid);
    }
    setTimeout(() => {
      console.log(`${YELLOW}${BOLD}[SYSTEM]${RESET} All processes stopped. Goodbye!\n`);
      process.exit(0);
    }, 400);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // 1. Launch / Verify Backend on port 8000
  let isPort8000InUse = await checkPort(8000);
  let backendStarted = false;

  if (isPort8000InUse) {
    const isHealthy = await checkHttpHealth('http://127.0.0.1:8000/health');
    if (isHealthy) {
      log('BACKEND', CYAN, 'FastAPI backend is already active & healthy on http://127.0.0.1:8000.');
      backendStarted = true;
    } else {
      const stalePid = getPidForPort(8000);
      if (stalePid) {
        log('BACKEND', YELLOW, `Port 8000 is occupied by inactive/stale process PID ${stalePid}. Clearing...`);
        killProcess(stalePid);
        await new Promise((r) => setTimeout(r, 1200));
        isPort8000InUse = await checkPort(8000);
      }
    }
  }

  if (!backendStarted && !isPort8000InUse) {
    const pythonCmd = getPythonCommand();
    log('BACKEND', CYAN, `Starting FastAPI backend (${pythonCmd}) on http://127.0.0.1:8000...`);

    const backendProc = spawn(
      pythonCmd,
      ['-m', 'uvicorn', 'backend.app.main:app', '--host', '127.0.0.1', '--port', '8000', '--reload'],
      {
        cwd: ROOT_DIR,
        shell: false,
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
      }
    );

    if (backendProc.pid) {
      activePids.push(backendProc.pid);
    }

    backendProc.stdout.on('data', (data) => log('BACKEND', CYAN, data));
    backendProc.stderr.on('data', (data) => log('BACKEND', CYAN, data));

    backendProc.on('exit', (code, sig) => {
      if (!isShuttingDown) {
        log('BACKEND', RED, `Backend process exited with code ${code ?? sig}`);
      }
    });
  }

  // 2. Launch / Verify Frontend on port 5173
  const isPort5173InUse = await checkPort(5173);
  if (isPort5173InUse) {
    log('FRONTEND', GREEN, 'Vite dev server is already listening on http://localhost:5173.');
  } else {
    log('FRONTEND', GREEN, 'Starting React/Vite frontend on http://localhost:5173...');

    const frontendProc = os.platform() === 'win32'
      ? spawn('cmd.exe', ['/d', '/s', '/c', 'npm run dev'], { cwd: FRONTEND_DIR })
      : spawn('npm', ['run', 'dev'], { cwd: FRONTEND_DIR });

    if (frontendProc.pid) {
      activePids.push(frontendProc.pid);
    }

    frontendProc.stdout.on('data', (data) => log('FRONTEND', GREEN, data));
    frontendProc.stderr.on('data', (data) => log('FRONTEND', GREEN, data));

    frontendProc.on('exit', (code, sig) => {
      if (!isShuttingDown) {
        log('FRONTEND', RED, `Frontend process exited with code ${code ?? sig}`);
      }
    });
  }
}

main().catch((err) => {
  console.error(`${RED}${BOLD}[ERROR]${RESET} Dev orchestrator error:`, err);
  process.exit(1);
});
