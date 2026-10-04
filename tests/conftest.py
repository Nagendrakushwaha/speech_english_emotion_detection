import sys
from pathlib import Path

# Add backend and project root to sys.path
project_root = Path(__file__).resolve().parent.parent
backend_dir = project_root / "backend"

if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))
