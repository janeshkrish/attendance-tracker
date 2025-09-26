import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { RefreshCw } from 'lucide-react';
import apiService from '../../services/api';

export function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await apiService.getAuditLogs();
      setLogs(response.logs);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch audit logs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  if (isLoading) return <div className="text-center p-8">Loading audit logs...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <Button variant="outline" onClick={fetchAuditLogs}><RefreshCw className="mr-2" /> Refresh</Button>
      </div>
      {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
      <Card variant="elevated" padding="lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resource</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y">
              {logs.map(log => (
                <tr key={log._id}>
                  <td className="px-6 py-4">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-6 py-4">{log.userId?.name}</td>
                  <td className="px-6 py-4">{log.action}</td>
                  <td className="px-6 py-4">{log.resource}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
