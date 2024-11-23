import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaArrowRight } from "react-icons/fa"; // Import icon từ React Icons

const HealthCheck = () => {
  const [services, setServices] = useState([]);
  const [pollingInterval, setPollingInterval] = useState(5000); // Default polling interval 5 seconds
  const [loading, setLoading] = useState(true); // Loading state chỉ cho lần đầu
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get("http://localhost:5002/health-checks");
        console.log("API response:", response.data);
        setServices(response.data.services);
      } catch (error) {
        console.error("API error:", error);
      } finally {
        // Chỉ tắt loading sau lần đầu fetch
        setLoading(false);
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, pollingInterval);
    return () => clearInterval(intervalId);
  }, [pollingInterval]);

  const handleViewDetails = (serviceName) => {
    navigate(`/details/${serviceName}`); // Navigate to the Details page with the service name
  };

  const handlePollingChange = (event) => {
    const newInterval = parseInt(event.target.value);
    setPollingInterval(newInterval);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          {/* Spinner */}
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-500 border-opacity-75"></div>
          <p className="text-gray-300 mt-4">Loading...</p>
        </div>
      ) : (
        <div className="container mx-auto px-8 py-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-indigo-500">Service Health Status</h1>
            <div className="flex items-center">
              <label htmlFor="polling-time" className="mr-2 text-gray-400">
                Polling Time:
              </label>
              <select
                id="polling-time"
                value={pollingInterval}
                onChange={handlePollingChange}
                className="p-2 border rounded bg-gray-800 text-gray-200 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value={5000}>5 seconds</option>
                <option value={10000}>10 seconds</option>
                <option value={15000}>15 seconds</option>
                <option value={30000}>30 seconds</option>
              </select>
            </div>
          </div>

          {/* Service Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <div
                key={index}
                className={`relative p-6 border-2 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out ${
                  service.status === "Healthy"
                    ? "border-green-500 bg-green-900"
                    : "border-red-500 bg-red-900"
                } hover:scale-105 hover:shadow-2xl`}
              >
                <h2 className="text-xl font-semibold text-gray-200">{service.name}</h2>
                <p className="text-md mt-2">
                  Status:{" "}
                  <span
                    className={`font-bold ${
                      service.status === "Healthy" ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {service.status}
                  </span>
                </p>
                {service.error && (
                  <p className="text-red-400 mt-2">Error: {service.error}</p>
                )}
                <p className="mt-2 text-gray-400">Ports: {service.ports}</p>
                {service.checks?.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-semibold text-gray-300">Health Checks:</h3>
                    <ul className="list-inside list-disc">
                      {service.checks.map((check, i) => (
                        <li key={i} className="text-sm text-gray-400">
                          {check.name}: {check.status} ({check.responseTime})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Nút Icon */}
                <button
                  onClick={() => handleViewDetails(service.name)}
                  className="absolute bottom-4 right-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full p-3 shadow-lg transition duration-200"
                >
                  <FaArrowRight className="text-lg" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthCheck;
