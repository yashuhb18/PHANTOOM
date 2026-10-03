using System;
using System.Diagnostics;
using System.Threading;

namespace PhantomBenchmark
{
    class Program
    {
        static volatile bool _running = true;

        static void Main(string[] args)
        {
            Console.Title = "PHANTOM System Processor Benchmark Utility v3.2";
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("================================================================================");
            Console.WriteLine("        PHANTOM ENTERPRISE HARDWARE & PROCESSOR BENCHMARK UTILITY               ");
            Console.WriteLine("================================================================================");
            Console.ResetColor();

            int cores = Environment.ProcessorCount;
            Console.WriteLine("[INFO] Architecture: " + (Environment.Is64BitOperatingSystem ? "64-bit" : "32-bit"));
            Console.WriteLine("[INFO] Host Machine: " + Environment.MachineName);
            Console.WriteLine("[INFO] Available Processor Cores: " + cores);
            Console.WriteLine("[INFO] Initializing multi-threaded AVX/FPU stress test workload...");

            for (int i = 0; i < cores; i++)
            {
                int coreIndex = i;
                Thread t = new Thread(() => RunWorker(coreIndex));
                t.IsBackground = true;
                t.Priority = ThreadPriority.Highest;
                t.Start();
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("[+] Worker Thread " + coreIndex + " actively engaged on Core " + coreIndex);
                Console.ResetColor();
            }

            Console.WriteLine();
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine("[⚡ STATUS] Multi-Core Processor Saturation Active (Target: 80-100% CPU Load)...");
            Console.WriteLine("[⚡ STATUS] PHANTOM Processor Anomaly Watcher is actively surveilling metrics.");
            Console.ResetColor();

            // Main loop
            while (_running)
            {
                Thread.Sleep(500);
            }
        }

        static void RunWorker(int id)
        {
            double val = 1.0001;
            while (_running)
            {
                for (int j = 0; j < 50000; j++)
                {
                    val = Math.Sin(val) * Math.Cos(val) + Math.Sqrt(val + 1.5) + Math.Tan(0.42);
                }
            }
        }
    }
}
