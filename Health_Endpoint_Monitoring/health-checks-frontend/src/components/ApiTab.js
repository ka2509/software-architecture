import React, { useState, useEffect } from "react";
import { Bar } from "react-chartjs-2";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { FaNetworkWired, FaChartLine } from "react-icons/fa";

// Đăng ký các thành phần cần thiết cho biểu đồ
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const ApiTab = ({ serviceName }) => {
  const [trafficData, setTrafficData] = useState([]);
  const [highestRequest, setHighestRequest] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);
  const [activeConnections, setActiveConnections] = useState(0);
  const [firstLoad, setFirstLoad] = useState(true); // Chỉ kiểm soát loading lần đầu tiên

  useEffect(() => {
    const fetchTrafficData = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5002/container-traffic/${serviceName}`
        );
        const data = response.data.traffic_data;

        const trafficArray = Object.keys(data).map((key) => ({
          timestamp: new Date(key * 1000).toLocaleTimeString(),
          value: data[key],
        }));

        setTrafficData((prevData) => {
          const updatedData = [...prevData, ...trafficArray].slice(-10);
          setHighestRequest(Math.max(...updatedData.map((d) => d.value)));
          setTotalRequests(updatedData.reduce((sum, d) => sum + d.value, 0));
          return updatedData;
        });

        // Tắt loading sau lần tải đầu tiên
        if (firstLoad) setFirstLoad(false);
      } catch (err) {
        console.error("Error fetching traffic data:", err);
      }
    };

    const fetchActiveConnections = async () => {
      try {
        const response = await axios.get("http://localhost:5002/connections");
        const data = response.data;
        if (serviceName === "GoldPriceContainer") {
          setActiveConnections(data.active_connections_gold);
        } else if (serviceName === "ExchangeRateContainer") {
          setActiveConnections(data.active_connections_exchange);
        }
      } catch (err) {
        console.error("Error fetching active connections:", err);
      }
    };

    fetchTrafficData();
    fetchActiveConnections();

    const trafficInterval = setInterval(fetchTrafficData, 10000);
    const connectionInterval = setInterval(fetchActiveConnections, 3000);

    return () => {
      clearInterval(trafficInterval);
      clearInterval(connectionInterval);
    };
  }, [serviceName, firstLoad]);

  const labels = trafficData.map((d) => d.timestamp);

  const createChartData = (labels, datasets) => ({
    labels,
    datasets,
  });

  const barChartOptions = {
    responsive: true,
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
        title: { display: true, text: "Requests", color: "#AAA" },
        beginAtZero: true,
        min: 0,
        max: 30,
      },
    },
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h3 className="text-2xl font-bold mb-4 text-white text-center">
        API Traffic Data
      </h3>
      {firstLoad ? (
        <div className="flex justify-center items-center text-gray-400">
          <div className="animate-spin border-4 border-t-4 border-gray-600 rounded-full w-12 h-12"></div>
          <span className="ml-4">Loading...</span>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row md:justify-between space-y-6 md:space-y-0">
          {/* Phần thông tin */}
          <div className="flex-1 md:max-w-sm">
            <div className="text-indigo-100 mb-6 space-y-4">
              {/* Highest Requests */}
              <div className="flex items-center gap-4">
                <FaChartLine className="text-teal-400" />
                <span className="font-semibold">Highest Requests:</span>
                <span className="text-white">{highestRequest}</span>
              </div>
              {/* Total Requests */}
              <div className="flex items-center gap-4">
                <FaChartLine className="text-teal-400" />
                <span className="font-semibold">Total Requests:</span>
                <span className="text-white">{totalRequests}</span>
              </div>
              {/* Active Connections */}
              <div className="flex items-center gap-4">
                <FaNetworkWired className="text-teal-400" />
                <span className="font-semibold">Active Connections:</span>
                <span className="text-white">{activeConnections}</span>
              </div>
            </div>
          </div>
          {/* Phần biểu đồ */}
          <div className="flex-1 flex justify-end">
            <div className="w-full md:w-4/5 h-64">
              <Bar
                data={createChartData(labels, [
                  {
                    label: serviceName === "ExchangeRateContainer" 
                    ? "Exchange-Rate Traffic Requests" 
                    : "Gold-Price Traffic Requests",
                    data: trafficData.map((d) => d.value),
                    backgroundColor: "rgba(54, 162, 235, 0.8)",
                    borderColor: "#36A2EB",
                    borderWidth: 1,
                  },
                ])}
                options={barChartOptions}
              />
            </div>
          </div>
        </div>



      )}
    </div>
  );
};

export default ApiTab;
