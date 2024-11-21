import React from 'react';
import { Link } from 'react-router-dom';

const Sidebar = () => {
  return (
    <div className="h-screen w-64 bg-gray-800 text-white flex flex-col p-4">
      {/* User Profile Section */}
      <div className="user-profile mb-8 text-center">
        <img 
          src="https://via.placeholder.com/80"  // Thay thế bằng URL ảnh profile thực tế
          alt="Profile"
          className="rounded-full w-20 h-20 mx-auto border-4 border-white mb-4"
        />
        <h2 className="text-xl font-semibold">Nhóm 1</h2>
        <p className="text-gray-400">Admin</p>
      </div>

      {/* Navigation Menu */}
      <nav>
        <ul>
          <li className="mb-4">
            <Link 
              to="/" 
              className="flex items-center p-2 rounded hover:bg-gray-700 hover:text-white transition duration-300 ease-in-out"
            >
              {/* Biểu tượng Health Checks */}
              <span className="material-icons mr-3">check_circle</span>
              Health Checks
            </Link>
          </li>
          
          {/* Mục Resource với biểu tượng */}
          <li className="mb-4">
            <Link 
              to="/resource" 
              className="flex items-center p-2 rounded hover:bg-gray-700 hover:text-white transition duration-300 ease-in-out"
            >
              {/* Biểu tượng Resource */}
              <span className="material-icons mr-3">storage</span>
              Resource
            </Link>
          </li>

          {/* Mục Settings với biểu tượng */}
          <li className="mb-4">
            <Link 
              to="/settings" 
              className="flex items-center p-2 rounded hover:bg-gray-700 hover:text-white transition duration-300 ease-in-out"
            >
              {/* Biểu tượng Settings */}
              <span className="material-icons mr-3">settings</span>
              Settings
            </Link>
          </li>
          

          
          {/* Các mục menu khác có thể thêm vào đây */}
        </ul>
      </nav>

      {/* Footer */}
      <div className="mt-auto text-center">
        <p className="text-gray-500 text-xs">Trường Đại Học Công Nghệ</p>
      </div>
    </div>
  );
};

export default Sidebar;
