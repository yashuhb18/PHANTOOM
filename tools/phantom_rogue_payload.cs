using System;
using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Threading;

namespace PhantomThreatSimulation
{
    class Program
    {
        private static volatile bool _running = true;

        static void Main(string[] args)
        {
            int pid = Process.GetCurrentProcess().Id;
            Console.Title = string.Format("[PHANTOM ROGUE TEST BINARY] PID: {0}", pid);

            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine("╔═══════════════════════════════════════════════════════════════════════╗");
            Console.WriteLine("║   PHANTOM ROGUE PAYLOAD v1.0 — HIGH-CPU & UDP EXFIL DEMO BINARY       ║");
            Console.WriteLine("║   Target PID: {0,-10} | Machine: {1,-18} | Mode: THREAT       ║", pid, Environment.MachineName);
            Console.WriteLine("╚═══════════════════════════════════════════════════════════════════════╝");
            Console.ResetColor();

            Console.WriteLine("[+] Process PID: {0}", pid);
            Console.WriteLine("[+] Unsigned executable running from: {0}", Process.GetCurrentProcess().MainModule.FileName);
            Console.WriteLine("[+] Spawning multi-threaded CPU stress threads to spike processor load...");

            // 1. Multi-threaded CPU intensive calculation to spike CPU to 70-95%
            int coreCount = Math.Max(2, Environment.ProcessorCount);
            for (int i = 0; i < coreCount; i++)
            {
                Thread t = new Thread(CpuBurnerLoop);
                t.IsBackground = true;
                t.Priority = ThreadPriority.AboveNormal;
                t.Start(i);
            }

            // 2. Outbound UDP Exfil & Beaconing thread
            Thread netThread = new Thread(NetworkBeaconLoop);
            netThread.IsBackground = true;
            netThread.Start();

            Console.WriteLine("[!] Multi-core stress active. Awaiting PHANTOM autonomous detection and kill...");

            // Keep main thread alive
            while (_running)
            {
                Thread.Sleep(500);
            }
        }

        private static void CpuBurnerLoop(object threadId)
        {
            using (SHA256 sha = SHA256.Create())
            {
                byte[] buffer = new byte[1024];
                new Random().NextBytes(buffer);

                while (_running)
                {
                    // Compute intensive SHA256 hash in a tight loop to generate legitimate CPU load
                    buffer = sha.ComputeHash(buffer);
                }
            }
        }

        private static void NetworkBeaconLoop()
        {
            try
            {
                using (UdpClient udp = new UdpClient())
                {
                    byte[] payload = Encoding.UTF8.GetBytes("PHANTOM_ROGUE_EXFIL_BEACON_METRIC_DATA");
                    IPEndPoint target = new IPEndPoint(IPAddress.Loopback, 5353);

                    while (_running)
                    {
                        try
                        {
                            udp.Send(payload, payload.Length, target);
                        }
                        catch { }
                        Thread.Sleep(300);
                    }
                }
            }
            catch { }
        }
    }
}
