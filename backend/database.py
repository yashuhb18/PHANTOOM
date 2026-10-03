import sqlite3
from pathlib import Path
from backend.config import DB_PATH, DECOY_DIR

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=20.0)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
    except Exception:
        pass
    return conn

def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    DECOY_DIR.mkdir(parents=True, exist_ok=True)

    conn = get_db()
    cursor = conn.cursor()

    # Verify if legacy schema exists and upgrade
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='canary_traps'")
    if cursor.fetchone():
        cursor.execute("PRAGMA table_info(canary_traps)")
        cols = [c[1] for c in cursor.fetchall()]
        if "filename" not in cols:
            cursor.execute("DROP TABLE IF EXISTS canary_traps")
            cursor.execute("DROP TABLE IF EXISTS canary_hits")
            conn.commit()

    # 1. Sessions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            device_name TEXT NOT NULL,
            vendor_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            serial_number TEXT,
            mount_point TEXT,
            inserted_at TEXT NOT NULL,
            removed_at TEXT,
            status TEXT DEFAULT 'ACTIVE',
            risk_score INTEGER DEFAULT 0,
            attack_detected BOOLEAN DEFAULT 0,
            event_count INTEGER DEFAULT 0
        )
    """)

    # 2. Events table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS events (
            event_id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            source TEXT NOT NULL,
            event_type TEXT NOT NULL,
            severity TEXT NOT NULL,
            data_json TEXT NOT NULL,
            risk_score_delta INTEGER DEFAULT 0,
            FOREIGN KEY (session_id) REFERENCES sessions(session_id)
        )
    """)

    # 3. Attack Chains / Graphs
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS attack_chains (
            session_id TEXT PRIMARY KEY,
            nodes_json TEXT NOT NULL,
            edges_json TEXT NOT NULL,
            root_cause TEXT,
            critical_path_json TEXT,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(session_id)
        )
    """)

    # 4. Fingerprints (Attack DNA & Multi-Layer Forensic Genome)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS fingerprints (
            session_id TEXT PRIMARY KEY,
            dna_hash TEXT NOT NULL,
            cluster_family TEXT NOT NULL,
            tokens_json TEXT NOT NULL,
            genome_json TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(session_id)
        )
    """)
    try:
        cursor.execute("ALTER TABLE fingerprints ADD COLUMN genome_json TEXT")
    except Exception:
        pass

    # 5. Canary Traps (Decoys)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS canary_traps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL UNIQUE,
            path TEXT NOT NULL,
            file_type TEXT NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_at TEXT NOT NULL
        )
    """)

    # 6. Canary Hits
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS canary_hits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trap_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            session_id TEXT,
            process_name TEXT,
            process_id INTEGER,
            action TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (trap_id) REFERENCES canary_traps(id)
        )
    """)

    # 7. Alerts & Autonomous Actions
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            alert_type TEXT NOT NULL,
            severity TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            mitre_technique TEXT,
            status TEXT DEFAULT 'TRIGGERED',
            created_at TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(session_id)
        )
    """)

    # 8. Device Hardware History & Allowlist
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS devices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vendor_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            device_name TEXT NOT NULL,
            serial_number TEXT,
            trust_status TEXT DEFAULT 'UNTRUSTED',
            first_seen TEXT NOT NULL,
            last_seen TEXT NOT NULL,
            session_count INTEGER DEFAULT 1,
            UNIQUE(vendor_id, product_id, serial_number)
        )
    """)

    # 9. File Scans (Threat Scanner Results)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS file_scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_name TEXT NOT NULL,
            file_type TEXT NOT NULL,
            file_size INTEGER,
            sha256_hash TEXT,
            threat_score INTEGER DEFAULT 0,
            threat_indicators TEXT,
            action_taken TEXT DEFAULT 'ANALYZED',
            scanned_at TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(session_id)
        )
    """)

    conn.commit()

    # Seed default decoy traps if empty
    cursor.execute("SELECT COUNT(*) FROM canary_traps")
    if cursor.fetchone()[0] == 0:
        default_decoys = [
            (".aws_creds_canary", str(DECOY_DIR / ".aws_creds_canary"), "AWS_CREDENTIALS", "Simulated AWS credentials decoy with alert webhook token"),
            ("passwords_2026.xlsx", str(DECOY_DIR / "passwords_2026.xlsx"), "PASSWORDS_SPREADSHEET", "Lure enterprise credentials workbook with canary trigger"),
            ("id_rsa_backup", str(DECOY_DIR / "id_rsa_backup"), "SSH_KEY", "Decoy root SSH private key with honeypot trap"),
            ("kube_config_prod", str(DECOY_DIR / "kube_config_prod"), "KUBERNETES_CONFIG", "Fake Kubernetes cluster production credential token")
        ]
        for filename, path, ftype, desc in default_decoys:
            try:
                # Write physical decoy files
                with open(path, "w", encoding="utf-8") as f:
                    f.write(f"# PHANTOM HONEYPOT DECOY: {filename}\n# TRAP_ID: canary_{filename}\nALERT_WEBHOOK=http://127.0.0.1:8001/api/canary/trip\n")
            except Exception:
                pass

            cursor.execute("""
                INSERT INTO canary_traps (filename, path, file_type, description, is_active, created_at)
                VALUES (?, ?, ?, ?, 1, datetime('now'))
            """, (filename, path, ftype, desc))
        conn.commit()

    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
