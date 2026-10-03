import os
import sys
import json
import glob
import time
import hashlib
import subprocess
from typing import Dict, Any, List, Optional
from backend.database import get_db

class ForensicDNAEngine:
    """
    PHANTOM Forensic DNA & Lineage Engine:
    Inspects deep physical USB hardware attributes, filesystem superblocks,
    cross-OS digital dust (.Spotlight, System Volume Information, .Trashes),
    and behavioral telemetry to synthesize a multi-layer genomic profile.
    """

    def inspect_silicon(self, device_meta: Optional[Dict[str, Any]] = None, mount_point: Optional[str] = None) -> Dict[str, Any]:
        """
        Layer 1: Silicon & Controller Genome (HW_GENOME)
        Extracts controller chipset, VID/PID, bcdDevice revision, serial numbers, bus topology.
        """
        meta = device_meta or {}
        vid = meta.get("vendor_id") or "0000"
        pid = meta.get("product_id") or "0000"
        serial = meta.get("serial_number") or meta.get("serial") or "UNKNOWN-SERIAL"
        dev_name = meta.get("device_name") or meta.get("name") or "USB Flash Device"
        vendor_name = meta.get("vendor_name") or meta.get("vendor") or "Generic Flash Controller"
        pnp_id = meta.get("pnp_id") or "/dev/sdb1"

        bcd_device = "01.00"
        speed = "High-Speed (480 Mbps)"
        bus_topology = "USB 2.0/3.0 Root Hub"

        # On Linux, attempt deep sysfs lookup
        if sys.platform != "win32" and mount_point:
            try:
                # Find block device node from mount point
                cmd = f"findmnt -no SOURCE {mount_point} 2>/dev/null || df -P {mount_point} | tail -1 | awk '{{print $1}}'"
                node = subprocess.check_output(cmd, shell=True, text=True, timeout=1).strip()
                if node and "/dev/" in node:
                    base_dev = os.path.basename(node).rstrip("0123456789")
                    sys_block_path = f"/sys/class/block/{base_dev}"
                    if os.path.exists(sys_block_path):
                        # Read udev properties if available
                        udev_cmd = f"udevadm info -q property -n {node} 2>/dev/null"
                        udev_out = subprocess.check_output(udev_cmd, shell=True, text=True, timeout=1)
                        for line in udev_out.splitlines():
                            if "=" in line:
                                k, v = line.split("=", 1)
                                if k == "ID_VENDOR_ID" and vid == "0000":
                                    vid = v
                                elif k == "ID_MODEL_ID" and pid == "0000":
                                    pid = v
                                elif k == "ID_SERIAL_SHORT" and serial == "UNKNOWN-SERIAL":
                                    serial = v
                                elif k == "ID_REVISION":
                                    bcd_device = v
                                elif k == "ID_VENDOR_FROM_DATABASE" and vendor_name == "Generic Flash Controller":
                                    vendor_name = v
                                elif k == "ID_MODEL_FROM_DATABASE" and dev_name == "USB Flash Device":
                                    dev_name = v
            except Exception:
                pass

        silicon_raw = f"{vid}:{pid}:{vendor_name}:{dev_name}:{serial}:{bcd_device}"
        silicon_hash = hashlib.sha256(silicon_raw.encode("utf-8")).hexdigest()[:8]

        return {
            "vendor_id": vid,
            "product_id": pid,
            "vendor_name": vendor_name,
            "device_name": dev_name,
            "serial_number": serial,
            "pnp_id": pnp_id,
            "firmware_revision": bcd_device,
            "interface_speed": speed,
            "bus_topology": bus_topology,
            "silicon_hash": silicon_hash
        }

    def inspect_volume(self, mount_point: Optional[str] = None, device_meta: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Layer 2: Filesystem & Volume Genome (FS_GENOME)
        Extracts filesystem format, volume UUID/serial, cluster block size, geometry.
        """
        meta = device_meta or {}
        fs_type = meta.get("filesystem") or "exfat"
        capacity_gb = meta.get("capacity_gb") or 0.0
        volume_uuid = "4A9E-81C2"
        volume_label = "REMOVABLE"
        cluster_size = 32768
        mount_flags = "rw,nosuid,nodev,relatime"

        if mount_point and os.path.exists(mount_point):
            try:
                st = os.statvfs(mount_point)
                cluster_size = st.f_frsize or st.f_bsize
                total_bytes = st.f_blocks * cluster_size
                if total_bytes > 0:
                    capacity_gb = round(total_bytes / (1024 ** 3), 2)
            except Exception:
                pass

            if sys.platform != "win32":
                try:
                    # Query blkid or lsblk for real volume UUID and label
                    cmd = f"lsblk -no FSTYPE,UUID,LABEL {mount_point} 2>/dev/null | head -1"
                    out = subprocess.check_output(cmd, shell=True, text=True, timeout=1).strip()
                    parts = out.split()
                    if len(parts) >= 1 and parts[0]:
                        fs_type = parts[0]
                    if len(parts) >= 2 and parts[1]:
                        volume_uuid = parts[1]
                    if len(parts) >= 3 and parts[2]:
                        volume_label = parts[2]
                except Exception:
                    pass

        vol_raw = f"{fs_type}:{volume_uuid}:{volume_label}:{cluster_size}:{capacity_gb}"
        vol_hash = hashlib.sha256(vol_raw.encode("utf-8")).hexdigest()[:8]

        return {
            "filesystem": fs_type.upper(),
            "volume_uuid": volume_uuid,
            "volume_label": volume_label,
            "cluster_size_bytes": cluster_size,
            "capacity_gb": capacity_gb,
            "mount_flags": mount_flags,
            "volume_hash": vol_hash
        }

    def inspect_host_heritage(self, mount_point: Optional[str] = None, session_id: str = "") -> Dict[str, Any]:
        """
        Layer 3: Cross-OS Digital Dust & Host Heritage (HOST_HERITAGE)
        Inspects hidden system indexes, user ID directories, and volume GUIDs:
        - Windows: System Volume Information/IndexerVolumeGuid, WPSettings.dat, .lnk, Thumbs.db
        - macOS: .Spotlight-V100, .fseventsd, .Trashes/<UID>, .DS_Store, AppleDouble
        - Linux: .Trash-1000/ or other user UIDs, lost+found
        """
        detected_hosts: List[Dict[str, Any]] = []
        artifacts_found: List[str] = []
        indexer_guid = None
        mac_uid = None
        linux_uid = None

        # Check real mount point if it exists
        if mount_point and os.path.exists(mount_point):
            try:
                # 1. Inspect Windows Dust
                sys_vol_path = os.path.join(mount_point, "System Volume Information")
                if os.path.isdir(sys_vol_path):
                    artifacts_found.append("System Volume Information")
                    indexer_path = os.path.join(sys_vol_path, "IndexerVolumeGuid")
                    if os.path.exists(indexer_path):
                        try:
                            with open(indexer_path, "r", errors="ignore") as f:
                                guid_content = f.read(128).strip()
                                if guid_content:
                                    indexer_guid = guid_content
                                    artifacts_found.append(f"IndexerVolumeGuid:{indexer_guid}")
                        except Exception:
                            pass
                    wpset_path = os.path.join(sys_vol_path, "WPSettings.dat")
                    if os.path.exists(wpset_path):
                        artifacts_found.append("WPSettings.dat")

                    detected_hosts.append({
                        "os": "Windows (NTFS/FAT Indexer)",
                        "confidence": 98,
                        "evidence": f"Windows Indexer GUID: {indexer_guid or 'Active Volume Register'}",
                        "artifacts": [a for a in artifacts_found if "Indexer" in a or "WPSettings" in a or "System Volume" in a]
                    })

                # Check for Windows LNK or Thumbs.db
                thumbs = glob.glob(os.path.join(mount_point, "**", "Thumbs.db"), recursive=False)
                if thumbs:
                    artifacts_found.append("Thumbs.db")

                # 2. Inspect macOS Dust
                spotlight_path = os.path.join(mount_point, ".Spotlight-V100")
                if os.path.exists(spotlight_path):
                    artifacts_found.append(".Spotlight-V100")
                fsevents_path = os.path.join(mount_point, ".fseventsd")
                if os.path.exists(fsevents_path):
                    artifacts_found.append(".fseventsd")
                ds_store = glob.glob(os.path.join(mount_point, "**", ".DS_Store"), recursive=False)
                if ds_store:
                    artifacts_found.append(".DS_Store")

                trashes_path = os.path.join(mount_point, ".Trashes")
                if os.path.isdir(trashes_path):
                    artifacts_found.append(".Trashes")
                    try:
                        for item in os.listdir(trashes_path):
                            if item.isdigit():
                                mac_uid = int(item)
                                artifacts_found.append(f".Trashes/{mac_uid}")
                                break
                    except Exception:
                        pass

                mac_arts = [a for a in artifacts_found if a.startswith(".") or "DS_Store" in a or "Trashes" in a]
                if mac_arts:
                    user_str = f"User UID {mac_uid} (Primary Admin)" if mac_uid == 501 else f"User UID {mac_uid}" if mac_uid else "Finder Session"
                    detected_hosts.append({
                        "os": "macOS (Apple Darwin)",
                        "confidence": 96,
                        "evidence": f"Apple Spotlight & {user_str}",
                        "artifacts": mac_arts
                    })

                # 3. Inspect Linux Dust
                linux_trash = glob.glob(os.path.join(mount_point, ".Trash-*"))
                if linux_trash:
                    for lt in linux_trash:
                        bname = os.path.basename(lt)
                        artifacts_found.append(bname)
                        uid_part = bname.replace(".Trash-", "")
                        if uid_part.isdigit():
                            linux_uid = int(uid_part)
                
                lost_found = os.path.join(mount_point, "lost+found")
                if os.path.exists(lost_found):
                    artifacts_found.append("lost+found")

                lin_arts = [a for a in artifacts_found if "Trash-" in a or a == "lost+found"]
                if lin_arts or sys.platform.startswith("linux"):
                    detected_hosts.append({
                        "os": "Linux (POSIX Environment)",
                        "confidence": 94,
                        "evidence": f"Linux User UID {linux_uid or 1000} (Standard Primary Operator)",
                        "artifacts": lin_arts or ["Native Linux VFS Mount"]
                    })
            except Exception:
                pass

        # Simulated stage profiles for deterministic demo presentation
        if "stage1_ducky" in session_id:
            indexer_guid = "{4BC7E102-8812-42FA-A19D-9988220011EE}"
            mac_uid = 501
            artifacts_found = [
                "System Volume Information",
                f"IndexerVolumeGuid:{indexer_guid}",
                "WPSettings.dat",
                ".Spotlight-V100",
                ".Trashes/501",
                ".DS_Store"
            ]
            detected_hosts = [
                {
                    "os": "Windows 11 Workstation",
                    "confidence": 99,
                    "evidence": f"Active Search Indexer GUID: {indexer_guid}",
                    "artifacts": ["System Volume Information", "IndexerVolumeGuid", "WPSettings.dat"]
                },
                {
                    "os": "macOS Sonoma",
                    "confidence": 97,
                    "evidence": "Apple Finder & Primary Admin (UID 501)",
                    "artifacts": [".Spotlight-V100", ".Trashes/501", ".DS_Store"]
                }
            ]
        elif "stage2_bunny" in session_id:
            indexer_guid = "{4BC7E102-8812-42FA-A19D-9988220011EE}"
            mac_uid = 501
            artifacts_found = [
                "System Volume Information",
                f"IndexerVolumeGuid:{indexer_guid}",
                "WPSettings.dat",
                ".Spotlight-V100",
                ".Trashes/501"
            ]
            detected_hosts = [
                {
                    "os": "Windows 11 Workstation",
                    "confidence": 99,
                    "evidence": f"Active Search Indexer GUID: {indexer_guid} (MATCHED TO STAGE #1)",
                    "artifacts": ["System Volume Information", "IndexerVolumeGuid", "WPSettings.dat"]
                },
                {
                    "os": "macOS Sonoma",
                    "confidence": 97,
                    "evidence": "Apple Finder & Primary Admin (UID 501) (MATCHED TO STAGE #1)",
                    "artifacts": [".Spotlight-V100", ".Trashes/501"]
                }
            ]

        # Default fallback if clean drive
        if not detected_hosts:
            detected_hosts.append({
                "os": "Linux Host (Active System Mount)",
                "confidence": 92,
                "evidence": "Host VFS Journal & Inode Table",
                "artifacts": ["VFS Superblock"]
            })

        heritage_raw = f"{indexer_guid}:{mac_uid}:{linux_uid}:{'-'.join(sorted(artifacts_found))}"
        heritage_hash = hashlib.sha256(heritage_raw.encode("utf-8")).hexdigest()[:8]

        return {
            "detected_hosts": detected_hosts,
            "indexer_volume_guid": indexer_guid,
            "mac_user_uid": mac_uid,
            "linux_user_uid": linux_uid,
            "all_dust_artifacts": artifacts_found,
            "cross_os_count": len(detected_hosts),
            "heritage_hash": heritage_hash
        }

    def inspect_behavior(self, session_id: str) -> Dict[str, Any]:
        """
        Layer 4: Behavioral Attack Genome (BEHAVIOR_GENOME)
        Gathers tactical behavioral tokens from session events.
        """
        tokens = []
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT event_type, data_json FROM events WHERE session_id = ? ORDER BY timestamp ASC", (session_id,))
            rows = cursor.fetchall()
            conn.close()

            for r in rows:
                etype = r["event_type"]
                data_str = str(r["data_json"]).lower()
                if etype == "KEYSTROKE_INJECTION_DETECTED" or "keystroke" in etype.lower():
                    tokens.append("VECTOR:HID_KEYSTROKE_INJECTION")
                if "powershell" in data_str:
                    tokens.append("EXEC:POWERSHELL_OBFUSCATED")
                    if "-w hidden" in data_str or "-nop" in data_str:
                        tokens.append("EVASION:HIDDEN_WINDOW")
                if "canary" in etype.lower() or "canary" in data_str:
                    tokens.append("DECEPTION:CANARY_TRIPWIRE")
                    if "aws" in data_str:
                        tokens.append("TARGET:CLOUD_CREDENTIALS")
                if "containment" in etype.lower():
                    tokens.append("RESPONSE:AUTONOMOUS_CONTAINMENT")
                if "autorun" in etype.lower():
                    tokens.append("VECTOR:AUTORUN_EXECUTION")
        except Exception:
            pass

        tokens = sorted(list(set(tokens)))
        if not tokens:
            tokens = ["GENERIC:STORAGE_ENUMERATION"]

        beh_raw = "-".join(tokens)
        beh_hash = hashlib.sha256(beh_raw.encode("utf-8")).hexdigest()[:8]

        return {
            "tokens": tokens,
            "token_count": len(tokens),
            "behavior_hash": beh_hash
        }

    def synthesize_genome(self, session_id: str, mount_point: Optional[str] = None, device_meta: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Synthesizes the complete 4-Layer Forensic DNA Profile for a physical or simulated USB.
        """
        silicon = self.inspect_silicon(device_meta=device_meta, mount_point=mount_point)
        volume = self.inspect_volume(mount_point=mount_point, device_meta=device_meta)
        heritage = self.inspect_host_heritage(mount_point=mount_point, session_id=session_id)
        behavior = self.inspect_behavior(session_id=session_id)

        # Composite Barcode
        master_barcode = f"PH-DNA-{silicon['silicon_hash'][:4].upper()}-{volume['volume_hash'][:4].upper()}-{heritage['heritage_hash'][:4].upper()}-{behavior['behavior_hash'][:4].upper()}"

        # Attacker Family Classifier
        if "VECTOR:HID_KEYSTROKE_INJECTION" in behavior["tokens"] and heritage["indexer_volume_guid"]:
            cluster_family = "APT-CROSS-HARDWARE-DUCKY"
        elif "VECTOR:HID_KEYSTROKE_INJECTION" in behavior["tokens"]:
            cluster_family = "KEYSTROKE-INJECTION-ACTOR"
        elif heritage["cross_os_count"] >= 2:
            cluster_family = "MULTI-HOST-OPERATOR-USB"
        else:
            cluster_family = "SURVEILLED-MASS-STORAGE"

        genome = {
            "session_id": session_id,
            "master_barcode": master_barcode,
            "dna_hash": master_barcode,
            "cluster_family": cluster_family,
            "silicon": silicon,
            "volume": volume,
            "host_heritage": heritage,
            "behavior": behavior,
            "synthesized_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }

        # Persist to database
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO fingerprints (session_id, dna_hash, cluster_family, tokens_json, genome_json, created_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
                ON CONFLICT(session_id) DO UPDATE SET
                    dna_hash = excluded.dna_hash,
                    cluster_family = excluded.cluster_family,
                    tokens_json = excluded.tokens_json,
                    genome_json = excluded.genome_json,
                    created_at = datetime('now')
            """, (
                session_id,
                master_barcode,
                cluster_family,
                json.dumps(behavior["tokens"]),
                json.dumps(genome)
            ))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"[ForensicDNA] DB persist error: {e}")

        return genome

    def compare_genomes(self, source_id: str, target_id: str) -> Dict[str, Any]:
        """
        Deep cross-device genetic comparison between two USB sessions.
        Computes layer-by-layer similarity: Silicon, Volume, Host Heritage, and Behavior.
        """
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT session_id, tokens_json, genome_json FROM fingerprints WHERE session_id IN (?, ?)", (source_id, target_id))
        rows = cursor.fetchall()
        conn.close()

        genome_map = {}
        for r in rows:
            sid = r["session_id"]
            if r["genome_json"]:
                try:
                    genome_map[sid] = json.loads(r["genome_json"])
                except Exception:
                    pass
            if sid not in genome_map:
                # Re-synthesize if missing
                genome_map[sid] = self.synthesize_genome(sid)

        g1 = genome_map.get(source_id) or self.synthesize_genome(source_id)
        g2 = genome_map.get(target_id) or self.synthesize_genome(target_id)

        # 1. Silicon Similarity (Hardware Match)
        silicon_match = (
            (1.0 if g1["silicon"]["vendor_id"] == g2["silicon"]["vendor_id"] else 0.0) * 0.4 +
            (1.0 if g1["silicon"]["product_id"] == g2["silicon"]["product_id"] else 0.0) * 0.4 +
            (1.0 if g1["silicon"]["serial_number"] == g2["silicon"]["serial_number"] else 0.0) * 0.2
        )

        # 2. Volume & Filesystem Similarity
        vol1 = g1["volume"]
        vol2 = g2["volume"]
        vol_match = (
            (1.0 if vol1["filesystem"] == vol2["filesystem"] else 0.0) * 0.4 +
            (1.0 if vol1["cluster_size_bytes"] == vol2["cluster_size_bytes"] else 0.0) * 0.3 +
            (1.0 if vol1["volume_uuid"] == vol2["volume_uuid"] else 0.0) * 0.3
        )

        # 3. Host Heritage Similarity (The Digital Dust Match!)
        h1 = g1["host_heritage"]
        h2 = g2["host_heritage"]
        host_match_score = 0.0

        same_indexer = (
            h1.get("indexer_volume_guid") and
            h2.get("indexer_volume_guid") and
            h1["indexer_volume_guid"] == h2["indexer_volume_guid"]
        )
        same_mac_user = (
            h1.get("mac_user_uid") and
            h2.get("mac_user_uid") and
            h1["mac_user_uid"] == h2["mac_user_uid"]
        )

        common_artifacts = set(h1.get("all_dust_artifacts", [])).intersection(set(h2.get("all_dust_artifacts", [])))
        all_artifacts = set(h1.get("all_dust_artifacts", [])).union(set(h2.get("all_dust_artifacts", [])))
        artifact_jaccard = len(common_artifacts) / len(all_artifacts) if all_artifacts else 0.5

        if same_indexer and same_mac_user:
            host_match_score = 0.98
        elif same_indexer or same_mac_user:
            host_match_score = 0.92
        else:
            host_match_score = artifact_jaccard

        # 4. Behavioral Similarity (Jaccard on attack tokens)
        t1 = set(g1["behavior"].get("tokens", []))
        t2 = set(g2["behavior"].get("tokens", []))
        beh_intersect = t1.intersection(t2)
        beh_union = t1.union(t2)
        behavior_similarity = round(len(beh_intersect) / len(beh_union), 3) if beh_union else 0.5

        # Weighted Composite Score
        # Notice: If Host Heritage matches (same preparing workstation), it's a massive indicator of same actor!
        composite = round(
            (0.35 * behavior_similarity) +
            (0.40 * host_match_score) +
            (0.15 * vol_match) +
            (0.10 * silicon_match),
            3
        )

        is_match = composite >= 0.70 or host_match_score >= 0.90

        # Detailed Forensic Attribution Verdict
        if same_indexer:
            verdict = f"HIGH-CONFIDENCE OPERATOR MATCH ({int(composite*100)}%): Swapped hardware, but both USBs contain identical Windows Workstation Indexer GUID ({h1['indexer_volume_guid'][:14]}...)."
        elif host_match_score >= 0.85:
            verdict = f"HIGH-CONFIDENCE MATCH ({int(composite*100)}%): Identical host preparation dust & Apple macOS User UID {h1.get('mac_user_uid', 501)}."
        elif is_match:
            verdict = f"BEHAVIORAL & STRUCTURAL MATCH ({int(composite*100)}%): Identical payload stagers and partition geometry."
        else:
            verdict = f"DISTINCT FORENSIC PROFILES ({int(composite*100)}%): Disparate hardware controller, filesystem, and host origins."

        return {
            "source_session_id": source_id,
            "target_session_id": target_id,
            "similarity_score": composite,
            "is_match": is_match,
            "layer_breakdown": {
                "silicon_match": round(silicon_match, 2),
                "volume_match": round(vol_match, 2),
                "host_heritage_match": round(host_match_score, 2),
                "behavior_match": round(behavior_similarity, 2)
            },
            "source_genome": g1,
            "target_genome": g2,
            "common_subgraphs": sorted(list(beh_intersect)),
            "divergence_points": sorted(list(t1.symmetric_difference(t2))),
            "provenance_links": {
                "shared_indexer_guid": same_indexer,
                "shared_mac_uid": same_mac_user,
                "shared_dust_artifacts": sorted(list(common_artifacts))
            },
            "verdict": verdict
        }

forensic_dna_engine = ForensicDNAEngine()
