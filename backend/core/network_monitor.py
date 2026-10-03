"""
PHANTOM Real-time Network Telemetry & Socket Monitor
=====================================================
High-frequency 1.0-second network engine providing:
1. Real-time send/receive throughput (Bps, KB/s, MB/s)
2. 60-second rolling bandwidth timeline for Task Manager-style graphs
3. Network adapter hardware descriptors (IP, MAC, MTU, Link Speed, Status)
4. Active socket connection inspection (PID, process name, local/remote IP:port, state)
5. Threat-flagging for suspicious ports and script-engine sockets (Reverse shell risk)
6. Process termination / socket severance capabilities
"""

import time
import datetime
import logging
import threading
from collections import deque
from typing import Dict, Any, List, Optional
import psutil

logger = logging.getLogger("phantom.network_monitor")

# Known ports frequently used by reverse shells, C2 beacons, or hardware attacks
SUSPICIOUS_PORTS = {
    4444, 4443, 1337, 31337, 9001, 8888, 6667, 5555, 1234, 12345, 8081, 9999
}

# Processes that should normally never be listening on raw network sockets
SCRIPT_ENGINES = {
    "powershell.exe", "cmd.exe", "wscript.exe", "cscript.exe", "mshta.exe",
    "nc.exe", "ncat.exe", "netcat.exe", "certutil.exe", "bash.exe", "sh"
}


class NetworkMonitor:
    def __init__(self, history_len: int = 60):
        self.history_len = history_len
        self.history: deque = deque(maxlen=history_len)
        self._lock = threading.Lock()
        self._running = False
        self._thread: Optional[threading.Thread] = None

        self._last_time = time.time()
        self._last_io = None
        self._last_pernic_io = {}
        self._proc_cache: Dict[int, str] = {}
        self._proc_cache_time: Dict[int, float] = {}

        # Initial baseline sample
        try:
            self._last_io = psutil.net_io_counters()
            self._last_pernic_io = psutil.net_io_counters(pernic=True)
        except Exception as e:
            logger.warning(f"Could not read initial net_io_counters: {e}")

        # Seed with initial zero points so the graph is immediately smooth
        now_ts = datetime.datetime.now()
        for i in range(history_len, 0, -1):
            t = (now_ts - datetime.timedelta(seconds=i)).strftime("%H:%M:%S")
            self.history.append({
                "timestamp": t,
                "bytes_sent_sec": 0,
                "bytes_recv_sec": 0,
                "total_bytes_sec": 0,
                "kb_sent_sec": 0.0,
                "kb_recv_sec": 0.0,
                "mb_sent_sec": 0.0,
                "mb_recv_sec": 0.0,
                "packets_sent_sec": 0,
                "packets_recv_sec": 0,
            })

    def start(self):
        """Starts background 1.0-second network sampling thread."""
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._sampling_loop, daemon=True, name="PhantomNetMonitor")
        self._thread.start()
        logger.info("PHANTOM 1.0s Network Monitor background engine started.")

    def stop(self):
        self._running = False
        if self._thread:
            self._thread.join(timeout=2.0)

    def _sampling_loop(self):
        while self._running:
            try:
                self.sample_rates()
            except Exception as e:
                logger.error(f"Error in network sampling loop: {e}")
            time.sleep(1.0)

    def sample_rates(self) -> Dict[str, Any]:
        """Calculates 1-second throughput rate and pushes to rolling history."""
        now = time.time()
        dt = max(0.1, now - self._last_time)

        try:
            curr_io = psutil.net_io_counters()
        except Exception:
            curr_io = self._last_io

        if self._last_io and curr_io:
            bytes_sent_sec = max(0.0, (curr_io.bytes_sent - self._last_io.bytes_sent) / dt)
            bytes_recv_sec = max(0.0, (curr_io.bytes_recv - self._last_io.bytes_recv) / dt)
            packets_sent_sec = max(0.0, (curr_io.packets_sent - self._last_io.packets_sent) / dt)
            packets_recv_sec = max(0.0, (curr_io.packets_recv - self._last_io.packets_recv) / dt)
        else:
            bytes_sent_sec = 0.0
            bytes_recv_sec = 0.0
            packets_sent_sec = 0.0
            packets_recv_sec = 0.0

        self._last_io = curr_io
        self._last_time = now

        point = {
            "timestamp": datetime.datetime.now().strftime("%H:%M:%S"),
            "bytes_sent_sec": round(bytes_sent_sec, 1),
            "bytes_recv_sec": round(bytes_recv_sec, 1),
            "total_bytes_sec": round(bytes_sent_sec + bytes_recv_sec, 1),
            "kb_sent_sec": round(bytes_sent_sec / 1024, 2),
            "kb_recv_sec": round(bytes_recv_sec / 1024, 2),
            "mb_sent_sec": round(bytes_sent_sec / (1024 * 1024), 3),
            "mb_recv_sec": round(bytes_recv_sec / (1024 * 1024), 3),
            "packets_sent_sec": round(packets_sent_sec, 1),
            "packets_recv_sec": round(packets_recv_sec, 1),
        }

        with self._lock:
            self.history.append(point)

        return point

    def _get_process_name(self, pid: Optional[int]) -> str:
        if not pid or pid == 0:
            return "System Idle"
        now = time.time()
        if pid in self._proc_cache and (now - self._proc_cache_time.get(pid, 0)) < 30.0:
            return self._proc_cache[pid]

        try:
            name = psutil.Process(pid).name()
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            name = "System / Protected"
        except Exception:
            name = f"PID:{pid}"

        self._proc_cache[pid] = name
        self._proc_cache_time[pid] = now
        return name

    def get_adapters(self) -> List[Dict[str, Any]]:
        """Returns detailed status of all physical and virtual network adapters."""
        adapters = []
        try:
            stats = psutil.net_if_stats()
            addrs = psutil.net_if_addrs()
            io_pernic = psutil.net_io_counters(pernic=True)
        except Exception as e:
            logger.warning(f"Error reading network adapter stats: {e}")
            return []

        import socket
        for iface_name, iface_stats in stats.items():
            ipv4_list = []
            ipv6_list = []
            mac_address = "N/A"

            if iface_name in addrs:
                for a in addrs[iface_name]:
                    if a.family == socket.AF_INET:
                        ipv4_list.append(a.address)
                    elif hasattr(socket, "AF_INET6") and a.family == socket.AF_INET6:
                        ipv6_list.append(a.address.split("%")[0])
                    elif a.family == psutil.AF_LINK:
                        mac_address = a.address

            io_stat = io_pernic.get(iface_name)

            adapters.append({
                "interface": iface_name,
                "is_up": iface_stats.isup,
                "speed_mbps": iface_stats.speed,
                "mtu": iface_stats.mtu,
                "ipv4": ipv4_list[0] if ipv4_list else "Not Assigned",
                "all_ipv4": ipv4_list,
                "ipv6": ipv6_list[0] if ipv6_list else "None",
                "mac": mac_address,
                "bytes_sent": io_stat.bytes_sent if io_stat else 0,
                "bytes_recv": io_stat.bytes_recv if io_stat else 0,
                "packets_sent": io_stat.packets_sent if io_stat else 0,
                "packets_recv": io_stat.packets_recv if io_stat else 0,
                "errin": io_stat.errin if io_stat else 0,
                "errout": io_stat.errout if io_stat else 0,
                "dropin": io_stat.dropin if io_stat else 0,
                "dropout": io_stat.dropout if io_stat else 0,
            })

        # Sort so active/UP adapters appear first
        adapters.sort(key=lambda x: (not x["is_up"], -x["bytes_recv"]))
        return adapters

    def get_connections(
        self,
        search: Optional[str] = None,
        state_filter: Optional[str] = None,
        protocol_filter: Optional[str] = None,
        limit: int = 150
    ) -> List[Dict[str, Any]]:
        """Returns filtered active socket connections with threat risk scoring."""
        try:
            conns = psutil.net_connections(kind="inet")
        except Exception as e:
            logger.warning(f"Error querying net_connections: {e}")
            return []

        results = []
        search_lower = search.lower().strip() if search else None

        for c in conns:
            pname = self._get_process_name(c.pid)
            proto = "TCP" if c.type == 1 else "UDP"
            l_ip = c.laddr.ip if c.laddr else ""
            l_port = c.laddr.port if c.laddr else 0
            r_ip = c.raddr.ip if c.raddr else ""
            r_port = c.raddr.port if c.raddr else 0
            status = c.status if c.status else "NONE"

            # Threat analysis
            threat_tags = []
            risk_level = "NORMAL"

            if r_port in SUSPICIOUS_PORTS or l_port in SUSPICIOUS_PORTS:
                threat_tags.append("SUSPICIOUS_PORT")
                risk_level = "ELEVATED"

            if pname.lower() in SCRIPT_ENGINES:
                threat_tags.append("SCRIPT_ENGINE")
                if status == "ESTABLISHED" or r_ip:
                    threat_tags.append("REVERSE_SHELL_RISK")
                    risk_level = "HIGH"

            # Apply filters
            if state_filter and state_filter.upper() != "ALL":
                if status.upper() != state_filter.upper():
                    continue

            if protocol_filter and protocol_filter.upper() != "ALL":
                if proto.upper() != protocol_filter.upper():
                    continue

            if search_lower:
                match = (
                    search_lower in pname.lower() or
                    search_lower in str(c.pid or "") or
                    search_lower in l_ip or
                    search_lower in str(l_port) or
                    search_lower in r_ip or
                    search_lower in str(r_port) or
                    search_lower in status.lower() or
                    any(search_lower in tag.lower() for tag in threat_tags)
                )
                if not match:
                    continue

            results.append({
                "pid": c.pid,
                "process_name": pname,
                "protocol": proto,
                "local_address": f"{l_ip}:{l_port}" if l_ip else "N/A",
                "local_ip": l_ip,
                "local_port": l_port,
                "remote_address": f"{r_ip}:{r_port}" if r_ip else "*:*",
                "remote_ip": r_ip or "*",
                "remote_port": r_port or "*",
                "status": status,
                "risk_level": risk_level,
                "threat_tags": threat_tags
            })

            if len(results) >= limit:
                break

        # Sort so high-risk connections and established sockets come first
        risk_weight = {"HIGH": 0, "ELEVATED": 1, "NORMAL": 2}
        results.sort(key=lambda x: (risk_weight.get(x["risk_level"], 2), x["status"] != "ESTABLISHED"))
        return results

    def get_processes_summary(self) -> List[Dict[str, Any]]:
        """Returns processes aggregated by network socket count and activity."""
        try:
            conns = psutil.net_connections(kind="inet")
        except Exception:
            return []

        proc_groups: Dict[int, Dict[str, Any]] = {}
        for c in conns:
            pid = c.pid or 0
            if pid not in proc_groups:
                proc_groups[pid] = {
                    "pid": pid,
                    "process_name": self._get_process_name(pid),
                    "socket_count": 0,
                    "established_count": 0,
                    "listening_count": 0,
                    "protocols": set(),
                    "ports": set(),
                    "has_threat": False
                }
            proc_groups[pid]["socket_count"] += 1
            if c.status == "ESTABLISHED":
                proc_groups[pid]["established_count"] += 1
            elif c.status == "LISTEN":
                proc_groups[pid]["listening_count"] += 1

            proto = "TCP" if c.type == 1 else "UDP"
            proc_groups[pid]["protocols"].add(proto)
            if c.laddr:
                proc_groups[pid]["ports"].add(c.laddr.port)
            if c.raddr and c.raddr.port in SUSPICIOUS_PORTS:
                proc_groups[pid]["has_threat"] = True

        out = []
        for pid, data in proc_groups.items():
            data["protocols"] = list(data["protocols"])
            data["ports"] = sorted(list(data["ports"]))[:5]
            out.append(data)

        out.sort(key=lambda x: (not x["has_threat"], -x["established_count"], -x["socket_count"]))
        return out

    def get_telemetry_snapshot(self) -> Dict[str, Any]:
        """Complete 1-second real-time snapshot for the Task Manager UI."""
        with self._lock:
            history_list = list(self.history)
            current_rate = history_list[-1] if history_list else {
                "bytes_sent_sec": 0, "bytes_recv_sec": 0, "total_bytes_sec": 0,
                "kb_sent_sec": 0.0, "kb_recv_sec": 0.0, "mb_sent_sec": 0.0, "mb_recv_sec": 0.0,
                "packets_sent_sec": 0, "packets_recv_sec": 0
            }

        try:
            total_io = psutil.net_io_counters()
            totals = {
                "total_bytes_sent": total_io.bytes_sent,
                "total_bytes_recv": total_io.bytes_recv,
                "total_mb_sent": round(total_io.bytes_sent / (1024 * 1024), 2),
                "total_mb_recv": round(total_io.bytes_recv / (1024 * 1024), 2),
                "total_gb_sent": round(total_io.bytes_sent / (1024 * 1024 * 1024), 2),
                "total_gb_recv": round(total_io.bytes_recv / (1024 * 1024 * 1024), 2),
                "total_packets_sent": total_io.packets_sent,
                "total_packets_recv": total_io.packets_recv,
            }
        except Exception:
            totals = {}

        adapters = self.get_adapters()
        primary_adapter = next((a for a in adapters if a["is_up"] and a["ipv4"] != "Not Assigned" and not a["interface"].startswith("Loopback")), None)

        return {
            "current": current_rate,
            "totals": totals,
            "primary_adapter": primary_adapter,
            "adapters": adapters,
            "history": history_list,
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

    def kill_process(self, pid: int) -> Dict[str, Any]:
        """Surgically terminates a process holding network sockets."""
        if not pid or pid <= 4:
            return {"success": False, "error": "Cannot terminate core system process."}
        try:
            proc = psutil.Process(pid)
            name = proc.name()
            proc.kill()
            return {"success": True, "pid": pid, "process_name": name, "message": f"Successfully killed process {name} (PID: {pid})"}
        except psutil.NoSuchProcess:
            return {"success": True, "pid": pid, "message": f"Process {pid} already exited."}
        except Exception as e:
            logger.error(f"Failed to kill process {pid}: {e}")
            return {"success": False, "pid": pid, "error": str(e)}


network_monitor = NetworkMonitor(history_len=60)
