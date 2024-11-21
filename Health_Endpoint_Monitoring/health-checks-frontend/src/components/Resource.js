import React, { useState, useEffect } from "react";
import io from "socket.io-client";

const Resource = () => {
  const [cpuUsage, setCpuUsage] = useState(0);
  const [memUsage, setMemUsage] = useState(0);
  const [diskUsage, setDiskUsage] = useState(0);
  const [sent, setSent] = useState(0);
  const [recv, setRecv] = useState(0);

  useEffect(() => {
    const socket = io("localhost:5002/", {
      transports: ["polling"],
      cors: {
        origin: "http://localhost:3000/",
      },
    });
    socket.on("connect", () => console.log("Connected to WebSocket server"));
    socket.on("connect_error", (error) =>
      console.error("Connection error:", error)
    );
    socket.on("system_resources", (data) => {
      console.log("Received data:", data); // Log chi tiết dữ liệu nhận được
      setCpuUsage(data.cpu_usage);
      setMemUsage(data.memory_usage);
      setDiskUsage(data.disk_usage);
      setSent(data.network.bytes_sent);
      setRecv(data.network.bytes_recv);
    });
    return () => {
            if (socket.readyState === 1) { // <-- This is important
                socket.close();
            }
        }
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-semibold mb-4">Server Resource Usage</h1>
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl mb-4">Real-Time Data</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">CPU Usage:</h3>
            <p className="text-xl">{cpuUsage}%</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Memory Usage:</h3>
            <p className="text-xl">{memUsage}%</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Disk Usage:</h3>
            <p className="text-xl">{diskUsage}%</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Network Sent:</h3>
            <p className="text-xl">{sent} bytes</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Network Received:</h3>
            <p className="text-xl">{recv} bytes</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Resource;
