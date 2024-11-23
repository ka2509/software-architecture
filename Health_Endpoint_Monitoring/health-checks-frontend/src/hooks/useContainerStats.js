import { useState, useEffect } from "react";
import axios from "axios";

const useContainerStats = (serviceName) => {
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
          return updatedStats.slice(-10); // Giữ lại tối đa 10 phần tử
        });
      } catch (err) {
        console.error("Error fetching container stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchContainerStats(); // Gọi lần đầu tiên
    const intervalId = setInterval(fetchContainerStats, 2000); // Gọi định kỳ
    return () => clearInterval(intervalId); // Cleanup khi unmount
  }, [serviceName]);

  return { statsData, loading };
};

export default useContainerStats;
