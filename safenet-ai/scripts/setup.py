#!/usr/bin/env python3
"""
scripts/setup.py
One-time setup: install dependencies, check Ollama, create .env from template.
Run:  python scripts/setup.py
"""

import subprocess
import sys
import os
import shutil

ROOT = os.path.dirname(os.path.dirname(__file__))


def run(cmd, check=True):
    print(f"  $ {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.stdout.strip(): print("   ", result.stdout.strip())
    if result.returncode != 0 and check:
        print(f"   [!] Error: {result.stderr.strip()}")
    return result.returncode == 0


def main():
    print("\n╔══════════════════════════════════╗")
    print("║  SafeNet AI — Setup              ║")
    print("╚══════════════════════════════════╝\n")

    # 1. Python check
    print("▸ Python version:", sys.version.split()[0])
    if sys.version_info < (3, 9):
        print("[!] Python 3.9+ required")
        sys.exit(1)

    # 2. Install pip packages
    print("\n▸ Installing Python dependencies…")
    run(f"{sys.executable} -m pip install -r {ROOT}/requirements.txt --quiet")

    # 3. .env
    env_example = os.path.join(ROOT, ".env.example")
    env_file    = os.path.join(ROOT, ".env")
    if not os.path.exists(env_file):
        shutil.copy(env_example, env_file)
        print(f"\n▸ Created .env from template → edit {env_file}")
    else:
        print(f"\n▸ .env already exists — skipping")

    # 4. Ollama check
    print("\n▸ Checking Ollama (local LLM)…")
    if shutil.which("ollama"):
        print("  ✓ Ollama is installed")
        r = subprocess.run("ollama list", shell=True, capture_output=True, text=True)
        if r.returncode == 0:
            lines = r.stdout.strip().split("\n")
            print(f"  ✓ Ollama running — {len(lines)-1} model(s) available:")
            for line in lines[1:]:
                if line.strip(): print(f"    · {line.split()[0]}")
        else:
            print("  ⚠ Ollama installed but not running. Start it with: ollama serve")
    else:
        print("  ⚠ Ollama not found. Install from https://ollama.com")
        print("    Then: ollama pull llama3")
        print("    SafeNet AI will fall back to Claude API if Ollama is absent.")

    # 5. Create data dirs
    os.makedirs(os.path.join(ROOT, "data", "cache"), exist_ok=True)

    print("\n╔══════════════════════════════════╗")
    print("║  Setup complete!                 ║")
    print("╠══════════════════════════════════╣")
    print("║  1. Edit .env with your keys     ║")
    print("║  2. Run: python main.py          ║")
    print("║  3. Open http://localhost:5000   ║")
    print("╚══════════════════════════════════╝\n")


if __name__ == "__main__":
    main()
