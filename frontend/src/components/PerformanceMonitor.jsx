import React from 'react';

const PerformanceMonitor = ({ metrics }) => {
  if (process.env.NODE_ENV !== 'development' || !metrics) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs font-mono">
      <div>Memory: {metrics.memory?.used || 'N/A'}MB</div>
      <div>Resources: {metrics.resources?.total || 0}</div>
      <div>Load: {metrics.navigation?.loadComplete || 'N/A'}ms</div>
    </div>
  );
};

export default PerformanceMonitor;
