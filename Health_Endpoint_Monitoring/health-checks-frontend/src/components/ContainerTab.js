import React, { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import axios from "axios";

const ContainerTab = ({ serviceName }) => {
  const [statsData, setStatsData] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchContainerStats = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5002/container-stat/${serviceName}`
        );
        const stats = response.data;

        setStatsData((prevStats) => {
          const updatedStats = [
            ...prevStats,
            {
              timestamp: new Date().toLocaleTimeString(),
              cpu: stats.cpu_usage_percent,
              memory: stats.memory_usage_mb,
              memoryLimit: stats.memory_limit_mb,
              networkRx: stats.network_rx_mb,
              networkTx: stats.network_tx_mb,
            },
          ];
          return updatedStats.slice(-10);
        });
      } catch (err) {
        console.error("Error fetching container stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchContainerStats();
    const intervalId = setInterval(fetchContainerStats, 2000);
    return () => clearInterval(intervalId);
  }, [serviceName]);

  const labels = statsData.map((d) => d.timestamp);

  const createChartData = (labels, datasets) => ({
    labels,
    datasets,
  });

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: "top", labels: { color: "#FFFFFF" } },
    },
    scales: {
      x: {
        grid: { color: "#444", borderColor: "#888" },
        ticks: { color: "#AAA" },
        title: { display: true, text: "Time", color: "#AAA" },
      },
      y: {
        grid: { color: "#444", borderColor: "#888" },
        ticks: { color: "#AAA" },
        title: { display: true, text: "Usage", color: "#AAA" },
      },
    },
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-500 border-opacity-75"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* CPU Usage */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg h-[300px]">
        <h3 className="text-lg font-semibold mb-4">CPU Usage (%)</h3>
        <Line
          data={createChartData(labels, [
            {
              label: "CPU",
              data: statsData.map((d) => d.cpu),
              borderColor: "#4F86F7",
              backgroundColor: "rgba(79, 134, 247, 0.2)",
            },
          ])}
          options={lineChartOptions}
        />
      </div>

      {/* Memory Usage */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg h-[300px]">
        <h3 className="text-lg font-semibold mb-4">Memory Usage (MB)</h3>
        <Line
          data={createChartData(labels, [
            {
              label: "Memory Usage",
              data: statsData.map((d) => d.memory),
              borderColor: "#36A2EB",
              backgroundColor: "rgba(54, 162, 235, 0.2)",
            },
            {
              label: "Memory Limit",
              data: statsData.map((d) => d.memoryLimit),
              borderColor: "#FFCD56",
              backgroundColor: "rgba(255, 205, 86, 0.2)",
              borderDash: [5, 5],
            },
          ])}
          options={lineChartOptions}
        />
      </div>

      {/* Network I/O */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg h-[300px]">
        <h3 className="text-lg font-semibold mb-4">Network I/O (MB)</h3>
        <Line
          data={createChartData(labels, [
            {
              label: "Data Received",
              data: statsData.map((d) => d.networkRx),
              borderColor: "#4BC0C0",
              backgroundColor: "rgba(75, 192, 192, 0.2)",
            },
            {
              label: "Data Sent",
              data: statsData.map((d) => d.networkTx),
              borderColor: "#FFA500",
              backgroundColor: "rgba(255, 165, 0, 0.2)",
            },
          ])}
          options={lineChartOptions}
        />
      </div>
    </div>
  );
};

export default ContainerTab;
