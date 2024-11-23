import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import ContainerTab from "./ContainerTab";
import ApiTab from "./ApiTab";

const Details = () => {
  const { serviceName } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("container");

  const tabs = serviceName === "redis"
    ? [{ id: "container", label: "Container" }]
    : [
        { id: "container", label: "Container" },
        { id: "api", label: "API" },
      ];

  const renderContent = () => {
    if (serviceName === "redis") {
      return <ContainerTab serviceName={serviceName} />;
    }

    switch (activeTab) {
      case "container":
        return <ContainerTab serviceName={serviceName} />;
      case "api":
        return <ApiTab serviceName={serviceName} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white px-8 py-6">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-white hover:text-indigo-400 mr-4"
        >
          <FaArrowLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold text-indigo-500 text-center flex-1">
          {serviceName}
        </h1>
      </div>

      <div className="flex justify-center border-b border-gray-600 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium transition ${
              activeTab === tab.id
                ? "border-b-4 border-indigo-600 text-indigo-600"
                : "text-gray-500 hover:text-indigo-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {renderContent()}
    </div>
  );
};

export default Details;
