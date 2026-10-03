import hashlib
import json
from typing import List, Dict, Any, Optional
from backend.database import get_db
from backend.core.forensic_dna import forensic_dna_engine

class FingerprintEngine:
    """
    Extracts Attack DNA behavioral tokens and deep 4-layer Forensic Genome
    (Silicon, Volume, Host Heritage Dust, Behavioral Telemetry).
    """
    def extract_fingerprint(self, session_id: str, mount_point: Optional[str] = None, device_meta: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        # Synthesize multi-layer genome
        genome = forensic_dna_engine.synthesize_genome(session_id, mount_point=mount_point, device_meta=device_meta)
        
        return {
            "session_id": session_id,
            "dna_hash": genome["master_barcode"],
            "cluster_family": genome["cluster_family"],
            "tokens": genome["behavior"]["tokens"],
            "genome": genome
        }

    def extract_forensic_dna(self, session_id: str, mount_point: Optional[str] = None, item: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return self.extract_fingerprint(session_id, mount_point=mount_point, device_meta=item)

    def compare_fingerprints(self, session_id_1: str, session_id_2: str) -> Dict[str, Any]:
        return forensic_dna_engine.compare_genomes(session_id_1, session_id_2)

fingerprint_engine = FingerprintEngine()
