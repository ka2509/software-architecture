import React, { useState, useEffect } from "react";
import axios from "axios";

const HealthCheck = () => {
  const [services, setServices] = useState([]);
  const [pollingInterval, setPollingInterval] = useState(5000); // Default polling interval 5 seconds
  useEffect(() => {
    // Function to fetch data from API
    const fetchData = () => {
      axios
        .get("http://localhost:5002/health-checks")
        .then((response) => {
          console.log("API response:", response.data);
          setServices(response.data.services);
        })
        .catch((error) => {
          console.error("API error:", error);
        });
    };

    // Fetch data immediately when the component mounts
    fetchData();

    // Set interval for polling every 5 seconds (5000ms)
    const intervalId = setInterval(fetchData, pollingInterval);

    // Cleanup: clear the interval when the component is unmounted
    return () => clearInterval(intervalId);
  }, [pollingInterval]); // Re-run when pollingInterval changes

  // Hàm xử lý sự kiện click nút "View Details"
  const handleViewDetails = (serviceName) => {
    console.log(`View details for: ${serviceName}`);
  };
  // Hàm xử lý sự kiện thay đổi polling time
  const handlePollingChange = (event) => {
    const newInterval = parseInt(event.target.value);
    setPollingInterval(newInterval); // Cập nhật pollingInterval mới
  };
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-center text-indigo-600">Service Health Status</h1>
        <div className="flex items-center">
          <label htmlFor="polling-time" className="mr-2">Polling Time:</label>
          <select
            id="polling-time"
            value={pollingInterval}
            onChange={handlePollingChange}
            className="p-2 border rounded"
          >
            <option value={5000}>5 seconds</option>
            <option value={10000}>10 seconds</option>
            <option value={15000}>15 seconds</option>
            <option value={30000}>30 seconds</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service, index) => (
          <div
            key={index}
            className={`p-6 border-2 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out ${
              service.status === "Healthy" ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"
            } hover:scale-105 hover:shadow-2xl`}
          >
            <h2 className="text-xl font-semibold text-gray-800">{service.name}</h2>
            <p className="text-md mt-2">
              Status: <span className={`font-bold ${service.status === "Healthy" ? "text-green-600" : "text-red-600"}`}>{service.status}</span>
            </p>
            {service.error && <p className="text-red-600 mt-2">Error: {service.error}</p>}
            <p className="mt-2 text-gray-700">Ports: {service.ports}</p>
            {service.checks?.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold">Health Checks:</h3>
                <ul className="list-inside list-disc">
                  {service.checks.map((check, i) => (
                    <li key={i} className="text-sm text-gray-600">
                      {check.name}: {check.status} ({check.responseTime})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(
              <button
                onClick={() => handleViewDetails(service.name)}
                className="mt-4 px-5 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-200"
              >
                View Details
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HealthCheck;
