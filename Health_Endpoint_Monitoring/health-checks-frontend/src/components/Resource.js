import { io } from "socket.io-client";
import React, { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Resource = () => {
  const [cpuData, setCpuData] = useState([]);
  const [memoryData, setMemoryData] = useState([]);
  const [diskData, setDiskData] = useState([]);
  const [networkData, setNetworkData] = useState([]);
  const [loading, setLoading] = useState(true); // Trạng thái loading ban đầu

  const addDataToLimitedArray = (dataArray, newData) => {
    if (
      dataArray.length === 0 ||
      Date.now() - new Date(dataArray[dataArray.length - 1].timestamp).getTime() >= 1000
    ) {
      if (dataArray.length >= 10) {
        dataArray.shift();
      }
      dataArray.push(newData);
    }
    return [...dataArray];
  };

  useEffect(() => {
    const socket = io.connect("http://localhost:5002");

    socket.on("connect_error", (error) => console.error("Connection error:", error));

    socket.on("system_resources", (data) => {
      const timestamp = new Date().toISOString();

      setCpuData((prevData) =>
        addDataToLimitedArray(prevData, {
          timestamp,
          value: data.cpu_usage,
        })
      );

      setMemoryData((prevData) =>
        addDataToLimitedArray(prevData, {
          timestamp,
          value: data.memory_usage,
        })
      );

      setDiskData((prevData) =>
        addDataToLimitedArray(prevData, {
          timestamp,
          read: data.disk_read / (1024 * 1024),
          write: data.disk_write / (1024 * 1024),
        })
      );

      setNetworkData((prevData) =>
        addDataToLimitedArray(prevData, {
          timestamp,
          received: data.data_recv / (1024 * 1024),
          sent: data.data_sent / (1024 * 1024),
        })
      );

      // Tắt trạng thái loading nếu dữ liệu đã được cập nhật
      setLoading(false);
    });

    return () => {
      if (socket.readyState === 1) {
        socket.close();
      }
    };
  }, []);

  const createChartData = (labels, datasets) => ({
    labels,
    datasets,
  });

  const lineChartOptions = {
    responsive: true,
    plugins: {
      legend: { display: true, position: "bottom" },
    },
    scales: {
      x: { title: { display: true, text: "Time" } },
      y: { beginAtZero: true, title: { display: true, text: "%" }, min: 0, max: 100 },
    },
  };

  const diskChartOptions = {
    ...lineChartOptions,
    scales: {
      ...lineChartOptions.scales,
      y: { beginAtZero: true, title: { display: true, text: "Data (MB)" } },
    },
  };

  const labels = cpuData.map((d) => new Date(d.timestamp).toLocaleTimeString());

  if (loading) {
    // Hiển thị vòng tròn loading khi chưa có dữ liệu
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-500 border-opacity-75"></div>
          <p className="text-gray-300 mt-4">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-6 p-6 bg-gray-900 text-white">
      {/* CPU Usage */}
      <div className="bg-gray-800 p-4 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-2">CPU Usage</h3>
        <Line
          data={createChartData(labels, [
            {
              label: "CPU",
              data: cpuData.map((d) => d.value),
              borderColor: "#FF6384",
              backgroundColor: "rgba(255, 99, 132, 0.2)",
            },
          ])}
          options={lineChartOptions}
        />
      </div>

      {/* Memory Usage */}
      <div className="bg-gray-800 p-4 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-2">Memory Usage</h3>
        <Line
          data={createChartData(labels, [
            {
              label: "Memory",
              data: memoryData.map((d) => d.value),
              borderColor: "#36A2EB",
              backgroundColor: "rgba(54, 162, 235, 0.2)",
            },
          ])}
          options={lineChartOptions}
        />
      </div>

      {/* Disk Read/Write */}
      <div className="bg-gray-800 p-4 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-2">Disk Read/Write</h3>
        <Line
          data={createChartData(labels, [
            {
              label: "Data Read",
              data: diskData.map((d) => d.read),
              borderColor: "#4BC0C0",
              backgroundColor: "rgba(75, 192, 192, 0.2)",
            },
            {
              label: "Data Write",
              data: diskData.map((d) => d.write),
              borderColor: "#FFCD56",
              backgroundColor: "rgba(255, 205, 86, 0.2)",
            },
          ])}
          options={diskChartOptions}
        />
      </div>

      {/* Network I/O */}
      <div className="bg-gray-800 p-4 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-2">Network I/O</h3>
        <Line
          data={createChartData(labels, [
            {
              label: "Data Received",
              data: networkData.map((d) => d.received),
              borderColor: "#9966FF",
              backgroundColor: "rgba(153, 102, 255, 0.2)",
            },
            {
              label: "Data Sent",
              data: networkData.map((d) => d.sent),
              borderColor: "#FF9F40",
              backgroundColor: "rgba(255, 159, 64, 0.2)",
            },
          ])}
          options={diskChartOptions}
        />
      </div>
    </div>
  );
};

export default Resource;
